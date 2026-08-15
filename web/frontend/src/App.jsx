import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Login from './pages/Login'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AdminUsers from './pages/AdminUsers'
import TeacherClasses from './pages/TeacherClasses'
import AttendanceCenter from './pages/AttendanceCenter'
import ReportView from './pages/ReportView'
import StudentEkyc from './pages/StudentEkyc'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState('CLASSES')

  const handleLogout = () => {
    localStorage.clear()
    setCurrentUser(null)
    setToken('')
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        const parsedUser = JSON.parse(savedUser)
        setCurrentUser(parsedUser)
        if (parsedUser.system_role === 'ADMIN') {
          setActiveTab('ADMIN')
        } else if (parsedUser.system_role === 'TEACHER') {
          setActiveTab('CLASSES')
        } else {
          setActiveTab('EKYC')
        }
      } catch (e) {
        localStorage.clear()
      }
    }
  }, [])

  // Auto handle expired or stale token by logging out cleanly
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || (error.response.status === 403 && error.response.data?.error?.includes('ADMIN')))) {
          handleLogout()
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  const handleLoginSuccess = (user, accessToken) => {
    setCurrentUser(user)
    setToken(accessToken)
    if (user.system_role === 'ADMIN') {
      setActiveTab('ADMIN')
    } else if (user.system_role === 'TEACHER') {
      setActiveTab('CLASSES')
    } else {
      setActiveTab('EKYC')
    }
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div style={{ padding: '16px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      {/* TOP NAVBAR */}
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* MAIN RESPONSIVE DASHBOARD LAYOUT */}
      <div className="dashboard-grid">
        {/* LEFT SIDEBAR NAVIGATION */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} />

        {/* RIGHT MAIN CONTENT AREA */}
        <main style={{ minWidth: 0 }}>
          {activeTab === 'ADMIN' && currentUser.system_role === 'ADMIN' && (
            <AdminUsers token={token} />
          )}

          {activeTab === 'CLASSES' && (currentUser.system_role === 'TEACHER' || currentUser.system_role === 'ADMIN') && (
            <TeacherClasses token={token} />
          )}

          {activeTab === 'ATTENDANCE' && (currentUser.system_role === 'TEACHER' || currentUser.system_role === 'ADMIN') && (
            <AttendanceCenter token={token} />
          )}

          {activeTab === 'REPORTS' && (
            <ReportView token={token} />
          )}

          {activeTab === 'EKYC' && (
            <StudentEkyc currentUser={currentUser} token={token} onEkycDone={() => {
              const updated = { ...currentUser, ekyc_completed: true }
              setCurrentUser(updated)
              localStorage.setItem('user', JSON.stringify(updated))
            }} />
          )}
        </main>
      </div>
    </div>
  )
}
