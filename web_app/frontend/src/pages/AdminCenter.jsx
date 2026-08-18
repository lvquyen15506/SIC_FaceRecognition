import React, { useState, useEffect } from 'react';

export default function AdminCenter({ token }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchClasses();
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

  const handleResetFace = async (userId) => {
    if (!confirm('Bạn có chắc chắn muốn reset dữ liệu khuôn mặt người dùng này?')) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/reset-face`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) alert('Đã reset thành công dữ liệu khuôn mặt!');
    } catch (err) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
            Super Admin Control Center
          </span>
          <h2 className="text-3xl font-bold text-white mt-2">Quản Trị Tối Cao Hệ Thống</h2>
          <p className="text-sm text-slate-400 mt-1">Toàn quyền quản lý Người dùng, Lớp học, Dữ liệu Sinh trắc &amp; Cấu hình</p>
        </div>
      </div>

      {/* Users Management */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white">Danh Sách Người Dùng ({users.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono-grotesk">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Mã Số</th>
                <th className="p-3">Họ và Tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Vai Trò (Role)</th>
                <th className="p-3">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono-grotesk text-slate-500">#{u.id}</td>
                  <td className="p-3 font-mono-grotesk text-slate-300">{u.code}</td>
                  <td className="p-3 font-semibold text-white">{u.full_name}</td>
                  <td className="p-3 text-slate-400">{u.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-blue-400 border border-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleResetFace(u.id)}
                      className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-medium"
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

      {/* Classes Management */}
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
    </div>
  );
}
