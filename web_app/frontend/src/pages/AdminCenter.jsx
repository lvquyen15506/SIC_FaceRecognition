import React, { useState, useEffect } from 'react';

export default function AdminCenter({ token }) {
  const [activeTab, setActiveTab] = useState('USERS');
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [dbHealth, setDbHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchClasses();
    fetchDbHealth();
    fetchAuditLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {}
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

  const handleResetFace = async (userId) => {
    if (!confirm('Bạn có chắc chắn muốn reset dữ liệu khuôn mặt người dùng này?')) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/reset-face`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Đã reset thành công dữ liệu khuôn mặt!');
        fetchUsers();
        fetchDbHealth();
      }
    } catch (err) {}
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
            Super Admin Control Center
          </span>
          <h2 className="text-3xl font-bold text-white mt-2">Quản Trị Tối Cao Hệ Thống</h2>
          <p className="text-sm text-slate-400 mt-1">Toàn quyền quản lý Người dùng, Lớp học, Nhật ký Audit Logs &amp; CSDL</p>
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
          👤 Quản Lý Người Dùng ({users.length})
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
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Danh Sách Tất Cả Người Dùng ({users.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono-grotesk">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Mã Số</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Vai Trò (Role)</th>
                  <th className="p-3">Trạng Thái</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
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
                    <td className="p-3 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-medium"
                      >
                        {u.is_active ? 'Khóa' : 'Mở Khóa'}
                      </button>
                      <button
                        onClick={() => handleResetFace(u.id)}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-medium"
                      >
                        Reset Mặt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <th className="p-3">Hành Động (Action)</th>
                    <th className="p-3">Chi Tiết (Details)</th>
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
    </div>
  );
}
