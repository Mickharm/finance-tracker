# 記帳助手 — 專案架構文件

> 給後續接手的工程師或 AI：這份文件描述專案的結構、資料模型、核心機制與開發慣例。
> 動手改code之前請先讀完「核心機制」與「注意事項」，裡面記錄了幾個違反直覺、但刻意如此設計的地方。

## 1. 專案概觀

- **用途**：Mick 與佳欣兩人共用的家庭記帳 PWA（支出預算、收入、儲蓄、持股、房產、資產淨值）。
- **形態**：單頁 React App，手機以「加入主畫面」方式安裝（iOS standalone PWA 為主要環境）。
- **後端**：Firebase（匿名登入 + Cloud Firestore），無自建伺服器。
- **部署**：GitHub Pages，網址前綴 `/finance-tracker/`。push 到 `main` 即由 GitHub Actions 自動建置部署（`.github/workflows/deploy.yml`）。
  另有**預覽版** `/finance-tracker/preview/`，由 `preview` 分支建置（見 §5.8）。

## 2. 技術棧

| 項目 | 選擇 | 備註 |
|---|---|---|
| 框架 | React 19 | 無 router，用 `currentView` state 切頁 |
| 建置 | Vite（`rolldown-vite@7.2.5`） | `package.json` 用 overrides 固定 |
| 樣式 | Tailwind CSS v4 | 3.0 液態玻璃設計系統，見 §5.5 |
| 圖示 | lucide-react | |
| 資料 | Firebase Auth（匿名）+ Firestore | persistent local cache 開啟 |
| 股價 | Finnhub API | 免費 key 寫在 `lib/utils.js`，localStorage 快取 5 分鐘 |

## 3. 目錄結構

```
finance-tracker/
├── index.html              # HTML 外殼：pre-loader、白畫面看門狗、preconnect
├── vite.config.js          # base 路徑 + sw-precache 外掛（自動產生 dist/sw.js，見 §5.4）
├── public/
│   ├── manifest.webmanifest  # PWA manifest（含 shortcuts 主畫面捷徑）
│   └── icon.png
├── .github/workflows/deploy.yml  # push main → build → GitHub Pages
└── src/
    ├── main.jsx            # React 掛載 + Service Worker 註冊/更新流程
    ├── App.jsx             # AppContent：全域 state、Firestore 訂閱、所有寫入 handler、
    │                       #            頁面路由（currentView）、所有「新增/編輯」Modal 的 JSX
    ├── index.css           # Tailwind 進入點 + 3.0 設計系統（色票、極光、玻璃材質、液體、動畫）
    ├── lib/
    │   ├── firebase.js     # Firebase 初始化；匯出 auth, db, appId, LEDGER_ID
    │   ├── constants.js    # GLASS_CARD/GLASS_INPUT 玻璃樣式、COLOR_VARIANTS 主題色、
    │   │                   # DEFAULT_SETTINGS、INCOME_CATEGORIES、選單定義
    │   ├── utils.js        # 日期工具、evalArithmetic 計算機、haptic、股價快取、千分位
    │   └── format.js       # 2.0 數字格式（fmt、fmtSigned、pct、short 萬/億）與兩人設定 PEOPLE
    ├── components/
    │   ├── glass.jsx       # 基礎元件：Aurora（紙白背景）、Num/Money、Vessel、Tube、Segmented、SheetShell、useGhostExit
    │   ├── Toast.jsx       # ToastProvider / useToast（全域訊息提示）
    │   ├── ui.jsx          # ConfirmationModal、LoadingScreen、ViewLoader（舊版表單元件已全部移除）
    │   ├── QuickAddSheet.jsx # 記帳抽屜（新增與編輯支出共用）
    │   └── v2.jsx          # 各頁共用：Hero、Section、Row、Divided、Seg、Chips、MoneyInput、TextInput、Sheet、LineChart…
    └── views/              # 每個頁面一個檔案（皆為純呈現＋自身互動，資料多由 App.jsx 傳入）
        ├── HomeV2.jsx              # 2.0 總覽（本月還能花、今天兩人與每餐、這週、今年三桶）
        ├── LedgerView.jsx          # 2.0 明細（月曆顯示每日金額／卡片＋搜尋、當日明細）
        ├── BucketAnalysis.jsx      # 分析（支出）：每月三色長條、兩人比例、分類排行；最上面可搜尋（打字或點分類，整頁只算符合的紀錄）
        ├── BudgetView.jsx          # 2.0 預算設定（三桶、分類回測、這支手機的記帳人）
        ├── IncomeView.jsx          # 2.0 收入（今年收入、本月薪水進帳、每月長條、組成、月薪、明細）
        ├── PartnerView.jsx         # 2.0 佳欣儲蓄（餘額、存入／提領、餘額走勢、依年紀錄）
        ├── PetView.jsx             # 阿奇的紀錄（基本資料、體重走勢、看診／洗澡／驅蟲／疫苗、照顧花費）
        ├── InvestmentTabView.jsx   # 2.0 持股（自行訂閱 holdings_config、抓 Finnhub 報價；買入抽屜）
        ├── StockGoalView.jsx       # 2.0 存股（今年進度、每年實際 vs 目標、換匯）
        ├── MortgageView.jsx        # 2.0 房產（本月房貸、月付階梯、每年還款、頭期款與雜支）
        └── PrincipalView.jsx       # 2.0 淨值（自行訂閱 principal_config / principal_history；結算）
```

