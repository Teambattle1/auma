import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Auto-refresh: check for new version every 30 seconds
const BUILD_ID = Date.now().toString()
setInterval(async () => {
  try {
    const res = await fetch('/', { cache: 'no-store' })
    const html = await res.text()
    // If the HTML contains different script references, a new build is deployed
    if (!html.includes(document.querySelector('script[type="module"]')?.getAttribute('src') || '__none__')) {
      console.log('New version detected, reloading...')
      window.location.reload()
    }
  } catch { /* offline or error, skip */ }
}, 30000)
