import { Routes, Route, Navigate } from 'react-router-dom'
import Portfolio from './components/Portfolio.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import Admin from './components/Admin.jsx'
import content from './data/content.json'
import { useEffect } from 'react'

function AdminRoute() {
  const isAuth = sessionStorage.getItem('adminAuth') === 'true'
  return isAuth ? <Admin /> : <AdminLogin />
}

export default function App() {
  useEffect(() => {
    if (content.meta.googleAnalyticsId) {
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${content.meta.googleAnalyticsId}`
      script.async = true
      document.head.appendChild(script)
      window.dataLayer = window.dataLayer || []
      function gtag(){window.dataLayer.push(arguments)}
      window.gtag = gtag
      gtag('js', new Date())
      gtag('config', content.meta.googleAnalyticsId)
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Portfolio />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
