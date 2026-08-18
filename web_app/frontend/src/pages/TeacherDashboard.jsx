import React, { useState, useEffect } from 'react';

export default function TeacherDashboard({ user, token }) {
  const [classes, setClasses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [subjectTopic, setSubjectTopic] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  // Attendance Studio & History State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [sessionTitle, setSessionTitle] = useState('Buổi điểm danh lớp học');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [attendanceResult, setAttendanceResult] = useState(null);

  // Image Zoom Lightbox Modal State
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSessions(selectedClass.id);
    }
  }, [selectedClass]);

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
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
            Workspace Giảng Viên
          </span>
          <h2 className="text-3xl font-bold text-white mt-2">Giảng viên: {user.full_name}</h2>
          <p className="text-sm text-slate-400 mt-1">Mã GV: <span className="font-mono-grotesk">{user.code}</span></p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition"
        >
          + Tạo Lớp Học Mới
        </button>
      </div>

      {/* Image Zoom Lightbox Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-2 text-white bg-slate-800/80 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border border-slate-600"
            >
              ✕
            </button>
            <img
              src={zoomImage}
              alt="Zoomed evidence"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-700 shadow-2xl"
            />
            <p className="text-center text-xs text-slate-400 mt-2 font-mono-grotesk">🔍 Nhấp vào ngoài hoặc nút ✕ để đóng ảnh</p>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-slate-800 space-y-4">
            <h3 className="text-xl font-bold text-white">Tạo Lớp Học Mới</h3>
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
      <div className="flex gap-3 overflow-x-auto pb-2">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            className={`px-5 py-3 rounded-xl text-xs font-semibold border transition text-left shrink-0 ${
              selectedClass?.id === cls.id
                ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg ring-2 ring-blue-500/20'
                : 'glass-card border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="font-mono-grotesk font-bold text-blue-400 mb-0.5">{cls.class_code}</div>
            <div className="font-bold text-white">{cls.class_name}</div>
          </button>
        ))}
      </div>

      {selectedClass && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Upload Form & Past Sessions List */}
          <div className="space-y-6">
            {/* Attendance Studio Upload Form */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">Studio Điểm Danh Hàng Loạt</h3>
              <p className="text-xs text-slate-400">Kéo-thả tùy ý nhiều file Ảnh &amp; Video lớp học</p>

              <form onSubmit={handleBatchProcess} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tiêu Đề Buổi Học</label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Chọn Tệp Ảnh &amp; Video</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-blue-400 hover:file:bg-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || uploadFiles.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>AI Đang Nhận Diện Khuôn Mặt...</span>
                    </>
                  ) : (
                    `Tiến Hành Điểm Danh (${uploadFiles.length} Tệp)`
                  )}
                </button>
              </form>
            </div>

            {/* Past Attendance Sessions (Lịch sử đã lưu) */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lịch Sử Các Buổi Điểm Danh ({pastSessions.length})</h4>
              {pastSessions.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Chưa có lịch sử buổi điểm danh nào.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pastSessions.map((sess) => (
                    <button
                      key={sess.session_id}
                      onClick={() => setAttendanceResult(sess)}
                      className={`w-full p-3 rounded-xl text-left border transition text-xs flex items-center justify-between ${
                        attendanceResult?.session_id === sess.session_id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">{sess.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sess.session_date} • {sess.present_count}/{sess.total_students} SV có mặt
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-400">Xem Báo Cáo</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Results Canvas & Table */}
          <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            {!attendanceResult ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                <span>Chọn các tệp ảnh/video bên trái và nhấn Tiến Hành Điểm Danh</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{attendanceResult.title || 'Kết Quả Điểm Danh Buổi Học'}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ngày: <span className="font-mono-grotesk text-slate-200">{attendanceResult.session_date}</span> | Có mặt: <span className="text-emerald-400 font-bold">{attendanceResult.present_count}</span> | Vắng mặt: <span className="text-red-400 font-bold">{attendanceResult.absent_count}</span> / Tổng: {attendanceResult.total_students} SV
                    </p>
                  </div>
                  <a
                    href={`/api/v1/attendance/export-excel/${attendanceResult.session_id}`}
                    download
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-1.5"
                  >
                    📊 Tải Báo Cáo Excel (.xlsx)
                  </a>
                </div>

                {/* Processed Media Preview with Zoom Lightbox */}
                {attendanceResult.media_files && attendanceResult.media_files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Ảnh / Video Bằng Chứng Đã Xử Lý <span className="text-blue-400 normal-case font-normal">(Nhấp vào ảnh để Zoom to)</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {attendanceResult.media_files.map((mf) => (
                        <div key={mf.id} className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2 group relative">
                          <img
                            src={mf.processed_url}
                            alt="Media result"
                            onClick={() => setZoomImage(mf.processed_url)}
                            className="w-full h-44 object-cover rounded-lg cursor-zoom-in group-hover:opacity-90 transition"
                          />
                          <div className="flex items-center justify-between mt-1 px-1">
                            <span className="text-[10px] text-slate-400">File bằng chứng #{mf.id}</span>
                            <button
                              type="button"
                              onClick={() => setZoomImage(mf.processed_url)}
                              className="text-[10px] text-blue-400 hover:underline font-semibold flex items-center gap-1"
                            >
                              🔍 Zoom To
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendance Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono-grotesk">
                      <tr>
                        <th className="p-3">MSSV</th>
                        <th className="p-3">Họ và Tên</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3">Tỷ Lệ Khớp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {attendanceResult.summary.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono-grotesk text-slate-300">{rec.student_code}</td>
                          <td className="p-3 font-semibold text-white">{rec.student_name}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              rec.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {rec.status === 'PRESENT' ? 'CÓ MẶT' : 'VẮNG MẶT'}
                            </span>
                          </td>
                          <td className="p-3 font-mono-grotesk text-slate-400">
                            {(rec.confidence * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
