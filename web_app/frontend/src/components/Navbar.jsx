import React from 'react';

export default function Navbar({ user, onLogout, theme, onToggleTheme }) {
  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
      document.body.classList.remove('light-mode');
    } else {
      root.classList.remove('dark');
      document.body.classList.add('light-mode');
    }
    localStorage.setItem('sic_theme', nextTheme);
    if (onToggleTheme) {
      onToggleTheme();
    }
  };

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#090D16]/90 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white shadow-md shadow-blue-500/20 text-sm tracking-widest">
            SIC
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              SIC FaceRecognition <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">v4.4 Enterprise</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Hệ thống Điểm danh Lớp học AI &amp; Đăng ký Dữ liệu Đa góc mặt</p>
          </div>
        </div>

        {/* User Info, Theme Toggle & Logout */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleThemeToggle}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500 hover:text-amber-600 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-lg transition-all transform active:scale-95 shadow-sm"
            title={theme === 'light' ? 'Chuyển sang Chế độ Tối (Dark Mode)' : 'Chuyển sang Chế độ Sáng (White Mode)'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user && (
            <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-3">
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {user.code} • <span className="text-blue-600 dark:text-blue-400 font-bold">{user.role}</span>
                </p>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition"
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