**依賴方向**（不可反向、無循環）：`views / components → lib`；`App.jsx → 全部`。
大多數 view 是「資料從 App.jsx props 進來」；只有 `InvestmentTabView` 與 `PrincipalView` 例外，
它們自己 `onSnapshot` 訂閱自己的文件（歷史設計，props 仍傳入 `db, appId`）。

## 4. 資料模型（Firestore）

所有資料都在共用帳本路徑下（兩人共用同一份資料，見 §5.6）：

```
artifacts/finance-tracker-production/ledgers/Mick/
```

### 4.1 Collections

| Collection | 用途 | 主要欄位 |
|---|---|---|
| `transactions` | 支出 | `amount:number, type:'monthly'\|'annual', group, category, note, date:'YYYY-MM-DD', payer:'myself'\|'partner', createdAt` |
| `incomes` | 收入 | `amount, category(見 INCOME_CATEGORIES), owner:'myself'\|'partner', date, note, createdAt` |
| `salary_history` | 調薪紀錄 | `amount, owner, date, note` |
| `partner_savings` | 佳欣儲蓄 | `amount, type:'saving'\|'expense', date, note` |
| `mortgage_expenses` | 房產雜支 | `name, amount, date, note, brand, type:'down_payment'\|'misc_appliances'` |
| `mortgage_analysis` | 划算試算 | `name, amount` |
| `mortgage_funding` | 頭期款來源 | `source, amount, symbol, shares, rate, date, note` |
| `stock_goals` | 存股計畫（一年一筆） | `year, roi, firstrade, ib, withdrawal` |
| `usd_exchanges` | 美金換匯 | `date, usdAmount, rate, account:'FT'\|'IB', type:'buy'\|'sell'` |
| `pet_records` | 阿奇的照顧紀錄 | `kind:'vet'\|'bath'\|'deworm'\|'weight'\|'vaccine'\|'other', date, title, place, amount, costNote, note, weight, withCarrier, meds（只拿藥）, monthOnly（只記到月份）`；另有一筆 id＝`profile`：`kind:'profile', date:生日, name, breed, chip, homeDate` |
| `principal_history` | 淨值結算快照 | `date(ISO), netPrincipal, details(config 全文快照)` |

### 4.2 settings/（單一文件）

| 文件 | 用途 |
|---|---|
| `config_{year}`（如 `config_2026`） | **每年一份**的預算設定：`monthlyGroups[]`, `annualGroups[]`, `recurringItems[]`, `lastRecurringCheck:'YYYY-MM'` |
| `config_v2` | 全域鏡像。新年度第一次開啟時，`config_{newYear}` 不存在會**自動從 config_v2 複製**建立；每次更新 recurringItems / lastRecurringCheck 都會同步雙寫 |
| `holdings_config` | 持股組合：`groups[{id,name,stocks[{symbol,purchases[{id,date,shares,price}]}]}]` |
| `principal_config` | 資產淨值編輯目前值：`assets{bank[],invest[]}, liabilities{encumbrance[]}` |

