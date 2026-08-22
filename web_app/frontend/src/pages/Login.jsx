import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);

  // Login States
  const [codeOrEmail, setCodeOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register States
  const [regCode, setRegCode] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('STUDENT');

  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code_or_email: codeOrEmail.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || 'Username/Email hoặc mật khẩu không chính xác');
      } else {
        onLoginSuccess(data);
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối máy chủ backend');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail.trim(),
          code: regCode.trim(),
          full_name: regFullName.trim(),
          password: regPassword,
          role: regRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || 'Không thể đăng ký tài khoản. Vui lòng kiểm tra lại!');
        setLoading(false);
        return;
      }

      setSuccessMsg('🎉 Đăng ký thành công! Đang tự động đăng nhập...');
      
      // Auto login right after successful registration
      setTimeout(async () => {
        try {
          const loginRes = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code_or_email: regCode.trim(), password: regPassword })
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            onLoginSuccess(loginData);
          } else {
            setIsRegister(false);
            setCodeOrEmail(regCode);
            setPassword(regPassword);
          }
        } catch (err) {
          setIsRegister(false);
        } finally {
          setLoading(false);
        }
      }, 1000);

    } catch (err) {
      setErrorMsg('Lỗi kết nối khi đăng ký tài khoản!');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center font-bold text-lg text-white shadow-xl shadow-blue-500/20">
            SIC
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-4 tracking-tight">
            {isRegister ? 'Đăng Ký Tài Khoản Mới' : 'Đăng Nhập Hệ Thống'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isRegister
              ? 'Tạo tài khoản Sinh viên / Giảng viên để tham gia lớp học'
              : 'Tự động chuyển hướng giao diện Sinh viên / Giảng viên / Admin'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center">
            {successMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {!isRegister ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Username hoặc Email
              </label>
              <input
                type="text"
                required
                value={codeOrEmail}
                onChange={(e) => setCodeOrEmail(e.target.value)}
                placeholder="Ví dụ: vdq, SV26001, GV26001 hoặc email..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mật Khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '⏳ Đang xác thực...' : '🚀 Đăng Nhập Ngay'}
            </button>

            {/* Bottom Footer Link */}
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Đăng ký ngay
              </button>
            </p>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Bạn là? (Chọn vai trò đăng ký)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('STUDENT')}
                  className={`p-3 rounded-xl text-center transition flex flex-col items-center gap-1 ${
                    regRole === 'STUDENT'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400 font-bold border'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-base">🎓</span>
                  <span className="text-xs">Sinh Viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('TEACHER')}
                  className={`p-3 rounded-xl text-center transition flex flex-col items-center gap-1 ${
                    regRole === 'TEACHER'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400 font-bold border'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-base">👨‍🏫</span>
                  <span className="text-xs">Giảng Viên</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {regRole === 'TEACHER' ? 'Username (Mã Giảng Viên) *' : 'Username (Mã Sinh Viên) *'}
              </label>
              <input
                type="text"
                required
                value={regCode}
                onChange={(e) => setRegCode(e.target.value)}
                placeholder={regRole === 'TEACHER' ? 'Ví dụ: vdq, GV26001...' : 'Ví dụ: vdq, SV260099...'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Họ và Tên *
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email *
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Ví dụ: nguyenvana@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mật Khẩu *
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
                  title={showRegPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showRegPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '⏳ Đang đăng ký...' : '✨ Đăng Ký Tài Khoản Ngay'}
            </button>

            {/* Bottom Footer Link */}
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Đăng nhập
              </button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
