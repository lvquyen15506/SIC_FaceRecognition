import React from 'react'

export default function Navbar({ currentUser, onLogout }) {
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN': return '#00f0ff'
      case 'TEACHER': return '#00ff66'
      case 'STUDENT': return '#ff3366'
      default: return '#94a3b8'
    }
  }

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(12px)',
      padding: '16px 24px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ fontSize: '28px' }}>🏫</div>
        <div>
          <h2 style={{ color: '#00f0ff', margin: 0, fontSize: '20px', fontWeight: 700 }}>
            SIC FaceViT Portal
          </h2>
          <p style={{ color: '#94a3b8', margin: '2px 0 0 0', fontSize: '12px' }}>
            Hệ thống eKYC & Điểm danh AI Commercial-Grade
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
            {currentUser?.full_name}
          </div>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            Vai trò: <span style={{ color: getRoleBadgeColor(currentUser?.system_role), fontWeight: 700 }}>
              {currentUser?.system_role}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: 'rgba(255, 51, 102, 0.2)',
            border: '1px solid #ff3366',
            color: '#ff6688',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
          }}
        >
          🚪 Đăng Xuất
        </button>
      </div>
    </header>
  )
}
