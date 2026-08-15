import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function ReportView({ token }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/attendance/sessions', config)
      setSessions(res.data.sessions || [])
    } catch (e) {
      console.error('Error fetching sessions:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  return (
    <div style={{ marginTop: '12px' }}>
      <h2 style={{ color: '#00f0ff', marginBottom: '16px', fontSize: '22px' }}>
        📜 PHÂN LOẠI BÁO CÁO PHIÊN ĐIỂM DANH & FILE CSV THEO TIÊU ĐỀ
      </h2>
      <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px' }}>
        Toàn bộ dữ liệu điểm danh (Ảnh, Video MP4 & Trực tiếp Camera) được lưu trữ phân loại theo từng <strong>Tiêu đề phiên</strong> và <strong>Lớp học</strong>.
      </p>

      {loading ? (
        <div style={{ color: '#00ff66', textAlign: 'center', padding: '40px' }}>⚡ Đang nạp danh sách Báo cáo phiên điểm danh...</div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: '30px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)', textAlign: 'center', color: '#94a3b8' }}>
          📂 Chưa có Phiên điểm danh nào được lưu. Bạn có thể sang mục <strong>"📸 Điểm Danh AI"</strong> để thực hiện phiên điểm danh mới!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {sessions.map(s => (
            <div
              key={s.id}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ color: '#00ff66', margin: 0, fontSize: '16px' }}>
                    📌 {s.title || 'Phiên Điểm Danh Không Tiêu Đề'}
                  </h3>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px',
                    background: s.session_type === 'LIVE_CAMERA' ? 'rgba(255, 170, 0, 0.2)' : 'rgba(0, 240, 255, 0.2)',
                    color: s.session_type === 'LIVE_CAMERA' ? '#ffaa00' : '#00f0ff',
                    border: s.session_type === 'LIVE_CAMERA' ? '1px solid #ffaa00' : '1px solid #00f0ff'
                  }}>
                    {s.session_type === 'LIVE_CAMERA' ? '🎥 CAM TRỰC TIẾP' : '📂 TỆP UPLOAD'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
                  🏫 Lớp: <strong>[{s.classroom?.class_code}] {s.classroom?.class_name}</strong>
                </div>

                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                  🕒 Thời gian: {new Date(s.created_at).toLocaleString('vi-VN')}
                </div>

                {s.media_proof_path && (
                  <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <img
                      src={`/api/attendance/proof/${s.media_proof_path.split('/').pop()}`}
                      alt="Ảnh minh chứng AI"
                      style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}

                <div style={{ fontSize: '13px', color: '#00f0ff', marginBottom: '14px' }}>
                  👥 Kết quả: <strong style={{ color: '#00ff66' }}>{s.records?.filter(r => r.status === 'PRESENT').length || 0} Có mặt</strong> / <strong style={{ color: '#ff3366' }}>{s.records?.filter(r => r.status === 'ABSENT').length || 0} Vắng</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => setSelectedSession(selectedSession?.id === s.id ? null : s)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #00f0ff', background: 'rgba(0,240,255,0.1)', color: '#00f0ff', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                >
                  {selectedSession?.id === s.id ? '🔼 Đóng Chi Tiết' : '📜 Xem Chi Tiết SV'}
                </button>

                <button
                  onClick={() => window.alert(`File CSV báo cáo đã lưu tại CSDL server!`)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                >
                  📥 Tải CSV Báo Cáo
                </button>
              </div>

              {selectedSession?.id === s.id && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 style={{ color: '#00f0ff', margin: '0 0 10px 0', fontSize: '14px' }}>📋 Danh Sách Điểm Danh Chi Tiết:</h4>
                  <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#00ff66' }}>
                          <th style={{ padding: '6px' }}>Sinh Viên</th>
                          <th style={{ padding: '6px' }}>Trạng Thái</th>
                          <th style={{ padding: '6px' }}>% Tin Cậy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.records?.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '6px' }}>{r.student_name}</td>
                            <td style={{ padding: '6px' }}>
                              {r.status === 'PRESENT' ? <span style={{ color: '#00ff66', fontWeight: 700 }}>✅ CÓ MẶT</span> : <span style={{ color: '#ff3366' }}>❌ VẮNG MẶT</span>}
                            </td>
                            <td style={{ padding: '6px' }}>{r.confidence_score?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
