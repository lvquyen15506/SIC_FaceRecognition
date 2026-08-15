import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import AdminUsers from './pages/AdminUsers'
import TeacherClasses from './pages/TeacherClasses'
import StudentEkyc from './pages/StudentEkyc'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState('CLASSES')  // 'ADMIN', 'CLASSES', 'EKYC'

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        const parsedUser = JSON.parse(savedUser)
        setCurrentUser(parsedUser)
        if (parsedUser.system_role === 'ADMIN') {
          setActiveTab('ADMIN')
        } else if (parsedUser.system_role === 'TEACHER') {
          setActiveTab('CLASSES')
        } else {
          setActiveTab('EKYC')
        }
      } catch (e) {
        localStorage.clear()
      }
    }
  }, [])

  const handleLoginSuccess = (user, accessToken) => {
    setCurrentUser(user)
    setToken(accessToken)
    if (user.system_role === 'ADMIN') {
      setActiveTab('ADMIN')
    } else if (user.system_role === 'TEACHER') {
      setActiveTab('CLASSES')
    } else {
      setActiveTab('EKYC')
    }
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
    <div style={{ padding: '30px 20px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* HEADER BAR */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '20px 28px',
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

      {/* FEATURE CARDS NAV TABS */}
      <nav style={{ marginTop: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {currentUser.system_role === 'ADMIN' && (
            <div
              onClick={() => setActiveTab('ADMIN')}
              style={{
                background: activeTab === 'ADMIN' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                padding: '20px',
                borderRadius: '14px',
                border: activeTab === 'ADMIN' ? '2px solid #00f0ff' : '1px solid rgba(0, 240, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <h3 style={{ color: '#00f0ff', marginTop: 0 }}>👑 Quản Trị Viên Tối Cao (System Admin)</h3>
              <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0 }}>
                Tạo tài khoản mới, gán vai trò hệ thống (ADMIN/TEACHER/STUDENT) và xem thống kê.
              </p>
            </div>
          )}

          {(currentUser.system_role === 'TEACHER' || currentUser.system_role === 'ADMIN') && (
            <div
              onClick={() => setActiveTab('CLASSES')}
              style={{
                background: activeTab === 'CLASSES' ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                padding: '20px',
                borderRadius: '14px',
                border: activeTab === 'CLASSES' ? '2px solid #00ff66' : '1px solid rgba(0, 255, 102, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <h3 style={{ color: '#00ff66', marginTop: 0 }}>👨‍🏫 Quản Lý Lớp Học & Điểm Danh</h3>
              <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0 }}>
                Tạo lớp học, thêm Co-Teacher, gán Lớp trưởng, Upload Ảnh điểm danh AI & Xuất CSV.
              </p>
            </div>
          )}

          <div
            onClick={() => setActiveTab('EKYC')}
            style={{
              background: activeTab === 'EKYC' ? 'rgba(255, 51, 102, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              padding: '20px',
              borderRadius: '14px',
              border: activeTab === 'EKYC' ? '2px solid #ff3366' : '1px solid rgba(255, 51, 102, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <h3 style={{ color: '#ff3366', marginTop: 0 }}>👨‍🎓 Hồ Sơ Sinh Trắc Học eKYC</h3>
            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0 }}>
              Bật Web Camera chụp 120 mẫu vector sinh trắc học 4 tư thế gắn với tài khoản.
            </p>
          </div>
        </div>
      </nav>

      {/* ACTIVE SUB-PAGE RENDER */}
      <main>
        {activeTab === 'ADMIN' && currentUser.system_role === 'ADMIN' && (
          <AdminUsers token={token} />
        )}

        {activeTab === 'CLASSES' && (currentUser.system_role === 'TEACHER' || currentUser.system_role === 'ADMIN') && (
          <TeacherClasses token={token} />
        )}

        {activeTab === 'EKYC' && (
          <StudentEkyc currentUser={currentUser} token={token} onEkycDone={() => {
            const updated = { ...currentUser, ekyc_completed: true }
            setCurrentUser(updated)
            localStorage.setItem('user', JSON.stringify(updated))
          }} />
        )}
      </main>
    </div>
  )
}