> 群組/分類是「字串比對」關聯：transaction 的 `group`/`category` 對應 settings 裡群組與項目的 `name`。改名不會自動搬移舊資料。

## 5. 核心機制（改動前必讀）

### 5.1 讀取：持久快取 + onSnapshot 訂閱
- `lib/firebase.js` 開啟 `persistentLocalCache`：onSnapshot 首次回呼**先來自 IndexedDB 快取**（瞬間），伺服器同步在背景進行。App 重開幾乎不等網路。
- `transactions` / `incomes` 依**年份分片訂閱**（`where date >= / <=`），切年份時增訂新分片，
  各分片結果存在 ref（`transactionDataPartsRef`）再 **k-way merge** 成單一陣列（維持 date desc）。
- 次要 collections（salary/partner/mortgage/stock…）在 App 進入 `ready` 後**統一預先訂閱**（prefetch），或使用者先切到該頁時建立；`generalSubsRef` 防重複訂閱。

### 5.2 寫入：一律非阻塞（重要！）
Firestore 的寫入 Promise 要**等伺服器 ack 才 resolve**，但本地快取在呼叫當下就生效、onSnapshot 立刻更新畫面。因此：

```js
// ✅ 正確：本專案的寫法 — 送出即返回，UI 立即回應，離線也能記帳
commit(addDoc(...));   // commit() 在 App.jsx，只負責 .catch → toast 錯誤
setIsModalOpen(false);

// ❌ 錯誤：不要這樣做 — 網路差會卡住、離線會永遠 pending
await addDoc(...);
setIsModalOpen(false);
```

唯一例外是**需要跨裝置正確性**的操作（固定支出入帳）→ 用 `runTransaction`（需要連線）。
`withSubmission` wrapper 提供 400ms 防連點與錯誤 toast。

### 5.3 每月固定支出：全自動入帳
在 `App.jsx` 的 recurring effect（搜「Recurring — 每月固定支出」）：
- 觸發條件（缺一不可）：檢視年份=今年、`settingsFromServer===true`（設定已與伺服器核對，
  用 `onSnapshot(..., { includeMetadataChanges: true })` 的 `fromCache` 判斷）、
  `lastRecurringCheck !== 當月`、有啟用中的項目、本次開啟未嘗試過（ref 防重入）。
- 寫入用 `runTransaction`：先讀 `config_{今年}` 確認當月未入帳 → 建立交易 + 更新
  `lastRecurringCheck`（雙寫 config_v2）。**兩台裝置同時開啟也只會有一台成功**，另一台靜默跳過。
- 失敗（離線）會重置防重入 ref，下一次設定同步時自動重試。
- ⚠️ `settingsFromServer` 的 gating 不能拿掉，否則會用快取舊狀態誤判重複入帳。

### 5.4 Service Worker（開啟速度的關鍵）
- GitHub Pages 所有檔案只有 `cache-control: max-age=600`，沒有 SW 時每次開啟都要重新下載 ~900KB。
- `vite.config.js` 內的 **sw-precache 外掛**在每次 build 後產生 `dist/sw.js`：
  - 快取名 `ft-shell-{timestamp}-{contentHash}`；install 時用 `cache:'no-cache'` 預快取全部產物；
  - activate 時**保留最新的前一代快取**（版本交接瞬間，舊頁面還會請求舊資源——伺服器上已不存在，只能靠前一代快取），再舊的才刪；
  - fetch：導航回 `BASE`（忽略 query，deep link 才能運作）、資產先查當前快取→跨快取→網路。
