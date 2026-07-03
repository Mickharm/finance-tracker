# 記帳助手（finance-tracker）

兩人共用的家庭記帳 PWA：支出預算、收入、儲蓄、持股、房產與資產淨值追蹤。

- **技術**：React 19 + Vite(rolldown) + Tailwind v4 + Firebase（匿名登入 / Firestore）
- **部署**：push `main` → GitHub Actions → GitHub Pages（`/finance-tracker/`）
- **安裝**：手機瀏覽器開啟後「加入主畫面」（iOS standalone PWA）

## 快速開始

```bash
npm install
npm run dev        # 開發模式 http://localhost:5173/finance-tracker/
npm run build      # 建置（自動產生 Service Worker）
npm run preview    # 正式模式本機預覽 http://localhost:4173/finance-tracker/
```

## 文件

**接手開發前請先閱讀 [ARCHITECTURE.md](./ARCHITECTURE.md)** —— 內含目錄結構、Firestore 資料模型、
核心機制（離線快取、非阻塞寫入、固定支出自動入帳、Service Worker、深色模式）與陷阱清單。
