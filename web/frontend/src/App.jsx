import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AdminUsers from './pages/AdminUsers'
import TeacherClasses from './pages/TeacherClasses'
import VideoAttendance from './pages/VideoAttendance'
import ReportView from './pages/ReportView'
import StudentEkyc from './pages/StudentEkyc'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState('CLASSES')

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

  const handleLogout = () => {
    localStorage.clear()
    setCurrentUser(null)
    setToken('')
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* TOP NAVBAR */}
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* MAIN TWO-COLUMN DASHBOARD LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        {/* LEFT SIDEBAR NAVIGATION */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} />

        {/* RIGHT MAIN CONTENT AREA */}
        <main>
          {activeTab === 'ADMIN' && currentUser.system_role === 'ADMIN' && (
            <AdminUsers token={token} />
          )}

          {(activeTab === 'CLASSES' || activeTab === 'ATTENDANCE') && (currentUser.system_role === 'TEACHER' || currentUser.system_role === 'ADMIN') && (
            <TeacherClasses token={token} />
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