- `src/main.jsx` 負責註冊與更新：新版 SW 接管時（controllerchange），**開啟 20 秒內自動 reload** 套用新版；超過 20 秒改發 `sw-updated` 事件 → App 顯示「新版本已就緒」toast，下次開啟生效。回前景（visibilitychange）會補查更新。
- `index.html` 有 12 秒**白畫面看門狗**：pre-loader 若還在就自動 reload 一次自救（sessionStorage 防循環，App 掛載成功會清旗標）。
- ⚠️ `dist/` 與 `sw.js` 都是 build 產物，**不要手動編輯**；SW 邏輯要改就改 `vite.config.js` 的模板。

### 5.5 設計系統（3.1「紙白墨金」：宣紙的白、墨色的字與按鈕、一點點金，只用淺色）
2026-11-28 3.0「琉璃」全面改版（舊的和紙風格在 `backup/pre-liquid-glass-20261128` 分支）；同一天再把配色換成「紙白墨金」。
配色是 Mick 在選色頁上一輪一輪挑出來的，方向請維持：
- 他要的是**低飽和、低調、日式**，但低飽和色直接放在白底上他覺得「很醜」；最後選的是「墨金」的淺色版「紙白」。
- **背景要淺、要乾淨、不能有形狀**（有邊緣的圖形會干擾閱讀）。特效是氣氛不是表演：**強度用「淡」**、
  **手指碰到的地方不能發光**、**不要粒子**（預覽版試過霧塵，他最後選「不要」）。
- **最上面的大數字是純墨色，不要金光**；金色只留在卡片右下的邊、金繼線、墨色按鈕上的字、年度支出。
- **裝水的球與瓶子用「清水」**：透明的玻璃＋很淡、透光的水。實色的水他覺得「不像真的水」；
  預覽版試過墨玻璃（煙墨色的玻璃＋淺色的水），他比較後選了清水。
- **不支援深色模式**（沿用 2.0 的決定）。`index.html` 宣告 `color-scheme: light only`。
- **背景**：`components/glass.jsx` 的 `<Aurora />`（`.aurora`，名稱沿用）＝宣紙的底色＋一張畫布＋和紙的顆粒。
  畫布由 `lib/inkField.js` 繪製：低解析度的**水墨**（幾團沒有邊緣的霧＋兩層雲霧紋理，慢慢飄，每秒只重畫約 9 次）。
  分頁在背景時暫停；`prefers-reduced-motion` 時只畫一張靜止的。強度寫死在 `inkField.js` 的 `K`（0.45＝淡）。
- **卡片與玻璃**（都在 `src/index.css` 的 `@layer components`）：
  - `.glass-card`：**內容卡片**，半透明的白玻璃。質感靠邊緣：左上白色高光、**右下一道金邊**、內側亮邊（厚度）、深色細外緣、柔和陰影。
    **卡片不做 `backdrop-filter`**：紙白的底很乾淨，模糊看不出差別，拿掉後捲動與背景動畫都輕很多。
    可加 `.tint-blue/rose/emerald/indigo/amber/red` 淡淡上色、`.r-tile` 用小一號圓角。
  - `.glass`：**浮在內容上方的介面**（頁首按鈕、底部導覽、子分頁），這些才是真的玻璃（`backdrop-filter`）。
    抽屜 `.sheet-panel`、對話框 `.modal-card`、提示 `.toast` 也是（抽屜幾乎不透，表單才好讀）。
  - 另有 `.glass-well`（凹槽）、`.glass-ink`／`.btn-ink`（墨色：主要按鈕與＋號，**字是淡金色 `--gold-ink`**）。
  - `.vein`：金繼線（一段 SVG 路徑，畫在卡片內容後面）。目前只用在總覽最上面那張卡。
- **色票**在 `@theme`，直接覆寫 Tailwind 色系，全部低彩度：slate＝墨與鼠（偏暖）、blue＝縹（士程）、
  rose＝退紅（佳欣）、emerald＝松葉（彈性／正向）、indigo＝青墨（固定）、amber＝金（年度）、cyan＝水淺蔥、
  **red＝茜（警示／超支／刪除，和退紅分開）**、violet＝江戸紫（AI 建議）。**不要加鮮豔的顏色**，新顏色從這幾個色系取。
  彩色文字一律用 700 以上，對比才夠。
  漸層用 `.tone-*`（`--a` 淺、`--b` 深、`--glow`），試管、長條、液體都吃這組變數。
