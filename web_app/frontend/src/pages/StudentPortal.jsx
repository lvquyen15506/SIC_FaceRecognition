import React, { useState, useEffect } from 'react';
import CameraHUD from '../components/CameraHUD';

export default function StudentPortal({ user, token }) {
  const [showHUD, setShowHUD] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [myClasses, setMyClasses] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [enrollStatus, setEnrollStatus] = useState({ is_complete: false, total_angles: 0 });
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    fetchMyClasses();
    fetchEnrollStatus();
    fetchAttendanceHistory();
  }, []);

  const fetchMyClasses = async () => {
    try {
      const res = await fetch('/api/v1/classes/my-classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyClasses(data);
      }
    } catch (err) {}
  };

  const fetchEnrollStatus = async () => {
    try {
      const res = await fetch('/api/v1/enrollment/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEnrollStatus(data);
      }
    } catch (err) {}
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await fetch('/api/v1/attendance/my-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (err) {}
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setJoinMsg('');
    try {
      const res = await fetch(`/api/v1/classes/join/${classCode}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setJoinMsg(data.message);
      if (res.ok) {
        fetchMyClasses();
        fetchAttendanceHistory();
        setClassCode('');
      }
    } catch (err) {
      setJoinMsg('Không thể kết nối máy chủ');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
            Portal Sinh Viên
          </span>
          <h2 className="text-3xl font-bold text-white mt-2">Xin chào, {user.full_name}!</h2>
          <p className="text-sm text-slate-400 mt-1">
            Mã SV: <span className="font-mono-grotesk font-semibold text-slate-200">{user.code}</span>
          </p>
        </div>

        {/* Biometric Status Box */}
        <div className="glass-card p-4 rounded-2xl border border-slate-700/60 flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${enrollStatus.is_complete ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'}`} />
          <div>
            <p className="text-xs text-slate-400">Dữ liệu sinh trắc khuôn mặt</p>
            <p className="text-sm font-semibold text-white">
              {enrollStatus.is_complete ? 'ĐÃ HOÀN THÀNH (4/4 GÓC)' : `CHƯA ĐỦ (${enrollStatus.total_angles}/4 GÓC)`}
            </p>
          </div>
          <button
            onClick={() => setShowHUD(!showHUD)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
          >
            {showHUD ? 'Đóng Camera' : 'Quay Mặt Mới'}
          </button>
        </div>
      </div>

      {/* Camera HUD Modal */}
      {showHUD && (
        <div className="mb-8">
          <CameraHUD
            token={token}
            onEnrollSuccess={() => {
              fetchEnrollStatus();
              setShowHUD(false);
            }}
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Join Class Box */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Gia Nhập Lớp Học Mới</h3>
          <p className="text-xs text-slate-400">Nhập Mã Lớp (Class Code) do Giảng viên cung cấp</p>
          
          <form onSubmit={handleJoinClass} className="space-y-3">
            <input
              type="text"
              required
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="VD: SIC-A1B2C3"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm font-mono-grotesk tracking-widest text-center"
            />
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg transition"
            >
              Gửi Yêu Cầu Tham Gia
            </button>
          </form>

          {joinMsg && (
            <p className="text-xs text-emerald-400 text-center font-medium p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">{joinMsg}</p>
          )}
        </div>

        {/* My Classes List */}
        <div className="md:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Lớp Học Đã Tham Gia ({myClasses.length})</h3>
          
          {myClasses.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Bạn chưa tham gia lớp học nào. Hãy nhập Mã Lớp ở bên trái để xin gia nhập!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myClasses.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl glass-card border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-grotesk text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {cls.class_code}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                      Đã gia nhập
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{cls.class_name}</h4>
                  <p className="text-xs text-slate-400">Chủ đề: {cls.subject_topic}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Bảng Thống Kê & Lịch Sử Điểm Danh Cá Nhân</h3>
            <p className="text-xs text-slate-400">Theo dõi tỷ lệ đi học chuyên cần của bạn trên từng lớp học</p>
          </div>
          {historyData && (
            <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tỷ lệ Chuyên cần Tổng quan</p>
                <p className="text-lg font-bold font-mono-grotesk text-emerald-400">
                  {historyData.overall_summary.overall_rate}%
                </p>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Có mặt / Tổng số buổi</p>
                <p className="text-lg font-bold font-mono-grotesk text-white">
                  {historyData.overall_summary.total_present} / {historyData.overall_summary.total_sessions}
                </p>
              </div>
            </div>
          )}
        </div>

        {!historyData || historyData.classes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Chưa có dữ liệu lịch sử điểm danh. Dữ liệu sẽ xuất hiện khi Giảng viên thực hiện điểm danh lớp học.
          </div>
        ) : (
          <div className="space-y-6">
            {historyData.classes.map((clsHist) => (
              <div key={clsHist.class_id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono-grotesk text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 mr-2">
                      {clsHist.class_code}
                    </span>
                    <span className="text-base font-bold text-white">{clsHist.class_name}</span>
                    <span className="text-xs text-slate-400 ml-2">({clsHist.subject_topic})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Có mặt: <strong className="text-emerald-400 font-mono-grotesk">{clsHist.present_count}</strong>/{clsHist.total_sessions} buổi
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono-grotesk bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {clsHist.attendance_rate}%
                    </span>
                  </div>
                </div>

                {clsHist.sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Chưa có buổi điểm danh nào được ghi nhận cho lớp này.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-3">STT</th>
                          <th className="py-2 px-3">Tên Buổi Học</th>
                          <th className="py-2 px-3">Ngày Điểm Danh</th>
                          <th className="py-2 px-3">Trạng Thái</th>
                          <th className="py-2 px-3">Tỷ lệ AI Khớp %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {clsHist.sessions.map((sess, idx) => (
                          <tr key={sess.session_id} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-3 font-mono-grotesk text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-white">{sess.title}</td>
                            <td className="py-2.5 px-3 font-mono-grotesk text-slate-300">{sess.date}</td>
                            <td className="py-2.5 px-3">
                              {sess.status === 'PRESENT' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  CÓ MẶT
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  VẮNG MẶT
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono-grotesk text-slate-300">
                              {sess.status === 'PRESENT' ? `${(sess.confidence * 100).toFixed(1)}%` : '0%'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
