import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function ReportView({ token }) {
  const [classes, setClasses] = useState([])

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  useEffect(() => {
    axios.get('/api/classes', config)
      .then(res => setClasses(res.data.classrooms || []))
      .catch(err => console.error(err))
  }, [])

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '28px', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
      <h2 style={{ color: '#00f0ff', marginTop: 0 }}>📜 BÁO CÁO PHIÊN ĐIỂM DANH & XUẤT FILE CSV</h2>
      <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
        Quản lý các Báo cáo Phiên điểm danh theo tên file định dạng: <code>DiemDanh_[TenLop]_[TieuDe]_[NgayGio].csv</code>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {classes.map(c => (
          <div key={c.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: '#00ff66', margin: '0 0 6px 0' }}>[{c.class_code}] {c.class_name}</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Chủ nhiệm: {c.primary_teacher_name}</p>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#00f0ff' }}>
              📊 Đã sẵn sàng xuất báo cáo tổng hợp CSV
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