- **字體**：全部系統字，不再下載網路字體。內文 SF Pro＋蘋方；`.font-num`、`.money` 與 `text-2xl` 以上用
  SF Pro Rounded（`ui-rounded`）等寬數字。
- **液體**是視覺語言：`Vessel`（透明玻璃的球／瓶子裡裝著會晃、很淡的水，水位＝比例；水面有一道亮線、水裡有氣泡）、
  `.tube`（試管進度條）、`.vbar`（直條圖）。總覽的「本月還能花」是一顆球、今年三桶是三個瓶子。
  容器是透明的，後面不要放線條或圖形（金繼線到球的前面就淡掉）。
- **動畫**：彈簧曲線 `--spring`／`--spring-soft`（`linear()`，不支援時退回貝茲）。頁面內容用 `.stagger` 一張張浮上來；
  金額用 `Num` 數上去；按下去用 `.press`／`.btn` 的回彈。`prefers-reduced-motion` 時全部關掉。
- ⚠️ **不要在有玻璃子孫（`.glass`、抽屜等有 `backdrop-filter` 的元素）的容器上做 `opacity`／`filter` 動畫**：那會讓容器變成 backdrop root，
  裡面的玻璃在動畫期間會失去背景模糊、動畫結束才突然出現。所以 `.stagger` 的進場（`rise`）只動 `transform`；
  玻璃元素自己做淡入（`.fade-up`）沒問題，包住玻璃的父層不行。
- ⚠️ `@layer components` 裡的樣式可以被 Tailwind 工具類別覆寫（例如 `glass-card !rounded-[24px]`）；
  寫在 layer 外的樣式會贏過所有工具類別，新增元件樣式請放進 layer。
- 分類圖示：`lib/categoryIcons.js`（分類→Lucide 圖示、三桶色調），元件 `components/CategoryIcon.jsx`（`.orb-icon` 玻璃球）。

### 5.5a 離場動畫與抽屜（3.0）
- 呼叫端關閉抽屜都是直接 `setSheet(null)`，元件當下就被卸載，沒有機會播離場動畫。
  `useGhostExit`（`components/glass.jsx`）在卸載的那一刻把 DOM 節點複製一份（`.ghost`）留在原地，
  用 Web Animations 播完離場再移除。所以**不需要為了動畫延後卸載**，新抽屜照舊寫就有離場動畫。
- `SheetShell`：浮在底部的玻璃抽屜外殼（進場彈上來、把手可往下拖曳關閉、鍵盤出現時用 `--kb` 往上推並縮小高度）。
  `v2.jsx` 的 `Sheet` 與 `QuickAddSheet` 都用它。記帳抽屜設 `avoidKeyboard={false}`：它夠高，備註欄本來就在鍵盤上方。
- `Segmented`：分段切換，選中的玻璃片會量位置滑過去（各格不等寬也可以）。頁首的子分頁、`Seg` 都用它。
- 頁首 `.topbar` 浮在內容上方，高度由 App.jsx 量出來寫進 `--header-h`，`<main>` 用它留白；
  內容捲到頁首底下時（`data-scrolled`）才出現漸層霧面。

### 5.5b 快速記帳（2.0 P1）
- 新增支出走 `components/QuickAddSheet.jsx`（FAB、日曆「在這天新增」、`?action=add-expense`）；
  編輯既有紀錄也用同一個抽屜（`setQuickAdd({ edit: t })`），可刪除；儲存時整筆覆寫，取消的餐別／一起吃會移除。
- `lib/quickAdd.js`：
  - 自動分類第 1 層＝同備註的歷史多數分類（自己的紀錄優先、一致率 ≥60%）；第 2 層＝包含已知備註或關鍵字表，
    只當猜測（畫面標「？」）；都對不上就要使用者自己選。第 3 層 Gemini 見 `lib/gemini.js`（下方）。
  - 常用建議只看該記帳人自己的紀錄（近 90 天為主）；金額幾乎固定的備註會一併帶出金額（$0 也算，例如公司便當帶出 $0）。
  - 金額可以是 $0：只要有備註和分類就能記下（公司便當、別人請客等）。
  - 這支手機的記帳人存在 `localStorage['ft-device-payer']`，第一次開抽屜時詢問。
