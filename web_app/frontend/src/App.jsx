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

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('sic_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (token) {
      fetchMeWithToken(token);
    }
  }, [token]);

  const fetchMeWithToken = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

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

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
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

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        SIC FaceRecognition Project • Google Labs Design System • Built with FastAPI &amp; React
      </footer>
    </div>
  );
}
