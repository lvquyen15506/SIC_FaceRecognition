import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function TeacherClasses({ token }) {
  const [classes, setClasses] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [studentsInClass, setStudentsInClass] = useState([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Form states
  const [classCode, setClassCode] = useState('')
  const [className, setClassName] = useState('')
  const [addTeacherId, setAddTeacherId] = useState('')
  const [addStudentId, setAddStudentId] = useState('')
  const [studentRole, setStudentRole] = useState('STUDENT')

  // Attendance upload states
  const [attendanceTitle, setAttendanceTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [attendanceResult, setAttendanceResult] = useState(null)
  const [uploading, setUploading] = useState(false)

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  const fetchClasses = async () => {
    try {
      const res = await axios.get('/api/classes', config)
      setClasses(res.data.classrooms || [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users', config)
      setAllUsers(res.data.users || [])
    } catch (e) {
      // Non-admin might fail, ignore
    }
  }

  useEffect(() => {
    fetchClasses()
    fetchAllUsers()
  }, [])

  const handleCreateClass = async (e) => {
    e.preventDefault()
    setMsg(''); setErr('')
    try {
      const res = await axios.post('/api/classes', { class_code: classCode, class_name: className }, config)
      setMsg(res.data.message)
      setClassCode('')
      setClassName('')
      fetchClasses()
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi tạo lớp học')
    }
  }

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls)
    setAttendanceResult(null)
    try {
      const res = await axios.get(`/api/classes/${cls.id}/students`, config)
      setStudentsInClass(res.data.students || [])
    } catch (e) {
      setStudentsInClass([])
    }
  }

  const handleAddCoTeacher = async () => {
    if (!addTeacherId || !selectedClass) return
    setMsg(''); setErr('')
    try {
      const res = await axios.post(`/api/classes/${selectedClass.id}/co-teachers`, { teacher_id: addTeacherId }, config)
      setMsg(res.data.message)
      setAddTeacherId('')
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi thêm Giảng viên phụ')
    }
  }

  const handleAddStudent = async () => {
    if (!addStudentId || !selectedClass) return
    setMsg(''); setErr('')
    try {
      const res = await axios.post(`/api/classes/${selectedClass.id}/students`, {
        student_id: addStudentId,
        student_class_role: studentRole,
        permissions: studentRole === 'MONITOR' ? ['CAN_UPLOAD_ATTENDANCE', 'CAN_VIEW_REPORTS'] : ['CAN_VIEW_SELF']
      }, config)

      setMsg(res.data.message)
      setAddStudentId('')
      handleSelectClass(selectedClass)
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi thêm Sinh viên vào lớp')
    }
  }

  const handleProcessAttendance = async (e) => {
    e.preventDefault()
    if (!selectedFile || !selectedClass) return
    setUploading(true); setMsg(''); setErr('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('classroom_id', selectedClass.id)
    formData.append('title', attendanceTitle || `Điểm danh Buổi ${new Date().toLocaleDateString()}`)

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
      setErr(e.response?.data?.error || 'Lỗi xử lý ảnh điểm danh AI')
    } finally {
      setUploading(false)
    }
  }

  const handleToggleRecord = async (recordId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    try {
      const res = await axios.put(`/api/attendance/records/${recordId}/toggle`, { status: nextStatus }, config)
      setMsg(res.data.message)
      
      // Local state update
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
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ color: '#00ff66', marginBottom: '16px' }}>👨‍🏫 QUẢN LÝ LỚP HỌC & ĐIỂM DANH TỰ ĐỘNG AI</h2>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* LEFT COLUMN: CREATE CLASS & CLASS LIST */}
        <div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '24px' }}>
            <h3 style={{ color: '#00ff66', marginTop: 0 }}>➕ Tạo Lớp Học Mới</h3>
            <form onSubmit={handleCreateClass}>
              <input type="text" placeholder="Mã Lớp (VD: INT1340_01)" value={classCode} onChange={e => setClassCode(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="Tên Môn Học (VD: Nhập môn AI)" value={className} onChange={e => setClassName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' }} />
              <button type="submit" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 700, cursor: 'pointer' }}>TẠO LỚP HỌC</button>
            </form>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ color: '#ffffff', marginTop: 0 }}>📚 Lớp Học Của Bạn ({classes.length})</h3>
            {classes.map(c => (
              <div key={c.id} onClick={() => handleSelectClass(c)} style={{
                padding: '14px', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer',
                background: selectedClass?.id === c.id ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255,255,255,0.02)',
                border: selectedClass?.id === c.id ? '1px solid #00ff66' : '1px solid rgba(255,255,255,0.05)'
              }}>
                <strong style={{ color: '#00f0ff' }}>[{c.class_code}] {c.class_name}</strong><br/>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Chủ nhiệm: {c.primary_teacher_name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: CLASS DETAILS, CO-TEACHERS, STUDENTS & ATTENDANCE UPLOAD */}
        {selectedClass ? (
          <div>
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0, 255, 102, 0.3)', marginBottom: '24px' }}>
              <h3 style={{ color: '#00ff66', marginTop: 0 }}>🏫 Chi Tiết Lớp: [{selectedClass.class_code}] {selectedClass.class_name}</h3>

              {/* ADD CO-TEACHER & ADD STUDENT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#00f0ff', fontSize: '14px' }}>👨‍🏫 Thêm Giảng Viên Phụ (Co-Teacher):</h4>
                  <select value={addTeacherId} onChange={e => setAddTeacherId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1e293b', color: '#fff', marginBottom: '8px' }}>
                    <option value="">-- Chọn Giảng viên --</option>
                    {allUsers.filter(u => u.system_role === 'TEACHER' || u.system_role === 'ADMIN').map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>
                    ))}
                  </select>
                  <button onClick={handleAddCoTeacher} style={{ width: '100%', padding: '6px', background: '#00f0ff', color: '#000', fontWeight: 600, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Thêm Co-Teacher</button>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#00ff66', fontSize: '14px' }}>👨‍🎓 Thêm Sinh Viên & Gán Vai Trò:</h4>
                  <select value={addStudentId} onChange={e => setAddStudentId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1e293b', color: '#fff', marginBottom: '8px' }}>
                    <option value="">-- Chọn Sinh viên --</option>
                    {allUsers.filter(u => u.system_role === 'STUDENT').map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.student_id_code || 'Chưa có MSSV'})</option>
                    ))}
                  </select>

                  <select value={studentRole} onChange={e => setStudentRole(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1e293b', color: '#fff', marginBottom: '8px' }}>
                    <option value="STUDENT">Sinh viên Thường</option>
                    <option value="MONITOR">⭐ Lớp trưởng (Được Upload Điểm danh)</option>
                  </select>
                  <button onClick={handleAddStudent} style={{ width: '100%', padding: '6px', background: '#00ff66', color: '#000', fontWeight: 600, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Thêm Vào Lớp</button>
                </div>
              </div>
            </div>

            {/* ATTENDANCE UPLOAD SECTION */}
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.3)', marginBottom: '24px' }}>
              <h3 style={{ color: '#00f0ff', marginTop: 0 }}>📸 UPLOAD ẢNH TẬP THỂ ĐỂ AI ĐIỂM DANH</h3>
              <form onSubmit={handleProcessAttendance}>
                <input type="text" placeholder="Tiêu đề phiên (VD: Điểm danh Buổi 5 - Nhận diện khuôn mặt)" value={attendanceTitle} onChange={e => setAttendanceTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' }} />
                
                <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} required style={{ marginBottom: '16px', display: 'block', color: '#cbd5e1' }} />
                
                <button type="submit" disabled={uploading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00f0ff 0%, #7000ff 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {uploading ? '⚡ AI Đang Phân Tích Khuôn Mặt...' : '🚀 XỬ LÝ ĐIỂM DANH & XUẤT CSV'}
                </button>
              </form>
            </div>

            {/* ATTENDANCE RESULTS TABLE & MANUAL TOGGLE */}
            {attendanceResult && (
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid #00ff66' }}>
                <h3 style={{ color: '#00ff66', marginTop: 0 }}>🎉 Kết Quả Điểm Danh: {attendanceResult.csv_filename}</h3>
                <p style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  Bạn có thể click vào nút trạng thái bên dưới để **Tích sửa Có mặt / Vắng mặt bằng tay** nếu cần!
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', marginTop: '16px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#00f0ff' }}>
                      <th style={{ padding: '8px' }}>Tên Sinh Viên</th>
                      <th style={{ padding: '8px' }}>Trạng Thái AI</th>
                      <th style={{ padding: '8px' }}>Độ Tin Cậy %</th>
                      <th style={{ padding: '8px' }}>Tích Sửa Bằng Tay</th>
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
            )}
          </div>
        ) : (
          <div style={{ padding: '40px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)', textAlign: 'center', color: '#94a3b8' }}>
            👈 Vui lòng chọn một Lớp học bên trái để xem chi tiết, thêm Giảng viên/Sinh viên và chạy điểm danh AI!
          </div>
        )}
      </div>
    </div>
  )
}