- 新欄位（只在日常飲食）：`meal: 'lunch' | 'dinner'`、`together: true`（這一餐兩人一起，午晚餐都可）。
  「沒花錢」＝ $0 紀錄，備註為 請客／自煮／沒吃。舊紀錄沒有這些欄位。

### 5.5c 2.0 導覽與預算三桶
- 底部 5 個入口：總覽／明細／＋（記一筆）／分析（子分頁：支出、收入）／資產（子分頁：淨值、持股、存股、佳欣儲蓄、房產、阿奇）。
  預算設定從總覽右上角齒輪進入。App.jsx 用 `activeView` 表示子分頁實際顯示的頁面；舊代號（income、watchlist…）會自動轉到新位置。
- 預算三桶（`lib/budget.js`）：固定＝啟用中的固定支出加總；彈性＝每月一個總額度，存在 `settings/budget_v2_{year}`（新文件，
  不動正式版的 `config_{year}`）；年度＝annualGroups 的金額。年度總預算＝固定×12＋彈性×12＋年度。
  交易歸桶：type annual → 年度；備註＋分類對上固定支出項目 → 固定；其餘 → 彈性。
- 兩人每餐（`lib/meals.js`）：午、晚餐都是：有人在那一餐標「兩人一起」兩個人都算，否則各自算；$0 的 請客／自煮／沒吃 算有交代。
- 分類回測在預算設定頁（leave-one-out）。
- `lib/gemini.js`（第 3 層）：前兩層都分不出來、且這支手機設了金鑰時，停止打字 0.8 秒後問 Gemini（REST，`x-goog-api-key` 標頭，模型 `gemini-flash-latest`，404 時退回 `gemini-2.5-flash`；結構化 JSON、只能選現有分類或「不確定」）。
  結果只顯示成「AI 建議」，點一下才採用，不會自動寫入。金鑰存 localStorage `ft-gemini-key`，**不進程式碼、不進 Firestore**。
  預算設定頁可貼／移除金鑰，並做 AI 回測（今年前兩層分不出來的備註最多 40 則，一次請求）。

### 5.5d 收入與資產頁（2.0）
- 六頁同一個版型（`components/v2.jsx`）：頁首大數字直接寫在紙上 → 一張圖 → 一列一列的清單；點一列從下方拉出 `Sheet` 編輯，新增也用同一個抽屜。
  不再有右下角浮動 + 按鈕，也不再用 ModalWrapper 表單（App.jsx 裡舊的收入／儲蓄／調薪／換匯／房產表單已刪除）。
- `Sheet` 用 portal 掛到 body，z-[55]：`<main>` 自成一層（relative z-10），放在裡面會被頁首與底部導覽蓋住；確認刪除對話框是 z-60，所以會疊在抽屜上面。
- 寫入：App.jsx 的 `saveRecord(col, data, id, msg)`（有 id 就 setDoc merge，沒有就 addDoc）與 `removeRecord(col, id, message)`（經 requestDelete 確認）。
  收入、佳欣儲蓄、存股、換匯、房產都走這兩個；持股與淨值仍各自寫自己的設定文件。
- 收入預設載入今年與去年（比去年同期）；翻到其他年份時呼叫 `requestHistory(year)` 補載。
- 記收入選「薪水」時可一鍵帶入「同上次」或「目前月薪」（salary_history 最新一筆）。

### 5.5e 不再顯示「群組」（2.0 全面淘汰舊版）
- 畫面上只有「分類」＋「三桶」（固定／彈性／年度），任何地方都不顯示舊版的群組名稱（例如「生活固定支出」）。
  明細每筆寫「日常飲食・彈性」；分類選單只分「每月」「年度」兩區。
