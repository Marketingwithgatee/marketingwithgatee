import { Routes, Route, Navigate } from 'react-router-dom'
import Portfolio from './components/Portfolio.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import Admin from './components/Admin.jsx'

function AdminRoute() {
  const isAuth = sessionStorage.getItem('adminAuth') === 'true'
  return isAuth ? <Admin /> : <AdminLogin />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Portfolio />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
