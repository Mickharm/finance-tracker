# 記帳助手 — 專案架構文件

> 給後續接手的工程師或 AI：這份文件描述專案的結構、資料模型、核心機制與開發慣例。
> 動手改code之前請先讀完「核心機制」與「注意事項」，裡面記錄了幾個違反直覺、但刻意如此設計的地方。

## 1. 專案概觀

- **用途**：Mick 與佳欣兩人共用的家庭記帳 PWA（支出預算、收入、儲蓄、持股、房產、資產淨值）。
- **形態**：單頁 React App，手機以「加入主畫面」方式安裝（iOS standalone PWA 為主要環境）。
- **後端**：Firebase（匿名登入 + Cloud Firestore），無自建伺服器。
- **部署**：GitHub Pages，網址前綴 `/finance-tracker/`。push 到 `main` 即由 GitHub Actions 自動建置部署（`.github/workflows/deploy.yml`）。

## 2. 技術棧

| 項目 | 選擇 | 備註 |
|---|---|---|
| 框架 | React 19 | 無 router，用 `currentView` state 切頁 |
| 建置 | Vite（`rolldown-vite@7.2.5`） | `package.json` 用 overrides 固定 |
| 樣式 | Tailwind CSS v4 | 玻璃擬態風格；深色模式見 §6 |
| 圖示 | lucide-react | |
| 資料 | Firebase Auth（匿名）+ Firestore | persistent local cache 開啟 |
| 股價 | Finnhub API | 免費 key 寫在 `lib/utils.js`，localStorage 快取 5 分鐘 |

## 3. 目錄結構

