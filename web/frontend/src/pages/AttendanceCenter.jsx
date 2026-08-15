import React, { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

export default function AttendanceCenter({ token }) {
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)
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

  // Real-time Lightweight Frame Analysis Loop (60 FPS Native Video Stream with HTML5 Canvas Box Overlay)
  useEffect(() => {
    let interval = null
    if (isLiveStreaming && webcamRef.current) {
      interval = setInterval(async () => {
        if (!webcamRef.current) return
        const imageSrc = webcamRef.current.getScreenshot()
        if (imageSrc && selectedClassId) {
          try {
            const res = await axios.post('/api/attendance/process-live-frame', {
              image_base64: imageSrc,
              classroom_id: selectedClassId
            }, config)

            const canvas = canvasRef.current
            if (canvas) {
              const ctx = canvas.getContext('2d')
              ctx.clearRect(0, 0, canvas.width, canvas.height)

              if (res.data.detections && res.data.detections.length > 0) {
                const [fw, fh] = res.data.frame_size || [480, 360]
                const scaleX = canvas.width / fw
                const scaleY = canvas.height / fh

                res.data.detections.forEach(det => {
                  const [bx, by, bw, bh] = det.bbox
                  const x = bx * scaleX
                  const y = by * scaleY
                  const w = bw * scaleX
                  const h = bh * scaleY

                  const isMatched = det.status === 'PRESENT'
                  const color = isMatched ? '#00ff66' : '#ff3366'
                  const label = isMatched ? `${det.name} (${det.confidence.toFixed(1)}%)` : 'Người Lạ (Unregistered)'

                  // Draw 3px Neon Bounding Box
                  ctx.lineWidth = 3
                  ctx.strokeStyle = color
                  ctx.strokeRect(x, y, w, h)

                  // Draw Label Text Banner Background
                  ctx.font = 'bold 14px system-ui, sans-serif'
                  const textWidth = ctx.measureText(label).width
                  ctx.fillStyle = color
                  ctx.fillRect(x, Math.max(0, y - 28), textWidth + 16, 26)

                  // Draw Label Text (Perfect Unicode Vietnamese!)
                  ctx.fillStyle = isMatched ? '#000000' : '#ffffff'
                  ctx.fillText(label, x + 8, Math.max(18, y - 9))

                  // Accumulate recognized record
                  if (det.student_id) {
                    setLiveAccumulatedRecords(prev => ({
                      ...prev,
                      [det.student_id]: {
                        student_id: det.student_id,
                        student_name: det.name,
                        status: 'PRESENT',
                        confidence_score: det.confidence
                      }
                    }))
                  }
                })
              }
            }
          } catch (e) {
            console.error('Live frame error:', e)
          }
        }
      }, 200)
    } else {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLiveStreaming, selectedClassId])

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
    setMsg('🎥 Đang quay trực tiếp điểm danh AI với Box Xanh/Đỏ... Bấm "DỪNG QUÉT" khi hoàn tất.')
    setErr('')
    setLiveAccumulatedRecords({})
  }

  const handleStopLiveStream = async () => {
    setIsLiveStreaming(false)
    setMsg('⚡ Đang tổng hợp dữ liệu và xuất file CSV báo cáo...')

    const recordsList = Object.values(liveAccumulatedRecords)

    try {
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

      {/* MODE B: LIVE CAMERA STREAMING WITH 60 FPS WEBCAM & HTML5 CANVAS BOX OVERLAY */}
      {attendanceMode === 'LIVE_CAM' && (
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 170, 0, 0.3)', marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ color: '#ffaa00', marginTop: 0 }}>🎥 PHƯƠNG THỨC 2: QUAY ĐIỂM DANH TRỰC TIẾP BẰNG CAMERA</h3>
          <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '600px', margin: '0 auto 16px auto' }}>
            Hệ thống AI đang quét nhận diện sinh viên theo thời gian thực: <span style={{ color: '#00ff66', fontWeight: 700 }}>🔲 BOX XANH = CÓ MẶT</span>, <span style={{ color: '#ff3366', fontWeight: 700 }}>🔲 BOX ĐỎ = NGƯỜI LẠ</span>!
          </p>

          <input type="text" placeholder="Tiêu đề Phiên (VD: Điểm danh Trực tiếp Tiết 1-2)" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', maxWidth: '500px', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', marginBottom: '16px', boxSizing: 'border-box' }} />

          <div style={{ position: 'relative', margin: '0 auto 20px auto', width: '100%', maxWidth: '640px', height: '420px', borderRadius: '16px', overflow: 'hidden', border: isLiveStreaming ? '3px solid #00ff66' : '2px solid rgba(255,255,255,0.2)', boxShadow: isLiveStreaming ? '0 0 30px rgba(0, 255, 102, 0.4)' : 'none' }}>
            {/* 60 FPS NATIVE WEBCAM VIDEO STREAM */}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.5}
              width={480}
              height={360}
              mirrored={true}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* REAL-TIME HTML5 OVERLAY CANVAS FOR GREEN/RED BOXES & PERFECT UNICODE VIETNAMESE NAMES */}
            <canvas
              ref={canvasRef}
              width={640}
              height={420}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
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
