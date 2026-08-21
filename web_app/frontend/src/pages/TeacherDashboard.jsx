import React, { useState, useEffect } from 'react';

export default function TeacherDashboard({ user, token }) {
  const [classes, setClasses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [subjectTopic, setSubjectTopic] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  // Active Main Tab: 'ATTENDANCE' vs 'ROSTER' (Quản lý Thành viên Lớp Học)
  const [activeTab, setActiveTab] = useState('ATTENDANCE');

  // Roster Management State (Teachers, Students & Pending Requests)
  const [teacherList, setTeacherList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [pendingList, setPendingList] = useState([]);

  // Modals for adding Student / Co-Teacher with Autocomplete Suggestions
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherSuggestions, setTeacherSuggestions] = useState([]);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  // Attendance Studio & History State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [sessionTitle, setSessionTitle] = useState('Buổi điểm danh lớp học');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [attendanceResult, setAttendanceResult] = useState(null);

  // Media Zoom / Video Lightbox Modal State
  const [zoomMedia, setZoomMedia] = useState(null);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSessions(selectedClass.id);
      fetchClassStudents(selectedClass.id);
      fetchClassTeachers(selectedClass.id);
      fetchPendingStudents(selectedClass.id);
    }
  }, [selectedClass]);

  // Real-time Autocomplete Search for Students
  useEffect(() => {
    if (showAddStudentModal && selectedClass) {
      const timer = setTimeout(() => {
        searchStudents(studentQuery, selectedClass.id);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [studentQuery, showAddStudentModal, selectedClass]);

  // Real-time Autocomplete Search for Teachers
  useEffect(() => {
    if (showAddTeacherModal && selectedClass) {
      const timer = setTimeout(() => {
        searchTeachers(teacherQuery, selectedClass.id);
      }, 150);
    }
  }, [teacherQuery, showAddTeacherModal, selectedClass]);

  // Close Lightbox Modal on ESC Keypress
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setZoomMedia(null);
      }
    };
    if (zoomMedia) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomMedia]);

  const fetchMyClasses = async () => {
    try {
      const res = await fetch('/api/v1/classes/my-classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(data[0]);
        }
      }
    } catch (err) {}
  };

  const searchStudents = async (q, classId) => {
    try {
      const res = await fetch(`/api/v1/classes/search-students?class_id=${classId}&query=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentSuggestions(data);
      }
    } catch (err) {}
  };

  const searchTeachers = async (q, classId) => {
    try {
      const res = await fetch(`/api/v1/classes/search-teachers?class_id=${classId}&query=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherSuggestions(data);
      }
    } catch (err) {}
  };

  const fetchClassTeachers = async (classId) => {
    try {
      const res = await fetch(`/api/v1/classes/${classId}/teachers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherList(data);
      }
    } catch (err) {}
  };

  const fetchClassStudents = async (classId) => {
    try {
      const res = await fetch(`/api/v1/classes/${classId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentList(data);
      }
    } catch (err) {}
  };

  const fetchPendingStudents = async (classId) => {
    try {
      const res = await fetch(`/api/v1/classes/${classId}/pending-students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingList(data);
      }
    } catch (err) {}
  };

  const fetchClassSessions = async (classId) => {
    try {
      const res = await fetch(`/api/v1/attendance/sessions/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const sessions = await res.json();
        setPastSessions(sessions);
        if (sessions.length > 0) {
          setAttendanceResult(sessions[0]);
        } else {
          setAttendanceResult(null);
        }
      }
    } catch (err) {}
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/classes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ class_name: className, subject_topic: subjectTopic })
      });

      if (res.ok) {
        fetchMyClasses();
        setShowCreateModal(false);
        setClassName('');
        setSubjectTopic('');
      }
    } catch (err) {}
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!selectedClass || !teacherQuery.trim()) return;

    setIsAddingTeacher(true);
    try {
      const res = await fetch(`/api/v1/classes/${selectedClass.id}/add-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teacher_email_or_code: teacherQuery.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Đã thêm Giảng viên đồng quản lý thành công');
        setShowAddTeacherModal(false);
        setTeacherQuery('');
        setTeacherSuggestions([]);
        fetchClassTeachers(selectedClass.id);
      } else {
        alert(data.detail || 'Không thể thêm Giảng viên');
      }
    } catch (err) {
      alert('Lỗi hệ thống khi thêm Giảng viên');
    } finally {
      setIsAddingTeacher(false);
    }
  };

  const handleRemoveCoTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Giảng viên ${teacherName} khỏi danh sách đồng quản lý lớp?`)) return;

    try {
      const res = await fetch(`/api/v1/classes/${selectedClass.id}/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchClassTeachers(selectedClass.id);
      } else {
        alert(data.detail || 'Không thể xóa');
      }
    } catch (err) {}
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!selectedClass || !studentQuery.trim()) return;

    setIsAddingStudent(true);
    try {
      const res = await fetch(`/api/v1/classes/${selectedClass.id}/add-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ student_code_or_email: studentQuery.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Đã thêm sinh viên vào lớp thành công');
        setShowAddStudentModal(false);
        setStudentQuery('');
        setStudentSuggestions([]);
        fetchClassStudents(selectedClass.id);
        fetchPendingStudents(selectedClass.id);
      } else {
        alert(data.detail || 'Không thể thêm sinh viên');
      }
    } catch (err) {
      alert('Lỗi hệ thống khi thêm sinh viên');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleApproveStudent = async (studentId) => {
    try {
      const res = await fetch(`/api/v1/classes/${selectedClass.id}/students/${studentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchClassStudents(selectedClass.id);
        fetchPendingStudents(selectedClass.id);
      }
    } catch (err) {}
  };

  const handleRejectStudent = async (studentId) => {
    try {
      const res = await fetch(`/api/v1/classes/${selectedClass.id}/students/${studentId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPendingStudents(selectedClass.id);
      }
    } catch (err) {}
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sinh viên ${studentName} khỏi lớp?`)) return;

    try {
      const res = await fetch(`/api/v1/classes/${selectedClass.id}/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchClassStudents(selectedClass.id);
      }
    } catch (err) {}
  };

  const handleBatchProcess = async (e) => {
    e.preventDefault();
    if (!selectedClass || uploadFiles.length === 0) return;

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('session_title', sessionTitle);
    for (let file of uploadFiles) {
      formData.append('files', file);
    }

    try {
      const res = await fetch(`/api/v1/attendance/${selectedClass.id}/batch-process`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAttendanceResult(data);
        fetchClassSessions(selectedClass.id);
      }
    } catch (err) {
      alert('Lỗi xử lý điểm danh');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Header Banner */}
      <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-400 border border-blue-600/20 uppercase tracking-wider font-mono">
              ⚡ Workspace Giảng Viên Enterprise
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Giảng viên: {user.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span>Mã GV: <strong className="font-mono text-slate-800 dark:text-slate-200">{user.code}</strong></span>
            <span>•</span>
            <span>Email: <strong className="text-slate-700 dark:text-slate-300">{user.email}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <span>+ Tạo Lớp Học Mới</span>
          </button>
        </div>
      </div>

      {/* Media Zoom / Video Lightbox Modal */}
      {zoomMedia && (
        <div
          onClick={() => setZoomMedia(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          {/* Modal Header Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between mb-3 px-4 py-2.5 rounded-2xl glass-card border border-slate-700/80 bg-slate-900/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                {zoomMedia.media_type === 'VIDEO' ? '🎥 Bằng Chứng Video Điểm Danh' : '🖼️ Bằng Chứng Ảnh Lớp Học Phóng To'}
              </span>
            </div>

            <button
              onClick={() => setZoomMedia(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Đóng (Bấm phím ESC)"
            >
              <span>Đóng</span>
              <kbd className="px-1.5 py-0.5 bg-slate-900 text-[10px] rounded font-mono border border-slate-700 text-slate-300">ESC</kbd>
            </button>
          </div>

          {/* Modal Media Container */}
          <div
            className="relative max-w-5xl max-h-[82vh] flex items-center justify-center p-1 rounded-2xl overflow-hidden glass-card border border-slate-700/80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {zoomMedia.media_type === 'VIDEO' ? (
              <video
                src={zoomMedia.processed_url}
                controls
                autoPlay
                className="max-w-full max-h-[78vh] rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <img
                src={zoomMedia.processed_url}
                alt="Zoomed evidence"
                className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
              />
            )}
          </div>

          {/* Footer Helper Text */}
          <p className="text-center text-xs text-slate-400 mt-3 font-mono-grotesk flex items-center gap-2 bg-slate-900/60 px-4 py-1.5 rounded-full border border-slate-800">
            <span>💡 Mẹo: Bấm phím <kbd className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-200 rounded border border-slate-700">ESC</kbd> hoặc nhấp vùng đen ngoài để thoát</span>
          </p>
        </div>
      )}

      {/* Add Co-Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thêm Giảng Viên Quản Lý Lớp</h3>
              <button
                onClick={() => {
                  setShowAddTeacherModal(false);
                  setTeacherQuery('');
                  setTeacherSuggestions([]);
                }}
                className="text-slate-400 hover:text-white w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">Gõ tên, mã GV hoặc email để chọn từ danh sách gợi ý</p>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Mã GV / Tên / Email Giảng Viên</label>
                <input
                  type="text"
                  required
                  value={teacherQuery}
                  onChange={(e) => setTeacherQuery(e.target.value)}
                  placeholder="Gõ để tìm kiếm: VD: GV002 hoặc Giảng viên..."
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              {/* Inline Suggestions Container */}
              {teacherSuggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase px-1">
                    <span>Kết quả gợi ý ({teacherSuggestions.length})</span>
                    {teacherSuggestions.length > 3 && <span className="text-indigo-400 font-normal normal-case">📜 Cuộn để xem thêm...</span>}
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-1 divide-y divide-slate-800/60">
                    {teacherSuggestions.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          if (!t.already_in_class) {
                            setTeacherQuery(t.code);
                          }
                        }}
                        className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition ${
                          t.already_in_class
                            ? 'opacity-60 bg-slate-800/30 cursor-not-allowed'
                            : 'hover:bg-indigo-600/20 cursor-pointer'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-white">{t.full_name}</span>
                          <span className="text-slate-400 ml-2 font-mono-grotesk">({t.email})</span>
                        </div>
                        {t.already_in_class ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            ✓ Đã trong lớp
                          </span>
                        ) : (
                          <span className="font-mono-grotesk font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {t.code}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTeacherModal(false);
                    setTeacherQuery('');
                    setTeacherSuggestions([]);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isAddingTeacher}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
                >
                  {isAddingTeacher ? 'Đang Thêm...' : 'Thêm Giảng Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thêm Sinh Viên Vào Lớp</h3>
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setStudentQuery('');
                  setStudentSuggestions([]);
                }}
                className="text-slate-400 hover:text-white w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">Gõ MSSV, Tên hoặc Email sinh viên để chọn từ danh sách gợi ý</p>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">MSSV / Tên / Email Sinh Viên</label>
                <input
                  type="text"
                  required
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Gõ để tìm kiếm: VD: SV001 hoặc Nguyễn..."
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              {/* Inline Suggestions Container */}
              {studentSuggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase px-1">
                    <span>Kết quả gợi ý ({studentSuggestions.length})</span>
                    {studentSuggestions.length > 3 && <span className="text-emerald-400 font-normal normal-case">📜 Cuộn để xem thêm...</span>}
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-1 divide-y divide-slate-800/60">
                    {studentSuggestions.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          if (!st.already_in_class) {
                            setStudentQuery(st.code);
                          }
                        }}
                        className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition ${
                          st.already_in_class
                            ? 'opacity-60 bg-slate-800/30 cursor-not-allowed'
                            : 'hover:bg-emerald-600/20 cursor-pointer'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-white">{st.full_name}</span>
                          <span className="text-slate-400 ml-2 font-mono-grotesk">({st.email})</span>
                        </div>
                        {st.already_in_class ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            ✓ Đã trong lớp
                          </span>
                        ) : (
                          <span className="font-mono-grotesk font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {st.code}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setStudentQuery('');
                    setStudentSuggestions([]);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
                >
                  {isAddingStudent ? 'Đang Thêm...' : 'Thêm Vào Lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tạo Lớp Học Mới</h3>
            <p className="text-xs text-slate-400">Chỉ cần nhập Tên lớp và Chủ đề học, hệ thống tự sinh Mã Lớp</p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tên Lớp</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="VD: Lớp Khoa học Máy tính K16"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Chủ Đề Học / Môn Học</label>
                <input
                  type="text"
                  required
                  value={subjectTopic}
                  onChange={(e) => setSubjectTopic(e.target.value)}
                  placeholder="VD: Thị giác Máy tính &amp; Nhận diện Khuôn mặt"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-lg"
                >
                  Tạo Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Selection Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="flex gap-3 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar">
          {classes.map((cls) => {
            const isSelected = selectedClass?.id === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`px-5 py-3 rounded-2xl text-xs border transition text-left shrink-0 shadow-sm ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px] mb-0.5">{cls.class_code}</div>
                <div className="font-bold text-slate-900 dark:text-white">{cls.class_name}</div>
              </button>
            );
          })}
        </div>

        {selectedClass && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shrink-0 shadow-sm">
            <button
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              📷 Studio Điểm Danh
            </button>
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative ${
                activeTab === 'ROSTER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              👥 Thành Viên &amp; Duyệt ({studentList.length} SV)
              {pendingList.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse shadow-sm">
                  {pendingList.length} chờ
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {selectedClass && activeTab === 'ATTENDANCE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Upload Form & Past Sessions List */}
          <div className="space-y-6">
            {/* Attendance Studio Upload Form */}
            <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Studio Điểm Danh Hàng Loạt</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">AI v4.4</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kéo-thả tùy ý nhiều file Ảnh &amp; Video lớp học</p>

              <form onSubmit={handleBatchProcess} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Tiêu Đề Buổi Học
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="Ví dụ: Điểm danh Tuần 5 - Học phần AI"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Tải Lên Tệp Ảnh &amp; Video Lớp Học
                  </label>
                  
                  <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all rounded-2xl p-5 text-center cursor-pointer group">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-sm">
                        📁
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {uploadFiles.length === 0 ? 'Kéo thả hoặc nhấp để tải tệp Ảnh/Video' : `Đã chọn ${uploadFiles.length} tệp ready!`}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Hỗ trợ định dạng JPG, PNG, MP4, MOV (Tối đa 100MB/file)
                      </p>
                    </div>
                  </div>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                    {uploadFiles.map((f, idx) => (
                      <div key={idx} className="text-xs font-mono px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-slate-800 text-blue-900 dark:text-blue-300 border border-blue-200/80 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm">
                        <span className="truncate flex items-center gap-2 font-medium">
                          <span className="text-blue-600 dark:text-blue-400">📄</span> {f.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || uploadFiles.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI Engine Đang Nhận Diện Khuôn Mặt...</span>
                    </>
                  ) : (
                    `⚡ Tiến Hành Điểm Danh AI (${uploadFiles.length} Tệp)`
                  )}
                </button>
              </form>
            </div>

            {/* Past Attendance Sessions Sidebar */}
            <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📜 Lịch Sử Điểm Danh</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                    {pastSessions.length}
                  </span>
                </h4>
              </div>

              {pastSessions.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có lịch sử buổi điểm danh nào.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {pastSessions.map((sess) => {
                    const isSelected = attendanceResult?.session_id === sess.session_id;
                    return (
                      <button
                        key={sess.session_id}
                        onClick={() => setAttendanceResult(sess)}
                        className={`w-full p-3 rounded-xl text-left border transition text-xs flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-sm'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="font-bold truncate text-slate-900 dark:text-white max-w-[170px] sm:max-w-[200px]" title={sess.title}>
                            {sess.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {sess.session_date} • <span className="text-emerald-700 dark:text-emerald-400 font-bold">{sess.present_count}/{sess.total_students} SV có mặt</span>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition shrink-0">
                          Xem
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Results Canvas & Table */}
          <div className="md:col-span-2 glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
            {!attendanceResult ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-2xl mb-2">📥</span>
                <span className="font-medium">Chọn các tệp ảnh/video bên trái và nhấn Tiến Hành Điểm Danh</span>
              </div>
            ) : (
              <>
                <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                        📅 Buổi Học: {attendanceResult.session_date}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {attendanceResult.title || 'Kết Quả Điểm Danh Buổi Học'}
                      </h3>
                    </div>

                    <a
                      href={`/api/v1/attendance/export-excel/${attendanceResult.session_id}`}
                      download
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
                    >
                      📊 Xuất Excel (.xlsx)
                    </a>
                  </div>

                  {/* 4 Quick Metric Cards Grid (SOLID High Contrast Accessibility) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-blue-600 text-white shadow-md space-y-1">
                      <span className="text-[11px] font-extrabold text-blue-100 uppercase tracking-wider block">🔍 TỔNG PHÁT HIỆN</span>
                      <p className="text-2xl font-black font-mono text-white">
                        {attendanceResult.total_faces_detected || attendanceResult.present_count} <span className="text-xs font-bold text-blue-100">mặt</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-600 text-white shadow-md space-y-1">
                      <span className="text-[11px] font-extrabold text-emerald-100 uppercase tracking-wider block">✅ CÓ MẶT</span>
                      <p className="text-2xl font-black font-mono text-white">
                        {attendanceResult.present_count}<span className="text-xs font-bold text-emerald-100">/{attendanceResult.total_students} SV</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-600 text-white shadow-md space-y-1">
                      <span className="text-[11px] font-extrabold text-rose-100 uppercase tracking-wider block">❌ VẮNG MẶT</span>
                      <p className="text-2xl font-black font-mono text-white">
                        {attendanceResult.absent_count} <span className="text-xs font-bold text-rose-100">SV</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-600 text-white shadow-md space-y-1">
                      <span className="text-[11px] font-extrabold text-amber-100 uppercase tracking-wider block">⚠️ NGƯỜI LẠ</span>
                      <p className="text-2xl font-black font-mono text-white">
                        {attendanceResult.unknown_count || 0} <span className="text-xs font-bold text-amber-100">người</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Processed Media Preview */}
                {attendanceResult.media_files && attendanceResult.media_files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Ảnh / Video Bằng Chứng Đã Xử Lý <span className="text-blue-600 dark:text-blue-400 normal-case font-normal">(Bấm để xem video hoặc Phóng to ảnh)</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {attendanceResult.media_files.map((mf) => (
                        <div key={mf.id} className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 p-2 group relative shadow-sm">
                          {mf.media_type === 'VIDEO' ? (
                            <video
                              src={mf.processed_url}
                              controls
                              poster={mf.thumbnail_url}
                              className="w-full h-44 object-cover rounded-lg bg-black"
                            />
                          ) : (
                            <img
                              src={mf.processed_url}
                              alt="Media result"
                              onClick={() => setZoomMedia(mf)}
                              className="w-full h-44 object-cover rounded-lg cursor-zoom-in group-hover:opacity-90 transition"
                            />
                          )}

                          <div className="flex items-center justify-between mt-1 px-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              {mf.media_type === 'VIDEO' ? '🎥 File Video' : '🖼️ File Ảnh'} #{mf.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => setZoomMedia(mf)}
                              className="text-[10px] text-blue-400 hover:underline font-bold flex items-center gap-1"
                            >
                              {mf.media_type === 'VIDEO' ? '▶ Phóng To Video' : '🔍 Phóng To Ảnh'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Refactored Attendance Summary Table with Clean Unknown Grouping */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase font-mono font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">MSSV</th>
                        <th className="p-3.5">Họ và Tên</th>
                        <th className="p-3.5">Trạng Thái</th>
                        <th className="p-3.5">Tỷ Lệ Khớp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                      {/* Filter out individual UNKNOWN records from the main loop */}
                      {attendanceResult.summary
                        .filter((rec) => rec.status !== 'UNKNOWN' && rec.student_code !== 'NGƯỜI LẠ')
                        .map((rec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-mono text-slate-900 dark:text-slate-200 font-bold">
                              {rec.student_code}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">{rec.student_name}</td>
                            <td className="p-3.5">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                                  rec.status === 'PRESENT'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-rose-600 text-white'
                                }`}
                              >
                                {rec.status === 'PRESENT' ? '✓ CÓ MẶT' : '✗ VẮNG MẶT'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {(rec.confidence * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}

                      {/* Grouped Single Summary Row for Unknown Persons */}
                      {(attendanceResult.unknown_count > 0 ||
                        attendanceResult.summary.some((rec) => rec.status === 'UNKNOWN' || rec.student_code === 'NGƯỜI LẠ')) && (
                        <tr className="bg-amber-500/10 border-t-2 border-amber-500/30">
                          <td colSpan="4" className="p-4 text-center font-bold text-amber-800 dark:text-amber-300 text-xs">
                            ⚠️ Phát hiện {attendanceResult.unknown_count || attendanceResult.summary.filter((r) => r.status === 'UNKNOWN' || r.student_code === 'NGƯỜI LẠ').length} người lạ (Khung màu đỏ trên ảnh/video bằng chứng)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Class Roster & Pending Requests Tab */}
      {selectedClass && activeTab === 'ROSTER' && (
        <div className="space-y-8">
          {/* Section 0: Pending Join Requests Banner */}
          {pendingList.length > 0 && (
            <div className="glass-card rounded-2xl p-6 border border-amber-500/40 bg-amber-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="text-lg font-bold text-amber-300">
                    Yêu Cầu Gia Nhập Đang Chờ Duyệt ({pendingList.length})
                  </h3>
                </div>
                <span className="text-xs text-amber-400">Sinh viên vừa nhập mã lớp {selectedClass.class_code}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingList.map((st) => (
                  <div key={st.id} className="p-4 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-white text-sm">{st.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono-grotesk mt-0.5">MSSV: {st.code} • {st.email}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Yêu cầu lúc: {st.joined_at}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveStudent(st.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                      >
                        ✓ Duyệt
                      </button>
                      <button
                        onClick={() => handleRejectStudent(st.id)}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg transition"
                      >
                        ✕ Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Teachers List */}
          <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">👨‍🏫 Giảng Viên Quản Lý Lớp ({teacherList.length})</h3>
                <p className="text-xs text-slate-400 mt-1">Danh sách Giảng viên có quyền thực hiện điểm danh và xuất báo cáo lớp {selectedClass.class_name}</p>
              </div>

              <button
                onClick={() => setShowAddTeacherModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                + Thêm Giảng Viên Đồng Quản Lý
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherList.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{t.full_name}</div>
                    <div className="text-xs text-slate-400 font-mono-grotesk mt-0.5">Mã GV: {t.code} • {t.email}</div>
                  </div>
                  {t.is_owner ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Tạo Lớp
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Đồng Quản Lý
                      </span>
                      <button
                        onClick={() => handleRemoveCoTeacher(t.id, t.full_name)}
                        className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] rounded"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Students List */}
          <div className="glass-card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">👥 Danh Sách Sinh Viên Lớp ({studentList.length})</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mã Tham Gia Lớp Học: <span className="font-mono-grotesk font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{selectedClass.class_code}</span>
                </p>
              </div>

              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                + Thêm Sinh Viên Trực Tiếp
              </button>
            </div>

            <div className="overflow-x-auto">
              {studentList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm italic">
                  Lớp học chưa có sinh viên nào. Hãy nhấn nút "+ Thêm Sinh Viên Trực Tiếp" ở trên hoặc chia sẻ Mã Lớp "{selectedClass.class_code}" cho sinh viên!
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono-grotesk">
                    <tr>
                      <th className="p-3">STT</th>
                      <th className="p-3">Mã Sinh Viên (MSSV)</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3">Email Liên Hệ</th>
                      <th className="p-3">Dữ Liệu Khuôn Mặt</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {studentList.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono-grotesk text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-mono-grotesk font-bold text-blue-400">{st.code}</td>
                        <td className="p-3 font-semibold text-white">{st.full_name}</td>
                        <td className="p-3 text-slate-400">{st.email}</td>
                        <td className="p-3">
                          {st.face_count > 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                              ✓ Đã đăng ký ({st.face_count} góc mặt)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                              ⚠ Chưa đăng ký ảnh mặt
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemoveStudent(st.id, st.full_name)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-semibold rounded-lg transition"
                          >
                            Xóa Khỏi Lớp
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
