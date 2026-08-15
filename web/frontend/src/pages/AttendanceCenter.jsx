import React, { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

export default function AttendanceCenter({ token }) {
  const webcamRef = useRef(null)
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [attendanceMode, setAttendanceMode] = useState('UPLOAD') // 'UPLOAD' or 'LIVE_CAM'

  // Common Form States
  const [title, setTitle] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Upload Mode States
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [attendanceResult, setAttendanceResult] = useState(null)

  // Live Camera Mode States
  const [isLiveStreaming, setIsLiveStreaming] = useState(false)
  const [liveDetections, setLiveDetections] = useState([])
  const [liveAccumulatedRecords, setLiveAccumulatedRecords] = useState({}) // student_id -> record

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  useEffect(() => {
    axios.get('/api/classes', config)
      .then(res => {
        const clsList = res.data.classrooms || []
        setClasses(clsList)
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id)
        }
      })
      .catch(err => console.error(err))
  }, [])

  // Handle File Upload Attendance Processing
  const handleProcessUpload = async (e) => {
    e.preventDefault()
    if (!selectedClassId || !selectedFile) return
    setUploading(true); setMsg(''); setErr('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('classroom_id', selectedClassId)
    formData.append('title', title || `Điểm danh Buổi ${new Date().toLocaleDateString()}`)

    try {
      const res = await axios.post('/api/attendance/process-photo', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setAttendanceResult(res.data)
      setMsg(res.data.message)
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi xử lý tệp ảnh/video điểm danh AI')
    } finally {
      setUploading(false)
    }
  }

  // Handle Live Web Camera Streaming Attendance
  const handleStartLiveStream = () => {
    if (!selectedClassId) {
      setErr('Vui lòng chọn 1 Lớp học trước khi bật điểm danh trực tiếp')
      return
    }
    setIsLiveStreaming(true)
    setMsg('🎥 Đang quay trực tiếp điểm danh AI... Bấm nút "DỪNG QUÉT" khi hoàn tất.')
    setErr('')
    setLiveAccumulatedRecords({})
    setLiveDetections([])
  }

  const handleStopLiveStream = async () => {
    setIsLiveStreaming(false)
    setMsg('⚡ Đang tổng hợp dữ liệu và xuất file CSV báo cáo...')

    // Extract records list from live accumulated state
    const recordsList = Object.values(liveAccumulatedRecords)

    try {
      // Create session and save records
      const res = await axios.post('/api/attendance/process-photo', {
        classroom_id: selectedClassId,
        title: title || `Điểm danh Trực Tiếp - ${new Date().toLocaleTimeString()}`,
        live_records: recordsList
      }, config)

      setAttendanceResult(res.data)
      setMsg('🎉 Đã dừng quay điểm danh và xuất báo cáo CSV thành công!')
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi lưu phiên điểm danh trực tiếp')
    }
  }

  const handleToggleRecord = async (recordId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    try {
      const res = await axios.put(`/api/attendance/records/${recordId}/toggle`, { status: nextStatus }, config)
      setMsg(res.data.message)
      
      setAttendanceResult(prev => {
        if (!prev) return prev
        return {
          ...prev,
          records: prev.records.map(r => r.id === recordId ? { ...r, status: nextStatus, is_manually_edited: true } : r)
        }
      })
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi cập nhật trạng thái')
    }
  }

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId))

  return (
    <div style={{ marginTop: '12px' }}>
      <h2 style={{ color: '#00f0ff', marginBottom: '16px', fontSize: '22px' }}>📸 TRUNG TÂM ĐIỂM DANH AI (HỖ TRỢ TỆP & TRỰC TIẾP CAMERA)</h2>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {err}</div>}

      {/* STEP 1: SELECT CLASSROOM */}
      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.3)', marginBottom: '20px' }}>
        <label style={{ display: 'block', color: '#00f0ff', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
          🏫 BƯỚC 1: CHỌN LỚP HỌC ĐIỂM DANH (*):
        </label>
        <select
          value={selectedClassId}
          onChange={e => { setSelectedClassId(e.target.value); setAttendanceResult(null) }}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid #00f0ff', fontSize: '15px', fontWeight: 600 }}
        >
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              [{c.class_code}] {c.class_name} — Chủ nhiệm: {c.primary_teacher_name}
            </option>
          ))}
        </select>
      </div>

      {/* STEP 2: CHOOSE ATTENDANCE METHOD (TABS) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <button
          onClick={() => { setAttendanceMode('UPLOAD'); setAttendanceResult(null) }}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '12px',
            border: attendanceMode === 'UPLOAD' ? '2px solid #00ff66' : '1px solid rgba(255,255,255,0.1)',
            background: attendanceMode === 'UPLOAD' ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255,255,255,0.03)',
            color: attendanceMode === 'UPLOAD' ? '#00ff66' : '#cbd5e1',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📂 BƯỚC 2A: UPLOAD TỆP ĐIỂM DANH (ẢNH / VIDEO MP4)
        </button>

        <button
          onClick={() => { setAttendanceMode('LIVE_CAM'); setAttendanceResult(null) }}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '12px',
            border: attendanceMode === 'LIVE_CAM' ? '2px solid #ffaa00' : '1px solid rgba(255,255,255,0.1)',
            background: attendanceMode === 'LIVE_CAM' ? 'rgba(255, 170, 0, 0.15)' : 'rgba(255,255,255,0.03)',
            color: attendanceMode === 'LIVE_CAM' ? '#ffaa00' : '#cbd5e1',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🎥 BƯỚC 2B: QUAY TRỰC TIẾP BẰNG WEB CAMERA LỚP HỌC
        </button>
      </div>

      {/* MODE A: UPLOAD FILE FORM */}
      {attendanceMode === 'UPLOAD' && (
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0, 255, 102, 0.3)', marginBottom: '24px' }}>
          <h3 style={{ color: '#00ff66', marginTop: 0 }}>📂 PHƯƠNG THỨC 1: TẢI LÊN TỆP ẢNH HOẶC VIDEO LỚP HỌC</h3>
          
          <form onSubmit={handleProcessUpload}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Tiêu đề Phiên Điểm Danh (*):</label>
              <input type="text" placeholder="Ví dụ: Điểm danh Lớp - Buổi 5" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Chọn Tệp Ảnh (.jpg/.png) HOẶC Video (.mp4/.avi) (*):</label>
              <input type="file" accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files[0])} required style={{ color: '#cbd5e1', width: '100%' }} />
            </div>

            <button type="submit" disabled={uploading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00ff66 0%, #00f0ff 100%)', color: '#000', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
              {uploading ? '⚡ AI Đang Phân Tích & Khoanh Viền Khuôn Mặt...' : '🚀 BẮT ĐẦU QUÉT AI & XUẤT FILE CSV'}
            </button>
          </form>
        </div>
      )}

      {/* MODE B: LIVE CAMERA STREAMING FORM */}
      {attendanceMode === 'LIVE_CAM' && (
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 170, 0, 0.3)', marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ color: '#ffaa00', marginTop: 0 }}>🎥 PHƯƠNG THỨC 2: QUAY ĐIỂM DANH TRỰC TIẾP BẰNG CAMERA</h3>
          <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '600px', margin: '0 auto 16px auto' }}>
            Hệ thống AI sẽ quét nhận diện khuôn mặt sinh viên trong lớp học liên tục theo thời gian thực. Bấm <strong>"DỪNG QUÉT & XUẤT CSV"</strong> khi kết thúc tiết học!
          </p>

          <input type="text" placeholder="Tiêu đề Phiên (VD: Điểm danh Trực tiếp Tiết 1-2)" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', maxWidth: '500px', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', marginBottom: '16px', boxSizing: 'border-box' }} />

          <div style={{ margin: '0 auto 20px auto', width: '100%', maxWidth: '640px', borderRadius: '16px', overflow: 'hidden', border: isLiveStreaming ? '3px solid #ffaa00' : '2px solid rgba(255,255,255,0.2)', boxShadow: isLiveStreaming ? '0 0 30px rgba(255, 170, 0, 0.5)' : 'none' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              mirrored={true}
              style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '420px', objectFit: 'cover' }}
            />
          </div>

          {!isLiveStreaming ? (
            <button onClick={handleStartLiveStream} style={{ padding: '14px 32px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #ffaa00 0%, #ff3366 100%)', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255, 170, 0, 0.4)' }}>
              🔴 BẮT ĐẦU QUAY ĐIỂM DANH TRỰC TIẾP
            </button>
          ) : (
            <button onClick={handleStopLiveStream} style={{ padding: '14px 32px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #ff3366 0%, #7000ff 100%)', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255, 51, 102, 0.5)' }}>
              ⏹️ DỪNG QUÉT & XUẤT BÁO CÁO CSV
            </button>
          )}
        </div>
      )}

      {/* ANNOTATED PROOF OUTPUT DISPLAY & CSV REPORT DOWNLOAD */}
      {attendanceResult && (
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid #00ff66' }}>
          <h3 style={{ color: '#00ff66', marginTop: 0 }}>🎉 BÁO CÁO PHIÊN ĐIỂM DANH THÀNH CÔNG</h3>

          {attendanceResult.session?.media_proof_path && (
            <div style={{ marginBottom: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#00f0ff', margin: '0 0 10px 0' }}>🖼️ ẢNH / VIDEO MINH CHỨNG ĐÃ KHOANH TÊN AI VIỀN XANH / ĐỎ</h4>
              <img
                src={`/api/attendance/proof/${attendanceResult.session.media_proof_path.split('/').pop()}`}
                alt="Minh chứng AI"
                style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.4)' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>
              Tệp CSV đã xuất: <code style={{ color: '#00ff66', fontSize: '15px' }}>{attendanceResult.csv_filename}</code>
            </span>
            <button
              onClick={() => window.alert(`File CSV '${attendanceResult.csv_filename}' đã được lưu an toàn tại thư mục server outputs/!`)}
              style={{ background: '#00ff66', color: '#000', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              📥 TẢI VỀ FILE CSV BÁO CÁO
            </button>
          </div>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '480px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#00f0ff' }}>
                  <th style={{ padding: '10px 8px' }}>Tên Sinh Viên</th>
                  <th style={{ padding: '10px 8px' }}>Trạng Thái AI</th>
                  <th style={{ padding: '10px 8px' }}>Độ Tin Cậy %</th>
                  <th style={{ padding: '10px 8px' }}>Tích Sửa Bằng Tay</th>
                </tr>
              </thead>
              <tbody>
                {attendanceResult.records.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <strong>{r.student_name}</strong>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {r.status === 'PRESENT' ? <span style={{ color: '#00ff66', fontWeight: 700 }}>✅ CÓ MẶT</span> : r.status === 'ABSENT' ? <span style={{ color: '#ff3366' }}>❌ VẮNG MẶT</span> : <span style={{ color: '#ffaa00' }}>❓ NGƯỜI LẠ</span>}
                      {r.is_manually_edited && <span style={{ color: '#00f0ff', fontSize: '11px', marginLeft: '6px' }}>(Đã tích sửa)</span>}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{r.confidence_score.toFixed(1)}%</td>
                    <td style={{ padding: '10px 8px' }}>
                      {r.status !== 'UNREGISTERED' && (
                        <button
                          onClick={() => handleToggleRecord(r.id, r.status)}
                          style={{
                            padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 600,
                            background: r.status === 'PRESENT' ? 'rgba(255,51,102,0.2)' : 'rgba(0,255,102,0.2)',
                            color: r.status === 'PRESENT' ? '#ff6688' : '#00ff66',
                          }}
                        >
                          Đổi thành {r.status === 'PRESENT' ? '❌ Vắng mặt' : '✅ Có mặt'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
