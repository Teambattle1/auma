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

// Pull-to-refresh on mobile
let pullStartY = 0
let pulling = false
document.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    pullStartY = e.touches[0].clientY
    pulling = true
  }
}, { passive: true })

document.addEventListener('touchmove', (e) => {
  if (!pulling) return
  const diff = e.touches[0].clientY - pullStartY
  if (diff > 120 && window.scrollY === 0) {
    pulling = false
    window.location.reload()
  }
}, { passive: true })

document.addEventListener('touchend', () => { pulling = false }, { passive: true })
