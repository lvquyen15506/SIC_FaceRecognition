import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Quyen2006.com')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      const res = await axios.post('/api/auth/login', {
        username: username,
        password: password,
      })

      const { access_token, user } = res.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user', JSON.stringify(user))

      if (onLoginSuccess) {
        onLoginSuccess(user, access_token)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản & mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #0b132b 100%)',
      color: '#ffffff',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '36px 30px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '42px',
            marginBottom: '8px'
          }}>🏫</div>
          <h2 style={{ margin: 0, color: '#00f0ff', fontSize: '24px', fontWeight: 700 }}>
            SIC FaceViT Portal
          </h2>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Hệ thống eKYC & Điểm danh AI Đa Phân Quyền
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(255, 51, 102, 0.15)',
            border: '1px solid #ff3366',
            color: '#ff6688',
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
              Tên đăng nhập hoặc Email:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username hoặc email..."
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
              Mật khẩu:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(90deg, #00f0ff 0%, #7000ff 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)',
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? 'Đang xác thực...' : '🔑 ĐĂNG NHẬP HỆ THỐNG'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          padding: '12px',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          borderRadius: '10px',
          fontSize: '12px',
          color: '#94a3b8',
          textAlign: 'center'
        }}>
          💡 <strong>Tài khoản Super Admin mặc định:</strong><br/>
          Username: <code style={{ color: '#00f0ff' }}>admin</code> | Mật khẩu: <code style={{ color: '#00f0ff' }}>Quyen2006.com</code>
        </div>
      </div>
    </div>
  )
}