- 資料結構不變：`config_{year}` 的 monthlyGroups／annualGroups 仍是「群組 → 分類」兩層，交易也照樣存 group，
  因為正式版（main）還在讀。2.0 新增的分類一律放進底層群組「其他」，使用者看不到。
- 分類管理在預算設定頁：每月分類可新增／刪除；年度項目可新增／改金額／刪除；名稱只有在今年還沒有紀錄時才能改。
  舊制「每個分類的月預算」、舊的分析頁（依預算群組看細項）、GroupSettingsEditor、RecurringManagerModal 已刪除。
- 固定支出改在預算設定頁直接管理（名稱、金額、每月幾號、記在誰名下、分類、啟用／暫停）。

### 5.6 帳號與多裝置
- 使用者用 `signInAnonymously` 匿名登入（每台裝置一個匿名 UID），但資料都讀寫
  `ledgers/Mick` 這一份共用帳本（`LEDGER_ID`），兩人資料即時互通。
- 區分「誰的」靠資料欄位：支出 `payer`、收入 `owner`（`'myself'`=士程、`'partner'`=佳欣）。
- ⚠️ 安全性現況：知道 firebaseConfig（就在 bundle 裡）的任何人都能匿名登入讀寫此帳本。
  待辦：Firestore Rules 改 UID 白名單。

### 5.7 Deep Links（主畫面捷徑）
- `manifest.webmanifest` 的 `shortcuts`（Android 長按圖示；iOS 尚不支援）。
- App 在 `ready` 後解析 `?action=`：`add-expense` 開記帳視窗、`analysis` 跳分析頁，處理完
  `history.replaceState` 清參數。新增動作照這個模式擴充。

### 5.8 預覽版（preview 分支 → /finance-tracker/preview/）
- 用途：大改版先在預覽網址試用，正式版不動。加到主畫面是第二個圖示（名稱「記帳2.0」）。
  **同網域、同一本帳**：預覽版記的帳是真的。
- 部署：Pages 一個 repo 只有一個站，所以 `deploy.yml` 每次都**同時**建置 main（→ `dist/`）
  與 `preview` 分支（`FT_PREVIEW=1` → `dist/preview/`），分支不存在就只建正式版。
  push 到 `preview` 會先跑該分支上的「Preview trigger」workflow，再以 `workflow_run`
  觸發 main 的部署（github-pages 環境只允許 main 部署）。
- `FT_PREVIEW=1` 時 `vite.config.js`：`base` 改 `/finance-tracker/preview/`、**不產生 SW**
  （每次開都是最新版）、改寫 manifest（id/start_url/scope/名稱）與 iOS 主畫面名稱；
  程式內可用 `__FT_PREVIEW__` 判斷。正式版 SW 對 `/finance-tracker/preview/` 一律放行。
- 預覽滿意後把 `preview` 合併回 `main` 即上線。2026-11-25 已把 2.0 合併進 main；舊版（1.x）保留在 `legacy/v1` 分支。

## 6. UI 慣例

- **卡片**：用 `.glass-card`（或 `GLASS_CARD`）；清單用 `Divided`＋`Row`；不要自己拼卡片樣式，也不要再加 Tailwind 的 `border`
  （預設是文字色，會畫出一圈深色框）。
- **每頁版型**：最上面一張 `Hero` 大玻璃卡（`amount` 給數字就會數數；比例條、小統計放進 children）→ `Section` 一段一段往下。
  頁面最外層加 `stagger`。
- **顏色**：語意色用 `tone` 名稱（emerald／indigo／amber／blue／rose／red／cyan／slate），元件會對到
  `.tone-*`、`.orb-*`、`.tag-*`、`.chip.on-*`。持股群組的顏色仍從 `COLOR_VARIANTS` 取。
- **按鈕**：主要 `.btn .btn-ink`、次要 `.btn .btn-glass`、刪除 `.btn .btn-danger`（確認刪除用 `.btn-red`）、
  「新增一筆」這類空位用 `.btn .btn-dashed`；圓形小鈕 `.icon-btn`；可選的小籤 `.chip`（選中 `aria-pressed` 或 `.on`）。
