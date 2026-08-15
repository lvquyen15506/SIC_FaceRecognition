import React from 'react'

export default function Sidebar({ activeTab, setActiveTab, currentUser }) {
  const isTeacherOrAdmin = currentUser?.system_role === 'TEACHER' || currentUser?.system_role === 'ADMIN'
  const isAdmin = currentUser?.system_role === 'ADMIN'

  const navItems = [
    { id: 'ADMIN', label: '👑 Admin Quản Lý Tài Khoản', show: isAdmin, color: '#00f0ff' },
    { id: 'CLASSES', label: '🏫 Quản Lý Lớp & Sinh Viên', show: isTeacherOrAdmin, color: '#00ff66' },
    { id: 'ATTENDANCE', label: '📸 Điểm Danh AI (Ảnh & Video)', show: isTeacherOrAdmin, color: '#00ff66' },
    { id: 'REPORTS', label: '📜 Báo Cáo Sessions & Export CSV', show: true, color: '#00f0ff' },
    { id: 'EKYC', label: '👤 Hồ Sơ Sinh Trắc Học eKYC', show: true, color: '#ff3366' },
  ]

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ padding: '0 8px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
        ⚙️ ĐIỀU HƯỚNG DASHBOARD
      </div>

      {navItems.filter(item => item.show).map(item => {
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '10px',
              border: isActive ? `1px solid ${item.color}` : '1px solid transparent',
              background: isActive ? `${item.color}15` : 'transparent',
              color: isActive ? item.color : '#cbd5e1',
              fontWeight: isActive ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
