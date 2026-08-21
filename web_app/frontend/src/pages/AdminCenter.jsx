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

  // User Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Class Modal States & Filters
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSearchTerm, setClassSearchTerm] = useState('');

  const [classFormData, setClassFormData] = useState({
    class_name: '',
    subject_topic: '',
    teacher_id: ''
  });

  const [editClassFormData, setEditClassFormData] = useState({
    class_name: '',
    subject_topic: '',
    teacher_id: ''
  });

  const [classMembers, setClassMembers] = useState({ teachers: [], students: [] });
  const [memberActiveTab, setMemberActiveTab] = useState('TEACHERS');
  const [newMemberInput, setNewMemberInput] = useState('');
  const [addMemberMsg, setAddMemberMsg] = useState('');

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

  // Class CRUD Handlers
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        class_name: classFormData.class_name,
        subject_topic: classFormData.subject_topic,
        teacher_id: classFormData.teacher_id ? Number(classFormData.teacher_id) : null
      };
      const res = await fetch('/api/v1/admin/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Lỗi khi tạo lớp học');
        return;
      }
      alert('🎉 Tạo lớp học mới thành công!');
      setIsCreateClassModalOpen(false);
      setClassFormData({ class_name: '', subject_topic: '', teacher_id: '' });
      fetchClasses();
      fetchAuditLogs();
    } catch (err) {
      alert('Lỗi kết nối khi tạo lớp học!');
    }
  };

  const openEditClassModal = (cls) => {
    setSelectedClass(cls);
    setEditClassFormData({
      class_name: cls.class_name,
      subject_topic: cls.subject_topic,
      teacher_id: cls.created_by_teacher_id || ''
    });
    setIsEditClassModalOpen(true);
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      const payload = {
        class_name: editClassFormData.class_name,
        subject_topic: editClassFormData.subject_topic,
        teacher_id: editClassFormData.teacher_id ? Number(editClassFormData.teacher_id) : null
      };
      const res = await fetch(`/api/v1/admin/classes/${selectedClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Không thể cập nhật lớp học');
        return;
      }
      alert('🎉 Cập nhật lớp học thành công!');
      setIsEditClassModalOpen(false);
      fetchClasses();
      fetchAuditLogs();
    } catch (err) {
      alert('Lỗi kết nối khi cập nhật lớp học!');
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA LỚP HỌC "${cls.class_name}" (${cls.class_code})?\n\nThao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu điểm danh và danh sách sinh viên/giảng viên trong lớp!`)) return;
    try {
      const res = await fetch(`/api/v1/admin/classes/${cls.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Không thể xóa lớp học');
        return;
      }
      alert(data.message);
      fetchClasses();
      fetchAuditLogs();
    } catch (err) {
      alert('Lỗi kết nối khi xóa lớp học!');
    }
  };

  // Class Member Management Handlers
  const openMembersModal = async (cls) => {
    setSelectedClass(cls);
    setNewMemberInput('');
    setAddMemberMsg('');
    setIsMembersModalOpen(true);
    fetchClassMembers(cls.id);
  };

  const fetchClassMembers = async (classId) => {
    try {
      const res = await fetch(`/api/v1/admin/classes/${classId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassMembers(data);
      }
    } catch (err) {}
  };

  const handleAddTeacherToClass = async (e) => {
    e.preventDefault();
    if (!newMemberInput.trim() || !selectedClass) return;
    setAddMemberMsg('');
    try {
      const res = await fetch(`/api/v1/admin/classes/${selectedClass.id}/add-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_code_or_email: newMemberInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMemberMsg(`❌ ${data.detail || 'Lỗi khi thêm Giảng viên'}`);
        return;
      }
      setAddMemberMsg(`✅ ${data.message}`);
      setNewMemberInput('');
      fetchClassMembers(selectedClass.id);
      fetchClasses();
    } catch (err) {
      setAddMemberMsg('❌ Lỗi kết nối máy chủ');
    }
  };

  const handleRemoveTeacherFromClass = async (teacherId) => {
    if (!selectedClass) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa Giảng viên này khỏi lớp học?')) return;
    try {
      const res = await fetch(`/api/v1/admin/classes/${selectedClass.id}/remove-teacher/${teacherId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Lỗi khi xóa Giảng viên khỏi lớp');
        return;
      }
      fetchClassMembers(selectedClass.id);
      fetchClasses();
    } catch (err) {}
  };

  const handleAddStudentToClass = async (e) => {
    e.preventDefault();
    if (!newMemberInput.trim() || !selectedClass) return;
    setAddMemberMsg('');
    try {
      const res = await fetch(`/api/v1/admin/classes/${selectedClass.id}/add-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_code_or_email: newMemberInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMemberMsg(`❌ ${data.detail || 'Lỗi khi thêm Sinh viên'}`);
        return;
      }
      setAddMemberMsg(`✅ ${data.message}`);
      setNewMemberInput('');
      fetchClassMembers(selectedClass.id);
      fetchClasses();
    } catch (err) {
      setAddMemberMsg('❌ Lỗi kết nối máy chủ');
    }
  };

  const handleRemoveStudentFromClass = async (studentId) => {
    if (!selectedClass) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa Sinh viên này khỏi lớp học?')) return;
    try {
      const res = await fetch(`/api/v1/admin/classes/${selectedClass.id}/remove-student/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Lỗi khi xóa Sinh viên khỏi lớp');
        return;
      }
      fetchClassMembers(selectedClass.id);
      fetchClasses();
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase font-mono font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Mã Số</th>
                  <th className="p-3.5">Họ và Tên</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Vai Trò</th>
                  <th className="p-3.5">Trạng Thái</th>
                  <th className="p-3.5">Dữ Liệu Khuôn Mặt</th>
                  <th className="p-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <td className="p-3.5 font-mono text-slate-500">#{u.id}</td>
                      <td className="p-3.5 font-mono text-purple-600 dark:text-purple-400 font-bold">{u.code}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {u.full_name || <span className="text-slate-400 italic font-normal">Chưa cập nhật</span>}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm ${
                          u.role === 'ADMIN' ? 'bg-purple-600 text-white' :
                          u.role === 'TEACHER' ? 'bg-blue-600 text-white' :
                          'bg-slate-600 text-white'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm ${
                          u.is_active ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {u.is_active ? 'KÍCH HOẠT' : 'KHÓA'}
                        </span>
                      </td>

                      {/* Face Biometrics Status Badge */}
                      <td className="p-3.5">
                        {u.has_face_data ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 flex items-center gap-1.5 w-fit shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đã Có DL ({u.face_angles_count} góc)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 w-fit shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                            Chưa Có DL
                          </span>
                        )}
                      </td>

                      {/* Standardized Compact Action Buttons */}
                      <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg shadow-sm transition"
                          title="Sửa thông tin"
                        >
                          ✏️ Sửa
                        </button>

                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg shadow-sm transition"
                          title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {u.is_active ? '🔒 Khóa' : '🔓 Mở'}
                        </button>

                        {/* Reset Face Button: ONLY active if has_face_data is True */}
                        {u.has_face_data ? (
                          <button
                            onClick={() => handleResetFace(u)}
                            className="px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg shadow-sm transition"
                            title="Reset dữ liệu khuôn mặt"
                          >
                            🔄 Reset Mặt
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-not-allowed opacity-60"
                            title="Chưa có dữ liệu khuôn mặt để reset"
                          >
                            Chưa có DL
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg shadow-sm transition"
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Hiển thị từ <strong className="text-slate-900 dark:text-white font-bold font-mono">{totalUsers > 0 ? (page - 1) * pageSize + 1 : 0}</strong> đến <strong className="text-slate-900 dark:text-white font-bold font-mono">{Math.min(page * pageSize, totalUsers)}</strong> trên tổng số <strong className="text-slate-900 dark:text-white font-bold font-mono">{totalUsers}</strong> tài khoản
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  page === 1 ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ◀ Trước
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-purple-600/10 text-purple-700 dark:text-purple-300 border border-purple-600/20 font-bold font-mono">
                Trang {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  page >= totalPages ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
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
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
          {/* Header Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm theo Mã lớp, Tên lớp, Môn học..."
                value={classSearchTerm}
                onChange={(e) => setClassSearchTerm(e.target.value)}
                className="w-full md:w-80 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <span className="text-xs text-slate-400 font-mono-grotesk whitespace-nowrap">
                Tổng cộng: <strong className="text-purple-400">{classes.length}</strong> lớp
              </span>
            </div>

            <button
              onClick={() => {
                setClassFormData({ class_name: '', subject_topic: '', teacher_id: '' });
                setIsCreateClassModalOpen(true);
              }}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition"
            >
              <span>➕ Tạo Lớp Học Mới</span>
            </button>
          </div>

          {/* Classes Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes
              .filter(cls => {
                if (!classSearchTerm) return true;
                const kw = classSearchTerm.toLowerCase();
                return (cls.class_name || '').toLowerCase().includes(kw) ||
                       (cls.class_code || '').toLowerCase().includes(kw) ||
                       (cls.subject_topic || '').toLowerCase().includes(kw);
              })
              .map((cls) => (
                <div key={cls.id} className="p-5 rounded-2xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 transition space-y-4 flex flex-col justify-between shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-600/10 px-2.5 py-1 rounded-lg border border-purple-600/20">
                        🔑 {cls.class_code}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        ID: #{cls.id}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900 dark:text-white line-clamp-1">{cls.class_name}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                        📚 {cls.subject_topic}
                      </p>
                    </div>

                    {/* Teachers List & Co-teaching Info */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs shadow-sm">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">👨‍🏫 Giảng Viên Quản Lý:</p>
                      {cls.primary_teacher ? (
                        <div className="flex items-center justify-between text-slate-900 dark:text-slate-200">
                          <span className="font-bold text-purple-700 dark:text-purple-300">⭐ {cls.primary_teacher.full_name}</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">({cls.primary_teacher.code})</span>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">Chưa gán GV chủ nhiệm</p>
                      )}

                      {cls.co_teachers && cls.co_teachers.length > 1 && (
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          + {cls.co_teachers.length - 1} Giảng viên đồng quản lý
                        </div>
                      )}
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Sinh Viên</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{cls.students_count || 0}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Buổi Điểm Danh</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">{cls.sessions_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* High Contrast Solid Actions Bar */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => openMembersModal(cls)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      👥 Thành Viên
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditClassModal(cls)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition"
                        title="Sửa lớp học"
                      >
                        ✏️ Sửa
                      </button>

                      <button
                        onClick={() => handleDeleteClass(cls)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition"
                        title="Xóa vĩnh viễn lớp"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Audit Logs Management */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Nhật Ký Hoạt Động Hệ Thống (Audit Logs)</h3>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            >
              🔄 Tải Lại Nhật Ký
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-slate-500 text-sm italic">Chưa có nhật ký hoạt động nào được ghi nhận.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase font-mono font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Thời Gian</th>
                    <th className="p-3.5">Người Thực Hiện</th>
                    <th className="p-3.5">Hành Động</th>
                    <th className="p-3.5">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                  {auditLogs.map((log) => {
                    const formatLogDetails = (detailsStr) => {
                      if (!detailsStr || detailsStr === '-') return '-';
                      try {
                        const obj = typeof detailsStr === 'string' ? JSON.parse(detailsStr) : detailsStr;
                        if (typeof obj === 'object' && obj !== null) {
                          return Object.entries(obj)
                            .map(([k, v]) => {
                              const keyName = k === 'role' ? 'Vai trò' : k === 'code' ? 'Mã' : k === 'class_id' ? 'ID Lớp' : k;
                              return `${keyName}: ${v}`;
                            })
                            .join(' • ');
                        }
                        return String(detailsStr);
                      } catch (e) {
                        return String(detailsStr);
                      }
                    };

                    const formattedDetails = formatLogDetails(log.details);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                        <td className="p-3.5 font-mono text-slate-500">#{log.id}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{log.timestamp}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {log.user_info ? (
                            <span>
                              {log.user_info.full_name ? (
                                <>
                                  {log.user_info.full_name} <span className="text-slate-500 dark:text-slate-400 font-mono text-xs ml-1">({log.user_info.code})</span>
                                </>
                              ) : (
                                <span className="font-mono text-slate-800 dark:text-slate-200">{log.user_info.code}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">Hệ thống</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-600 text-white shadow-sm">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 max-w-sm truncate" title={formattedDetails}>
                          {formattedDetails}
                        </td>
                      </tr>
                    );
                  })}
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
      {/* CREATE CLASS MODAL */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕ Tạo Lớp Học Mới</span>
              </h3>
              <button
                onClick={() => setIsCreateClassModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: K20 - Thị Giác Máy Tính Advanced"
                  value={classFormData.class_name}
                  onChange={(e) => setClassFormData({ ...classFormData, class_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Chủ Đề / Môn Học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: FaceViT & Deep Learning Enterprise"
                  value={classFormData.subject_topic}
                  onChange={(e) => setClassFormData({ ...classFormData, subject_topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Giảng Viên Chủ Nhiệm Ban Đầu</label>
                <select
                  value={classFormData.teacher_id}
                  onChange={(e) => setClassFormData({ ...classFormData, teacher_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Mặc định (Gán cho Admin hiện tại) --</option>
                  {users
                    .filter(u => u.role === 'TEACHER' || u.role === 'ADMIN')
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.code} - {t.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateClassModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Tạo Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {isEditClassModalOpen && selectedClass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️ Sửa Lớp Học: {selectedClass.class_code}</span>
              </h3>
              <button
                onClick={() => setIsEditClassModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  value={editClassFormData.class_name}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, class_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Chủ Đề / Môn Học *</label>
                <input
                  type="text"
                  required
                  value={editClassFormData.subject_topic}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, subject_topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Giảng Viên Chủ Nhiệm</label>
                <select
                  value={editClassFormData.teacher_id}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, teacher_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Giữ nguyên / Chọn Giảng viên mới --</option>
                  {users
                    .filter(u => u.role === 'TEACHER' || u.role === 'ADMIN')
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.code} - {t.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditClassModalOpen(false)}
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

      {/* MANAGE CLASS MEMBERS MODAL (TEACHERS & STUDENTS) */}
      {isMembersModalOpen && selectedClass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-3xl space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono-grotesk font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {selectedClass.class_code}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Quản Lý Thành Viên: {selectedClass.class_name}
                </h3>
              </div>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* Sub Tabs: Teachers vs Students */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
              <button
                onClick={() => { setMemberActiveTab('TEACHERS'); setNewMemberInput(''); setAddMemberMsg(''); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  memberActiveTab === 'TEACHERS' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                👨‍🏫 Giảng Viên Đồng Quản Lý ({classMembers.teachers?.length || 0})
              </button>
              <button
                onClick={() => { setMemberActiveTab('STUDENTS'); setNewMemberInput(''); setAddMemberMsg(''); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  memberActiveTab === 'STUDENTS' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🎓 Danh Sách Sinh Viên ({classMembers.students?.length || 0})
              </button>
            </div>

            {/* Status Message */}
            {addMemberMsg && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200">
                {addMemberMsg}
              </div>
            )}

            {/* TAB 1: TEACHERS MANAGEMENT */}
            {memberActiveTab === 'TEACHERS' && (
              <div className="space-y-4">
                {/* Form Add Teacher */}
                <form onSubmit={handleAddTeacherToClass} className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nhập Mã Giảng Viên (MGV) hoặc Email..."
                    value={newMemberInput}
                    onChange={(e) => setNewMemberInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                  >
                    <span>➕ Thêm Giảng Viên</span>
                  </button>
                </form>

                {/* Teachers Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono-grotesk uppercase">
                      <tr>
                        <th className="p-3">Mã GV</th>
                        <th className="p-3">Họ và Tên</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Vai Trò Lớp</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(!classMembers.teachers || classMembers.teachers.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            Chưa có Giảng viên đồng quản lý nào.
                          </td>
                        </tr>
                      ) : (
                        classMembers.teachers.map((t) => {
                          const isPrimary = selectedClass.created_by_teacher_id === t.id;
                          return (
                            <tr key={t.id} className="hover:bg-slate-800/40">
                              <td className="p-3 font-mono-grotesk font-bold text-purple-400">{t.code}</td>
                              <td className="p-3 font-semibold text-white">{t.full_name}</td>
                              <td className="p-3 text-slate-400">{t.email}</td>
                              <td className="p-3">
                                {isPrimary ? (
                                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    ⭐ CHỦ NHIỆM
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                    🤝 ĐỒNG QUẢN LÝ
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRemoveTeacherFromClass(t.id)}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[11px] font-medium transition"
                                >
                                  🗑️ Xóa Khỏi Lớp
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: STUDENTS MANAGEMENT */}
            {memberActiveTab === 'STUDENTS' && (
              <div className="space-y-4">
                {/* Form Add Student */}
                <form onSubmit={handleAddStudentToClass} className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nhập Mã Sinh Viên (MSSV) hoặc Email..."
                    value={newMemberInput}
                    onChange={(e) => setNewMemberInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                  >
                    <span>➕ Thêm Sinh Viên</span>
                  </button>
                </form>

                {/* Students Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono-grotesk uppercase">
                      <tr>
                        <th className="p-3">Mã SV</th>
                        <th className="p-3">Họ và Tên</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(!classMembers.students || classMembers.students.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            Chưa có Sinh viên nào trong lớp.
                          </td>
                        </tr>
                      ) : (
                        classMembers.students.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-mono-grotesk font-bold text-emerald-400">{s.code}</td>
                            <td className="p-3 font-semibold text-white">{s.full_name}</td>
                            <td className="p-3 text-slate-400">{s.email}</td>
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {s.status || 'APPROVED'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleRemoveStudentFromClass(s.id)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[11px] font-medium transition"
                              >
                                🗑️ Xóa Khỏi Lớp
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