- **輸入**：文字 `TextInput`、日期 `DateInput`、金額 `MoneyInput`、小欄位 `SmallInput`（都在 `v2.jsx`，樣式是 `.field`）。
- **抽屜**：新增／編輯一律用 `components/v2.jsx` 的 `Sheet`（支出用 `QuickAddSheet`）；刪除確認用
  `requestDelete` / `requestConfirmation`（App.jsx）觸發共用 `ConfirmationModal`。
- **提示**：`useToast()` → `showToast(msg, 'success'|'warning'|'error')`；操作成功搭配 `haptic()`
  （iPhone 沒有 Vibration API，`lib/utils.js` 改用 iOS 17.4+ 的 switch 核取方塊觸發輕觸回饋，必須在點按當下呼叫）。
- **金額**：顯示用 `Money`（小一號的 `$`＋等寬數字；`animate` 會數數）或 `fmt()`。
- **日期**：一律 `'YYYY-MM-DD'` 字串（`toLocalISOString`/`getTodayString`），比較用字串比較。
- **進度條**：`Tube`／`StackTube`；剩餘 <10% 可加 `alert`（`budget-alert-glow` 呼吸光）。
- Safe area：頁首、底部導覽、抽屜都已在各自的 class 裡處理 `env(safe-area-inset-*)`，勿硬編 padding。
- **改畫面後怎麼檢查**：無頭 WebKit 的截圖不會畫出 `backdrop-filter`，要看玻璃模糊請用 Chromium 截圖或實機。

## 7. 開發與部署

```bash
npm run dev        # 開發（http://localhost:5173/finance-tracker/）
npm run build      # 建置（會順帶產生 dist/sw.js）
npm run preview    # 以正式模式本機預覽 dist（http://localhost:4173/finance-tracker/，SW 會啟用）
npx eslint src/    # 檢查（有少量既有警告為 baseline）
```

**部署流程（慣例）**：
1. 動大刀前先開備份分支：`git branch backup/<說明>-<日期>`（已有先例：`backup/pre-redesign-20260616`、`backup/pre-perf-opt-20260702`）。
2. 改完在本機 `npm run build && npm run preview` 驗證。
3. commit → push `main` → GitHub Actions 自動部署 Pages。
4. Mick 會在手機上開 App 驗收（開啟後幾秒 SW 自動更新到新版）。有問題就 revert 到備份分支。

## 8. 注意事項 / 陷阱清單

1. **不要 `await` Firestore 寫入**後才更新 UI（見 §5.2）——會破壞離線與弱網體驗。
2. **不要移除 recurring 的 `settingsFromServer` / `runTransaction`**（見 §5.3）——會重現「多裝置重複入帳」bug。
3. **`config_{year}` 是一年一份**：讀寫預算/固定支出設定時注意「檢視年份」與「今年」的差異；
   `lastRecurringCheck` 一律寫「今年」的 config + config_v2。
4. **玻璃卡片都有 `backdrop-filter`**：不要把它們包在會做 `opacity` 動畫的父層裡（見 §5.5），也不要一頁塞進幾十張同時可見的玻璃卡片——清單請用一張 `Divided` 裝很多列，不要一列一張卡。
5. **SW 是 build 產物**：改快取策略只能動 `vite.config.js`；部署後第一次開啟仍是舊版、第二次（或自動 reload 後）才是新版，這是預期行為。
6. Finnhub API key 是免費方案且暴露在前端（可接受的風險）；報價有 5 分鐘 localStorage 快取，抓價間隔 100ms 防 rate limit。
7. `getFixedDepositAmount()`（lib/utils.js）內含佳欣儲蓄的年度定存金額規則（寫死的年份區間），是業務邏輯不是 bug。
8. eslint 有少量 baseline 警告（react-hooks compiler 對既有寫法的提示、歷史未用變數）；新程式碼不要再新增，既有的可趁重構順手清。
9. `dist/` 已被 `.gitignore`，CI 會自己 build；本機 build 只是驗證用。
10. iOS PWA 的特性：常駐記憶體少有真正重啟（更新靠 visibilitychange 檢查）、每個主畫面圖示有獨立的儲存空間。
