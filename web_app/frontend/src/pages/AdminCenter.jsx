import React, { useState, useEffect } from 'react';

export default function AdminCenter({ token }) {
  const [activeTab, setActiveTab] = useState('USERS');
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [classes, setClasses] = useState([]);
  const [dbHealth, setDbHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    code: '',
    full_name: '',
    password: '',
    role: 'STUDENT'
  });

  const [editFormData, setEditFormData] = useState({
    email: '',
    code: '',
    full_name: '',
    password: '',
    role: 'STUDENT'
  });

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, searchTerm, roleFilter]);

  useEffect(() => {
    fetchClasses();
    fetchDbHealth();
    fetchAuditLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const skip = (page - 1) * pageSize;
      let url = `/api/v1/admin/users?skip=${skip}&limit=${pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (roleFilter !== 'ALL') url += `&role=${encodeURIComponent(roleFilter)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data);
          setTotalUsers(data.length);
        } else {
          setUsers(data.items || []);
          setTotalUsers(data.total || 0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/v1/admin/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setClasses(await res.json());
    } catch (err) {}
  };

  const fetchDbHealth = async () => {
    try {
      const res = await fetch('/api/v1/admin/db-health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDbHealth(await res.json());
    } catch (err) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/audit-logs?skip=0&limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.items || []);
        setAuditTotal(data.total || 0);
      }
    } catch (err) {}
  };

  // Create User Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Không thể tạo người dùng');
        return;
      }
      alert('Tạo người dùng mới thành công!');
      setIsCreateModalOpen(false);
      setFormData({ email: '', code: '', full_name: '', password: '', role: 'STUDENT' });
      fetchUsers();
      fetchDbHealth();
    } catch (err) {
      alert('Lỗi kết nối khi tạo người dùng!');
    }
  };

  // Edit User Handler
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      code: user.code,
      full_name: user.full_name,
      password: '',
      role: user.role
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const body = { ...editFormData };
      if (!body.password) delete body.password; // Omit if blank

      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Không thể cập nhật người dùng');
        return;
      }
      alert('Cập nhật người dùng thành công!');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert('Lỗi kết nối khi cập nhật!');
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (user) => {
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN người dùng ${user.full_name} (${user.code})?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Không thể xóa người dùng');
        return;
      }
      alert('Đã xóa thành công người dùng!');
      fetchUsers();
      fetchDbHealth();
    } catch (err) {
      alert('Lỗi kết nối khi xóa!');
    }
  };

  // Reset Face Handler
  const handleResetFace = async (user) => {
    if (!confirm(`Bạn có chắc chắn muốn RESET dữ liệu khuôn mặt cho ${user.full_name} (${user.code})?\nThao tác này sẽ xóa toàn bộ vector khuôn mặt đã đăng ký!`)) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/reset-face`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Đã reset thành công dữ liệu khuôn mặt về "Chưa Có DL"!');
        fetchUsers();
        fetchDbHealth();
      }
    } catch (err) {}
  };

  // Toggle Active Handler
  const handleToggleActive = async (userId) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/toggle-active`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {}
  };

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
            Super Admin Control Center
          </span>
          <h2 className="text-3xl font-bold text-white mt-2">Quản Trị Tối Cao Hệ Thống</h2>
          <p className="text-sm text-slate-400 mt-1">Toàn quyền CRUD Người dùng, Reset Khuôn mặt, Lớp học &amp; Nhật ký Audit Logs</p>
        </div>

        {dbHealth && (
          <div className="glass-card p-4 rounded-2xl border border-purple-500/30 flex items-center gap-6 bg-purple-950/20">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase">Tài khoản</p>
              <p className="text-lg font-bold text-white font-mono-grotesk">{dbHealth.metrics.total_users}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase">Lớp học</p>
              <p className="text-lg font-bold text-purple-400 font-mono-grotesk">{dbHealth.metrics.total_classes}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase">Vector Mặt 512D</p>
              <p className="text-lg font-bold text-emerald-400 font-mono-grotesk">{dbHealth.metrics.total_face_vectors_512d}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'USERS' ? 'bg-purple-600 text-white shadow-lg' : 'glass-card text-slate-400 hover:text-white'
          }`}
        >
          👤 Quản Lý Người Dùng ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab('CLASSES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'CLASSES' ? 'bg-purple-600 text-white shadow-lg' : 'glass-card text-slate-400 hover:text-white'
          }`}
        >
          🏫 Quản Lý Lớp Học ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'AUDIT_LOGS' ? 'bg-purple-600 text-white shadow-lg' : 'glass-card text-slate-400 hover:text-white'
          }`}
        >
          🛡️ Nhật Ký Hệ Thống ({auditTotal})
        </button>
      </div>

      {/* Users Management */}
      {activeTab === 'USERS' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
          {/* Controls Bar: Search, Filter, Page Size, Add User Button */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="🔍 Tìm theo Mã số, Tên, Email..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Tất cả Vai trò</option>
                <option value="STUDENT">STUDENT (Sinh viên)</option>
                <option value="TEACHER">TEACHER (Giảng viên)</option>
                <option value="ADMIN">ADMIN (Quản trị viên)</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value={10}>10 dòng/trang</option>
                <option value={25}>25 dòng/trang</option>
                <option value={50}>50 dòng/trang</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition"
            >
              <span>➕ Thêm Người Dùng Mới</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono-grotesk">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Mã Số</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Vai Trò</th>
                  <th className="p-3">Trạng Thái</th>
                  <th className="p-3">Dữ Liệu Khuôn Mặt</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono-grotesk text-slate-500">#{u.id}</td>
                      <td className="p-3 font-mono-grotesk text-purple-400 font-bold">{u.code}</td>
                      <td className="p-3 font-semibold text-white">{u.full_name}</td>
                      <td className="p-3 text-slate-400">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          u.role === 'TEACHER' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {u.is_active ? 'KÍCH HOẠT' : 'KHÓA'}
                        </span>
                      </td>

                      {/* Face Biometrics Status Badge */}
                      <td className="p-3">
                        {u.has_face_data ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Đã Có DL ({u.face_angles_count} góc)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Chưa Có DL
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[11px] font-medium transition"
                          title="Sửa thông tin"
                        >
                          ✏️ Sửa
                        </button>

                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-medium transition"
                          title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {u.is_active ? '🔒 Khóa' : '🔓 Mở'}
                        </button>

                        {/* Reset Face Button: ONLY active if has_face_data is True */}
                        {u.has_face_data ? (
                          <button
                            onClick={() => handleResetFace(u)}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-medium transition"
                            title="Reset dữ liệu khuôn mặt"
                          >
                            🔄 Reset Mặt
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1 bg-slate-900 text-slate-600 border border-slate-800 rounded text-[11px] font-medium cursor-not-allowed opacity-60"
                            title="Chưa có dữ liệu khuôn mặt để reset"
                          >
                            Chưa có DL
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[11px] font-medium transition"
                          title="Xóa vĩnh viễn"
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Hiển thị từ <span className="text-white font-bold">{totalUsers > 0 ? (page - 1) * pageSize + 1 : 0}</span> đến <span className="text-white font-bold">{Math.min(page * pageSize, totalUsers)}</span> trên tổng số <span className="text-white font-bold">{totalUsers}</span> tài khoản
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  page === 1 ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                ◀ Trước
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold font-mono-grotesk">
                Trang {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  page >= totalPages ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Sau ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classes Management */}
      {activeTab === 'CLASSES' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Danh Sách Tất Cả Lớp Học ({classes.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 rounded-xl glass-card border border-slate-700/60 space-y-2">
                <span className="text-[10px] font-mono-grotesk text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {cls.class_code}
                </span>
                <h4 className="text-base font-bold text-white">{cls.class_name}</h4>
                <p className="text-xs text-slate-400">Chủ đề: {cls.subject_topic}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs Management */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white">Nhật Ký Hoạt Động Hệ Thống (Audit Logs)</h3>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition"
            >
              🔄 Tải Lại Nhật Ký
            </button>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-slate-500 text-sm">Chưa có nhật ký hoạt động nào được ghi nhận.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono-grotesk">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Thời Gian</th>
                    <th className="p-3">Người Thực Hiện</th>
                    <th className="p-3">Hành Động</th>
                    <th className="p-3">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono-grotesk text-slate-500">#{log.id}</td>
                      <td className="p-3 font-mono-grotesk text-slate-300">{log.timestamp}</td>
                      <td className="p-3 font-medium text-white">
                        {log.user_info ? (
                          <span>
                            {log.user_info.full_name} <span className="text-slate-400 font-mono-grotesk">({log.user_info.code})</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Hệ thống / Guest</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono-grotesk bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono-grotesk text-slate-400 max-w-xs truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕ Tạo Người Dùng Mới</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Mã Số (MSSV / MGV / Admin Code)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: SV260099 hoặc GV009"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@sic.edu.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Vai Trò (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="STUDENT">STUDENT (Sinh viên)</option>
                  <option value="TEACHER">TEACHER (Giảng viên)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Tạo Người Dùng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️ Sửa Người Dùng #{selectedUser.id}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Mã Số</label>
                <input
                  type="text"
                  required
                  value={editFormData.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mật khẩu Mới (Bỏ trống nếu giữ nguyên)</label>
                <input
                  type="password"
                  placeholder="•••••••• (Giữ nguyên Mật khẩu cũ)"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Vai Trò (Role)</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="STUDENT">STUDENT (Sinh viên)</option>
                  <option value="TEACHER">TEACHER (Giảng viên)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
