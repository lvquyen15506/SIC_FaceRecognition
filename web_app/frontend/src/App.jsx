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

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
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
    setToken(loginData.access_token);
    localStorage.setItem('sic_token', loginData.access_token);
    fetchMe();
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sic_token');
  };

  const requiresKyc = user && (user.role === 'STUDENT' || user.role === 'TEACHER') && (user.kyc_status === 'UNVERIFIED' || user.face_count === 0);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} />

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
                onKycSuccess={fetchMe}
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