```
finance-tracker/
├── index.html              # HTML 外殼：pre-loader、白畫面看門狗、深色 meta、preconnect
├── vite.config.js          # base 路徑 + sw-precache 外掛（自動產生 dist/sw.js，見 §5.4）
├── public/
│   ├── manifest.webmanifest  # PWA manifest（含 shortcuts 主畫面捷徑）
│   └── icon.png
├── .github/workflows/deploy.yml  # push main → build → GitHub Pages
└── src/
    ├── main.jsx            # React 掛載 + Service Worker 註冊/更新流程
    ├── App.jsx             # AppContent：全域 state、Firestore 訂閱、所有寫入 handler、
    │                       #            頁面路由（currentView）、所有「新增/編輯」Modal 的 JSX
    ├── index.css           # Tailwind 進入點 + 自訂 CSS（tab bar、動畫、深色模式重對映層）
    ├── lib/
    │   ├── firebase.js     # Firebase 初始化；匯出 auth, db, appId, LEDGER_ID
    │   ├── constants.js    # GLASS_CARD/GLASS_INPUT 玻璃樣式、COLOR_VARIANTS 主題色、
    │   │                   # DEFAULT_SETTINGS、INCOME_CATEGORIES、選單定義
    │   └── utils.js        # 日期工具、evalArithmetic 計算機、haptic、股價快取、千分位
    ├── components/
    │   ├── Toast.jsx       # ToastProvider / useToast（全域訊息提示）
    │   ├── ui.jsx          # 共用元件：ModalWrapper、ConfirmationModal、LoadingScreen、
    │   │                   # InputField、NoteQuickPicks、CalculatorInput、GlassButton、
    │   │                   # BudgetProgressBar、GroupCard、StandardList、AmountInput…
    │   └── settings.jsx    # GroupSettingsEditor（預算群組編輯）、RecurringManagerModal（固定支出設定）
    └── views/              # 每個頁面一個檔案（皆為純呈現＋自身互動，資料多由 App.jsx 傳入）
        ├── HomeView.jsx            # 總覽（年度/月度/年度預算卡）
        ├── CalendarView.jsx        # 日曆（每日明細）
        ├── VisualizationView.jsx   # 支出分析
        ├── IncomeView.jsx          # 收入管理（雙人卡片、調薪紀錄）
        ├── PartnerView.jsx         # 佳欣儲蓄
        ├── InvestmentTabView.jsx   # 持股組合（自行訂閱 holdings_config、抓 Finnhub 報價）
        ├── StockGoalView.jsx       # 存股計畫 + 美金換匯
        ├── MortgageView.jsx        # 房產投資（雜支/試算/頭期款來源）
        └── PrincipalView.jsx       # 資產淨值（自行訂閱 principal_config / principal_history）
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

### 5.5 深色模式（跟隨系統）
- 策略：**不逐行加 `dark:` variant**。`src/index.css` 的
  `@media (prefers-color-scheme: dark)` 區塊集中「重對映」全 App 用到的色彩工具類別
  （`.text-slate-800`、`.bg-white\/35`、`.border-slate-200`、主要按鈕 `.bg-slate-800`…，
  以及 COLOR_VARIANTS 主題色文字的 `[class*="text-[#…]"]` 屬性選擇器）。
  Tailwind v4 的 utilities 在 cascade layer 裡，此處未分層的規則必定勝出。
- 掛點：底色用 `.app-bg`、背景色球用 `.bg-blob`（深色再壓暗）、玻璃陰影用
  `.glass-card-fx` / `.glass-input-fx`、圖表格線用 `.chart-grid`；原生控件靠 `color-scheme: dark`。
- ⚠️ **新增顏色 utility class 時**（尤其新的 `bg-slate-*`、`text-slate-*`、`bg-white/*` 透明度階、
  或直接用在玻璃上的 arbitrary 色碼文字），記得到 index.css 深色區塊補對映，否則深色下會突兀。
- `index.html` 的 pre-loader 與 `theme-color` meta 也各有深色版本。

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

## 6. UI 慣例

- **玻璃卡片**：一律用 `GLASS_CARD` / `GLASS_INPUT`（`lib/constants.js`），不要自己拼玻璃樣式。
- **主題色**：從 `COLOR_VARIANTS` 取（slate/sky/rose/emerald/amber/indigo/cyan…），
  每個主題含 bg/border/text/iconBg/iconText/bar。
- **Modal**：內容包在 `ModalWrapper`（處理鍵盤頂起、focus 捲動）；刪除確認用
  `requestDelete` / `requestConfirmation`（App.jsx）觸發共用 `ConfirmationModal`。
- **提示**：`useToast()` → `showToast(msg, 'success'|'warning'|'error')`；操作成功搭配 `haptic()`。
- **備註快捷**：表單備註欄位下放 `NoteQuickPicks`（統計歷史紀錄 top-5 常用備註）。
- **金額**：顯示用 `toLocaleString()`；千分位輸入框用 `AmountInput`。
- **日期**：一律 `'YYYY-MM-DD'` 字串（`toLocalISOString`/`getTodayString`），比較用字串比較。
- **進度條警示**：剩餘 <10% 加 `budget-alert-glow` class（呼吸光）。
- Safe area：header 用 `.header-safe`、底部用 `.tab-bar-safe`，勿硬編 padding。

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
4. **新色彩類別要補深色對映**（見 §5.5）。
5. **SW 是 build 產物**：改快取策略只能動 `vite.config.js`；部署後第一次開啟仍是舊版、第二次（或自動 reload 後）才是新版，這是預期行為。
6. Finnhub API key 是免費方案且暴露在前端（可接受的風險）；報價有 5 分鐘 localStorage 快取，抓價間隔 100ms 防 rate limit。
7. `getFixedDepositAmount()`（lib/utils.js）內含佳欣儲蓄的年度定存金額規則（寫死的年份區間），是業務邏輯不是 bug。
8. eslint 有少量 baseline 警告（react-hooks compiler 對既有寫法的提示、歷史未用變數）；新程式碼不要再新增，既有的可趁重構順手清。
9. `dist/` 已被 `.gitignore`，CI 會自己 build；本機 build 只是驗證用。
10. iOS PWA 的特性：常駐記憶體少有真正重啟（更新靠 visibilitychange 檢查）、每個主畫面圖示有獨立的儲存空間。
