import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD
  const isConfigured = Boolean(envPassword)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!isConfigured) {
      setError('Admin password is not configured. Set VITE_ADMIN_PASSWORD in your environment variables.')
      return
    }

    if (password === envPassword) {
      sessionStorage.setItem('adminAuth', 'true')
      navigate('/admin')
      // Force re-render by reloading
      window.location.reload()
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1 className="admin-login-title">Admin Panel</h1>
        <p className="admin-login-sub">Enter your password to manage site content</p>

        {!isConfigured && (
          <div className="admin-login-setup">
            <strong>Setup required</strong><br />
            To enable admin access, set the following environment variable:<br /><br />
            <code>VITE_ADMIN_PASSWORD=yourpassword</code><br /><br />
            In Netlify: go to Site settings → Environment variables and add the variable above.
            For local development, create a <code>.env</code> file (see <code>.env.example</code>).
          </div>
        )}

        {isConfigured && (
          <form className="admin-login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="admin-login-error">{error}</div>
            )}

            <button type="submit" className="admin-login-submit">
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
