import React, { useState } from 'react'

export default function App() {
  const [role, setRole] = useState('ADMIN')

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
      }}>
        <h1 style={{ color: '#00f0ff', margin: 0 }}>🏫 SIC FaceViT — Commercial Web Dashboard</h1>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>
          Hệ thống Điểm danh AI & eKYC Sinh trắc học đa phân quyền (Admin / Teacher / Student)
        </p>
      </header>

      <main style={{ marginTop: '32px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 240, 255, 0.2)'
          }}>
            <h3 style={{ color: '#00f0ff' }}>👑 System Admin</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
              Tạo tài khoản, gán vai trò ADMIN / TEACHER / STUDENT và giám sát toàn bộ hệ thống.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 102, 0.2)'
          }}>
            <h3 style={{ color: '#00ff66' }}>👨‍🏫 Giảng Viên (Teacher)</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
              Quản lý Lớp học, Thêm Giảng viên phụ, Điểm danh Upload Ảnh/Video & Xuất CSV.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 51, 102, 0.2)'
          }}>
            <h3 style={{ color: '#ff3366' }}>👨‍🎓 Sinh Viên & eKYC</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
              Thực hiện eKYC 120 mẫu sinh trắc học 4 tư thế và hỗ trợ điểm danh nếu làm Lớp trưởng.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
