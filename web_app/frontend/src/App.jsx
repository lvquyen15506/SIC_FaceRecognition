import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import StudentPortal from './pages/StudentPortal';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminCenter from './pages/AdminCenter';
import MandatoryFaceKycModal from './components/MandatoryFaceKycModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sic_token') || null);
  const [theme, setTheme] = useState(localStorage.getItem('sic_theme') || 'dark');
  const [loading, setLoading] = useState(!!localStorage.getItem('sic_token'));

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('sic_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (token) {
      fetchMeWithToken(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMeWithToken = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        handleLogout();
      }
    } catch (err) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loginData) => {
    const newAccessToken = loginData.access_token;
    setToken(newAccessToken);
    localStorage.setItem('sic_token', newAccessToken);
    fetchMeWithToken(newAccessToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sic_token');
  };

  const requiresKyc = user && (user.role === 'STUDENT' || user.role === 'TEACHER') && (user.kyc_status === 'UNVERIFIED' || user.face_count === 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 p-4 text-slate-100 font-sans">
        <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8V6a2 2 0 012-2h2M3 16v2a2 2 0 002 2h2M21 8V6a2 2 0 01-2 2h-2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-extrabold tracking-tight text-white">SIC FaceRecognition</h3>
          <p className="text-xs text-slate-400 font-medium animate-pulse">Đang xác thực phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root-container min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1">
        {!token || !user ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {/* Mandatory Face KYC Modal Overlay */}
            {requiresKyc && (
              <MandatoryFaceKycModal
                user={user}
                token={token}
                onKycSuccess={() => fetchMeWithToken(token)}
                onLogout={handleLogout}
              />
            )}

            {user.role === 'STUDENT' && <StudentPortal user={user} token={token} />}
            {user.role === 'TEACHER' && <TeacherDashboard user={user} token={token} />}
            {user.role === 'ADMIN' && <AdminCenter user={user} token={token} />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        SIC FaceRecognition Project • Google Labs Design System • Built with FastAPI &amp; React
      </footer>
    </div>
  );
}
