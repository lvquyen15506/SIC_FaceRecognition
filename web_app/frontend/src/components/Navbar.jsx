import React from 'react';

export default function Navbar({ user, onLogout, theme, onToggleTheme }) {
  return (
    <header className="border-b border-slate-800 bg-[#090D16]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            SIC
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              SIC FaceRecognition <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono-grotesk">v4.4 Enterprise</span>
            </h1>
            <p className="text-xs text-slate-400">Hệ thống Điểm danh Lớp học &amp; Đăng ký Dữ liệu Đa góc mặt</p>
          </div>
        </div>

        {/* User Info, Theme Toggle & Logout */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700/80 flex items-center justify-center text-lg transition-all transform active:scale-95 shadow-md"
            title={theme === 'light' ? 'Chuyển sang Chế độ Tối (Dark Mode)' : 'Chuyển sang Chế độ Sáng (White Mode)'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user && (
            <div className="flex items-center space-x-3 border-l border-slate-800 pl-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-200">{user.full_name}</p>
                <p className="text-xs text-slate-400 font-mono-grotesk">
                  {user.code} • <span className="text-blue-400 font-semibold">{user.role}</span>
                </p>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
