import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function AdminUsers({ token }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Form states for creating new user
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('STUDENT')
  const [studentId, setStudentId] = useState('')

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/users', config)
      setUsers(res.data.users || [])
    } catch (e) {
      console.error(e)
      setErr('Không thể nạp danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setMsg('')
    setErr('')
    try {
      const res = await axios.post('/api/admin/users', {
        username: username,
        email: email,
        password: password,
        full_name: fullName,
        system_role: role,
        student_id_code: role === 'STUDENT' ? studentId : null,
      }, config)

      setMsg(res.data.message || 'Tạo tài khoản thành công!')
      setUsername('')
      setEmail('')
      setPassword('')
      setFullName('')
      setStudentId('')
      fetchUsers()
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi tạo tài khoản')
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      const res = await axios.put(`/api/admin/users/${userId}/role`, { system_role: newRole }, config)
      setMsg(res.data.message)
      fetchUsers()
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi cập nhật vai trò')
    }
  }

  const handleResetEkyc = async (userId, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa dữ liệu sinh trắc học eKYC của '${name}'?`)) return
    try {
      const res = await axios.put(`/api/admin/users/${userId}/reset-ekyc`, {}, config)
      setMsg(res.data.message)
      fetchUsers()
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi xóa eKYC')
    }
  }

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản '${name}'?`)) return
    try {
      const res = await axios.delete(`/api/admin/users/${userId}`, config)
      setMsg(res.data.message)
      fetchUsers()
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi xóa tài khoản')
    }
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ color: '#00f0ff', marginBottom: '16px' }}>👑 QUẢN TRỊ VIÊN — TẠO & PHÂN QUYỀN TÀI KHOẢN</h2>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        {/* CREATE USER FORM */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ color: '#ffffff', marginTop: 0 }}>➕ Tạo Tài Khoản Mới</h3>
          <form onSubmit={handleCreateUser}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1' }}>Username (*):</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1' }}>Email (*):</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1' }}>Mật khẩu (*):</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1' }}>Họ và Tên (*):</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1' }}>Vai trò Hệ thống (*):</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff' }}>
                <option value="STUDENT">STUDENT (Sinh viên)</option>
                <option value="TEACHER">TEACHER (Giảng viên)</option>
                <option value="ADMIN">ADMIN (Quản trị viên Tối cao)</option>
              </select>
            </div>

            {role === 'STUDENT' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1' }}>Mã Sinh Viên (Student ID):</label>
                <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Ví dụ: B20DCCN001" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
              </div>
            )}

            <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(90deg, #00f0ff 0%, #7000ff 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              🚀 TẠO TÀI KHOẢN MỚI
            </button>
          </form>
        </div>

        {/* USERS LIST TABLE */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ color: '#ffffff', marginTop: 0 }}>📜 Danh Sách Tài Khoản Toàn Trường ({users.length})</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#00f0ff' }}>
                <th style={{ padding: '8px' }}>Họ Tên / Username</th>
                <th style={{ padding: '8px' }}>Mã SV / Email</th>
                <th style={{ padding: '8px' }}>Vai Trò</th>
                <th style={{ padding: '8px' }}>eKYC</th>
                <th style={{ padding: '8px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <strong>{u.full_name}</strong><br/>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>@{u.username}</span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {u.student_id_code ? <code style={{ color: '#00ff66' }}>{u.student_id_code}</code> : u.email}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <select
                      value={u.system_role}
                      onChange={e => handleChangeRole(u.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', color: '#fff', border: '1px solid #475569' }}
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="TEACHER">TEACHER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {u.ekyc_completed ? (
                      <span style={{ color: '#00ff66', fontWeight: 600 }}>✅ Đã làm</span>
                    ) : (
                      <span style={{ color: '#ff3366' }}>⚠️ Chưa</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {u.ekyc_completed && (
                        <button
                          onClick={() => handleResetEkyc(u.id, u.full_name)}
                          title="Xóa dữ liệu sinh trắc học eKYC để chụp lại"
                          style={{ background: 'rgba(255, 170, 0, 0.2)', border: '1px solid #ffaa00', color: '#ffaa00', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          🗑️ Xóa eKYC
                        </button>
                      )}

                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          style={{ background: 'rgba(255,51,102,0.2)', border: '1px solid #ff3366', color: '#ff6688', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ❌ Xóa TK
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
