import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [codeOrEmail, setCodeOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code_or_email: codeOrEmail, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || 'Mã số hoặc mật khẩu không chính xác');
      } else {
        onLoginSuccess(data);
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối máy chủ backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center font-bold text-lg text-white shadow-xl shadow-blue-500/20">
            SIC
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Đăng Nhập Hệ Thống</h2>
          <p className="text-xs text-slate-400">
            Tự động chuyển hướng giao diện Sinh viên / Giảng viên / Admin
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Mã Số (MSSV / MGV) hoặc Email
            </label>
            <input
              type="text"
              required
              value={codeOrEmail}
              onChange={(e) => setCodeOrEmail(e.target.value)}
              placeholder="Nhập MSSV, Mã GV hoặc Admin Email"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Mật Khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
          </button>
        </form>

      </div>
    </div>
  );
}
