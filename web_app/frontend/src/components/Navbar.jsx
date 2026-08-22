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
    <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#090D16]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 overflow-hidden shrink-0">
            {/* Face Scanning Brackets SVG */}
            <svg className="w-6 h-6 text-white absolute z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8V6a2 2 0 012-2h2M3 16v2a2 2 0 002 2h2M21 8V6a2 2 0 00-2-2h-2M21 16v2a2 2 0 01-2 2h-2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {/* Subtle scanning line animation */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-300/50 blur-sm animate-[scan_2s_ease-in-out_infinite]" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-base sm:text-lg flex items-center gap-1.5 leading-none">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 tracking-tighter">SIC</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">FaceRecognition</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
              Hệ thống Điểm danh Lớp học AI &amp; Đăng ký Dữ liệu Đa góc mặt
            </p>
          </div>
        </div>

        {/* User Info, Theme Toggle & Logout */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleThemeToggle}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500 hover:text-amber-600 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-lg transition-all transform active:scale-95 shadow-sm"
            title={theme === 'dark' ? 'Chuyển sang Chế độ Sáng (Light Mode)' : 'Chuyển sang Chế độ Tối (Dark Mode)'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
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
