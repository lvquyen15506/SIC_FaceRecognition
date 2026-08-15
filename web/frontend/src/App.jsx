import React, { useState, useEffect } from 'react'
import Login from './pages/Login'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setCurrentUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.clear()
      }
    }
  }, [])

  const handleLoginSuccess = (user, accessToken) => {
    setCurrentUser(user)
    setToken(accessToken)
  }

  const handleLogout = () => {
    localStorage.clear()
    setCurrentUser(null)
    setToken('')
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{ color: '#00f0ff', margin: 0, fontSize: '24px' }}>🏫 SIC FaceViT Portal</h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Xin chào: <strong style={{ color: '#ffffff' }}>{currentUser.full_name}</strong> (Vai trò: <span style={{ color: '#00ff66', fontWeight: 700 }}>{currentUser.system_role}</span>)
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255, 51, 102, 0.2)',
            border: '1px solid #ff3366',
            color: '#ff6688',
            padding: '8px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          🚪 Đăng Xuất
        </button>
      </header>

      <main style={{ marginTop: '32px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {currentUser.system_role === 'ADMIN' && (
            <div style={{
              background: 'rgba(0, 240, 255, 0.05)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(0, 240, 255, 0.3)'
            }}>
              <h3 style={{ color: '#00f0ff', marginTop: 0 }}>👑 Quản Trị Viên Tối Cao (System Admin)</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Bạn có toàn quyền tạo tài khoản mới cho Giảng viên/Sinh viên, gán vai trò hệ thống và giám sát toàn trường.
              </p>
            </div>
          )}

          {(currentUser.system_role === 'TEACHER' || currentUser.system_role === 'ADMIN') && (
            <div style={{
              background: 'rgba(0, 255, 102, 0.05)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(0, 255, 102, 0.3)'
            }}>
              <h3 style={{ color: '#00ff66', marginTop: 0 }}>👨‍🏫 Quản Lý Lớp Học & Điểm Danh</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Quản lý Lớp học do bạn làm Chủ nhiệm hoặc Co-Teacher, thêm Lớp trưởng, Upload Ảnh/Video điểm danh & Xuất CSV.
              </p>
            </div>
          )}

          <div style={{
            background: 'rgba(255, 51, 102, 0.05)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 51, 102, 0.3)'
          }}>
            <h3 style={{ color: '#ff3366', marginTop: 0 }}>👨‍🎓 Hồ Sơ Sinh Trắc Học eKYC</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
              Trạng thái eKYC 120 mẫu: {currentUser.ekyc_completed ? <span style={{ color: '#00ff66', fontWeight: 700 }}>✅ Đã hoàn thành</span> : <span style={{ color: '#ff3366', fontWeight: 700 }}>⚠️ Chưa hoàn thành (Yêu cầu bật Camera làm eKYC)</span>}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
