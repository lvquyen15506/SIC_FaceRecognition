import React, { useState, useRef, useEffect } from 'react';

const KYC_ANGLES = [
  { key: 'FRONT', label: '1. Nhìn Thẳng Chính Diện', guide: 'Giữ đầu thẳng và nhìn trực diện vào Camera', icon: '😐' },
  { key: 'LEFT', label: '2. Quay Nhẹ Sang Trái', guide: 'Quay nhẹ mặt sang bên trái khoảng 25 độ', icon: '👈' },
  { key: 'RIGHT', label: '3. Quay Nhẹ Sang Phải', guide: 'Quay nhẹ mặt sang bên phải khoảng 25 độ', icon: '👉' },
  { key: 'TILT', label: '4. Ngửa Nhẹ Cằm Lên', guide: 'Ngửa nhẹ cằm lên phía trên khoảng 15 độ', icon: '👆' }
];

export default function MandatoryFaceKycModal({ user, token, onKycSuccess, onLogout }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedAngles, setCapturedAngles] = useState({});
  const [cameraActive, setCameraActive] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const currentAngle = KYC_ANGLES[currentStepIndex];

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
      setErrorMsg('Không thể mở Camera. Vui lòng kiểm tra và cho phép quyền truy cập Camera trong trình duyệt.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Single Start Button triggers Automatic 4-Angle Scanner Sequence
  const startAutoScanSequence = async () => {
    setIsAutoScanning(true);
    setErrorMsg('');
    setStatusMsg('🚀 Bắt đầu quy trình tự động quét 4 góc mặt KYC...');
    
    // Execute sequence from step 0 to step 3
    let localCaptured = { ...capturedAngles };

    for (let i = 0; i < KYC_ANGLES.length; i++) {
      setCurrentStepIndex(i);
      const angleConfig = KYC_ANGLES[i];

      // Countdown 3, 2, 1 for user to adjust pose
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        setStatusMsg(`[Góc ${i + 1}/4: ${angleConfig.label}] Chuẩn bị chụp trong ${c}s...`);
        await new Promise(r => setTimeout(r, 1000));
      }

      setCountdown(null);
      setStatusMsg(`[Góc ${i + 1}/4: ${angleConfig.label}] AI đang phân tích & trích xuất vector...`);

      const success = await captureAndSaveSingleAngle(angleConfig.key);

      if (success) {
        localCaptured[angleConfig.key] = true;
        setCapturedAngles({ ...localCaptured });
        setStatusMsg(`✓ Đã lưu góc mặt ${i + 1}/4: ${angleConfig.label}`);
        await new Promise(r => setTimeout(r, 800));
      } else {
        // Retry current step
        setStatusMsg(`⚠️ Thử lại góc ${angleConfig.label}...`);
        i--; // Repeat loop index
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setStatusMsg('🎉 HOÀN THÀNH XÁC THỰC 4 GÓC MẶT KYC! Đang mở khóa hệ thống...');
    setIsAutoScanning(false);
    setTimeout(() => {
      onKycSuccess();
    }, 1500);
  };

  const captureAndSaveSingleAngle = async (angleKey) => {
    if (!videoRef.current || !canvasRef.current) return false;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.9);

    try {
      const res = await fetch('/api/v1/enrollment/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          angle_label: angleKey,
          image_base64: base64Image
        })
      });

      const data = await res.json();
      if (res.ok) {
        return true;
      } else {
        setErrorMsg(data.detail || 'Khuôn mặt chưa đạt tiêu chuẩn. Đang thử lại...');
        return false;
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối khi gửi dữ liệu khuôn mặt.');
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-3xl p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 my-auto">
        {/* Header Alert & Progress */}
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
              🛡️ Quy Trình Tự Động Quét KYC 4 Góc Mặt
            </span>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-400 font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 transition"
            >
              Đăng Xuất
            </button>
          </div>

          <h2 className="text-2xl font-bold text-white">
            Xác Thực Khuôn Mặt: <span className="text-indigo-400">{user.full_name} ({user.code})</span>
          </h2>

          {/* 4 Steps Visual Badges - Turn Green on Completion */}
          <div className="grid grid-cols-4 gap-2.5 pt-1">
            {KYC_ANGLES.map((ang, idx) => {
              const isDone = capturedAngles[ang.key];
              const isCurrent = idx === currentStepIndex && isAutoScanning;

              return (
                <div
                  key={ang.key}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isDone
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-600/10 ring-1 ring-emerald-500/30'
                      : isCurrent
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg ring-2 ring-indigo-500/40 animate-pulse'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-sm font-bold">{ang.icon} {ang.key}</div>
                  <div className="text-[11px] mt-1 font-semibold">
                    {isDone ? '✓ Đã Xanh' : isCurrent ? 'Đang quét...' : 'Chờ quét'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status & Error Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
            ⚠️ {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            ✨ {statusMsg}
          </div>
        )}

        {/* Dynamic Guidance Banner */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
          <span className="text-3xl">{currentAngle.icon}</span>
          <div>
            <div className="text-sm font-bold text-white">Bước {currentStepIndex + 1}/4: {currentAngle.label}</div>
            <div className="text-xs text-indigo-300 mt-0.5">{currentAngle.guide}</div>
          </div>
        </div>

        {/* Live Camera Feed Container */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-900 aspect-video flex items-center justify-center shadow-inner">
          <canvas ref={canvasRef} className="hidden" />

          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && streamRef.current && el.srcObject !== streamRef.current) {
                el.srcObject = streamRef.current;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover camera-mirror-preview rounded-2xl"
          />

          {!cameraActive && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <span className="text-3xl">🎥</span>
              <p className="text-xs text-slate-300 font-semibold max-w-sm">
                Vui lòng kiểm tra biểu tượng Camera trên thanh địa chỉ trình duyệt và bấm "Cho phép" (Allow) để kích hoạt Live Camera KYC.
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Mở Lại Camera
              </button>
            </div>
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
              <div className="w-24 h-24 rounded-full bg-indigo-600/80 border-4 border-white flex items-center justify-center text-4xl font-black text-white shadow-2xl animate-bounce">
                {countdown}
              </div>
            </div>
          )}

          {/* Dynamic Oval Target Guideline */}
          <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-56 h-64 border-2 border-dashed border-indigo-400/60 rounded-full flex flex-col items-center justify-center bg-indigo-950/10 backdrop-blur-[1px]">
              <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider bg-slate-900/90 px-3 py-1.5 rounded-full border border-indigo-500/30 shadow-lg">
                {currentAngle.icon} {currentAngle.key}
              </span>
            </div>
          </div>
        </div>

        {/* Single Start Auto-Scan Sequence Button */}
        <button
          type="button"
          onClick={startAutoScanSequence}
          disabled={!cameraActive || isAutoScanning}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isAutoScanning ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang Tự Động Quét 4 Bước KYC...</span>
            </>
          ) : (
            '🚀 Bắt Đầu Tự Động Quét 4 Góc Mặt KYC'
          )}
        </button>
      </div>
    </div>
  );
}
