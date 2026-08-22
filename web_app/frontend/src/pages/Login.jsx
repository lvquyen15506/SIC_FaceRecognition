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
                Mã Số (MSSV / MGV) hoặc Email
              </label>
              <input
                type="text"
                required
                value={codeOrEmail}
                onChange={(e) => setCodeOrEmail(e.target.value)}
                placeholder="Ví dụ: SV26001, GV26001 hoặc email..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mật Khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-500 transition"
              />
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
                {regRole === 'TEACHER' ? 'Mã Giảng Viên (MGV) *' : 'Mã Số Sinh Viên (MSSV) *'}
              </label>
              <input
                type="text"
                required
                value={regCode}
                onChange={(e) => setRegCode(e.target.value)}
                placeholder={regRole === 'TEACHER' ? 'Ví dụ: GV26001' : 'Ví dụ: SV260099'}
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
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-blue-500 transition"
              />
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
