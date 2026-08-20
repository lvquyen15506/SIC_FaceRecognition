import React, { useState, useEffect } from 'react';
import MandatoryFaceKycModal from '../components/MandatoryFaceKycModal';

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
              {enrollStatus.is_complete ? 'ĐÃ HOÀN THÀNH (ĐỦ 5/5 GÓC MẶT)' : `CHƯA ĐỦ (${enrollStatus.total_angles}/5 GÓC)`}
            </p>
          </div>
          {!enrollStatus.is_complete && (
            <button
              onClick={() => setShowHUD(!showHUD)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              {showHUD ? 'Đóng Camera' : '🚀 Quét Dữ Liệu 3D'}
            </button>
          )}
        </div>
      </div>

      {/* Mandatory 3D Face KYC Modal (Only available if incomplete) */}
      {showHUD && !enrollStatus.is_complete && (
        <MandatoryFaceKycModal
          user={user}
          token={token}
          onKycSuccess={() => {
            fetchEnrollStatus();
            setShowHUD(false);
          }}
          onLogout={() => setShowHUD(false)}
        />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Join Class Form */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Gia Nhập Lớp Học Mới</span>
            <p className="text-xs text-slate-400 mt-1">Nhập Mã Lớp (Class Code) do Giảng viên cung cấp</p>
          </div>

          <form onSubmit={handleJoinClass} className="space-y-4">
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="VD: SIC-A1B2C3"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 font-mono text-center text-sm tracking-widest focus:outline-none focus:border-indigo-500 transition"
              required
            />

            {joinMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${joinMsg.includes('thành công') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                {joinMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            >
              Gửi Yêu Cầu Tham Gia
            </button>
          </form>
        </div>

        {/* My Joined Classes List */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Lớp Học Đã Tham Gia ({myClasses.length})</h3>
          </div>

          {myClasses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
              Bạn chưa tham gia lớp học nào. Vui lòng nhập Mã Lớp ở bên cạnh.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {myClasses.map((cls) => {
                const codeStr = cls.class_code || cls.code || `LỚP-${cls.id}`;
                const nameStr = cls.class_name || cls.name || 'Lớp Học';
                const subjectStr = cls.subject_topic || cls.subject;

                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id === selectedClassId ? null : cls.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${cls.id === selectedClassId ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {codeStr}
                        </span>
                        <h4 className="text-sm font-bold text-white">{nameStr}</h4>
                      </div>
                      {subjectStr && (
                        <p className="text-xs text-slate-400 mt-1">Chủ đề: {subjectStr}</p>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Đã gia nhập
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Personal Attendance History & Statistics */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Bảng Thống Kê &amp; Lịch Sử Điểm Danh Cá Nhân</h3>
            <p className="text-xs text-slate-400 mt-1">Theo dõi tỷ lệ đi học chuyên cần của bạn trên từng lớp học</p>
          </div>

          {historyData && historyData.summary && (
            <div className="flex items-center gap-4 bg-slate-900/90 px-4 py-2 rounded-2xl border border-slate-800">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tỷ lệ chuyên cần tổng quan</span>
                <span className="text-lg font-bold text-emerald-400 font-mono-grotesk">{historyData.summary.overall_rate}%</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Có mặt / Tổng số buổi</span>
                <span className="text-sm font-bold text-white font-mono-grotesk">
                  {historyData.summary.total_present} / {historyData.summary.total_sessions}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Class History List */}
        {!historyData || !historyData.classes || historyData.classes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Chưa có dữ liệu lịch sử điểm danh.
          </div>
        ) : (
          <div className="space-y-4">
            {historyData.classes
              .filter(c => !selectedClassId || c.class_id === selectedClassId)
              .map((c) => (
                <div key={c.class_id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-xs font-bold">
                        {c.class_code}
                      </span>
                      <h4 className="text-base font-bold text-white">{c.class_name}</h4>
                      {c.subject && <span className="text-xs text-slate-400">({c.subject})</span>}
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">
                        Có mặt: <b className="text-white font-mono">{c.present_count}/{c.total_sessions} buổi</b>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs font-mono">
                        {c.rate}%
                      </span>
                    </div>
                  </div>

                  {/* Sessions Timeline Table */}
                  {c.sessions && c.sessions.length > 0 && (
                    <div className="overflow-x-auto pt-2">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-800">
                            <th className="pb-2 font-semibold">Ngày Học</th>
                            <th className="pb-2 font-semibold">Buổi Học / Chủ Đề</th>
                            <th className="pb-2 font-semibold">Trạng Thái Điểm Danh</th>
                            <th className="pb-2 font-semibold text-right">Thời Gian Ghi Nhận</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {c.sessions.map((s, sIdx) => (
                            <tr key={sIdx} className="hover:bg-slate-800/30 transition">
                              <td className="py-2.5 font-mono text-slate-300">{s.session_date}</td>
                              <td className="py-2.5 text-white font-medium">{s.title || 'Buổi học định kỳ'}</td>
                              <td className="py-2.5">
                                {s.status === 'PRESENT' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                    ✓ CÓ MẶT
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                                    ✗ VẮNG MẶT
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right font-mono text-slate-400">
                                {s.marked_at ? new Date(s.marked_at).toLocaleTimeString('vi-VN') : '--:--'}
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
