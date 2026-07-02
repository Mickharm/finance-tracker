import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker：App Shell 預快取，讓開啟速度不受網路影響（僅正式版啟用）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // controllerchange 監聽必須在模組載入當下就掛上：快取供應的頁面 load 極快，
  // 新版 SW 可能在 load 事件前就完成接管，等到 load 才掛監聽會錯過事件。
  // 首次安裝（原本沒有 SW 接管）不需要 reload，只有「舊版換新版」才需要。
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    // 剛開啟不久（尚未開始輸入）就自動重整以套用新版；
    // 之後才完成的更新則留到下次開啟時生效，避免打斷輸入中的表單
    if (performance.now() < 20000) window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
      .then((reg) => {
        // iOS 的 PWA 常駐記憶體、少有真正的「重新啟動」，
        // 因此每次回到前景時都補查一次是否有新版本
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {})
        })
      })
      .catch((e) => console.warn('SW registration failed:', e))
  })
}
