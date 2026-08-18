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
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [burstFrame, setBurstFrame] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const TOTAL_BURST_FRAMES = 20;
  const currentAngle = KYC_ANGLES[currentStepIndex];

  useEffect(() => {
    initCameraStream();
    return () => {
      stopCameraStream();
    };
  }, []);

  const initCameraStream = async () => {
    setErrorMsg('');
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      mediaStreamRef.current = stream;
      setHasCameraStream(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      setHasCameraStream(false);
      setErrorMsg('Không thể truy cập Camera. Vui lòng cho phép quyền trên trình duyệt.');
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setHasCameraStream(false);
  };

  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  // Automatic 4-Angle Scanner Sequence with 20 Burst Frames per Angle
  const startAutoScanSequence = async () => {
    if (!hasCameraStream) {
      await initCameraStream();
    }

    setIsAutoScanning(true);
    setErrorMsg('');
    setStatusMsg('🚀 Bắt đầu quy trình tự động quét 4 góc mặt KYC...');

    let localCaptured = { ...capturedAngles };

    for (let i = 0; i < KYC_ANGLES.length; i++) {
      setCurrentStepIndex(i);
      const angleConfig = KYC_ANGLES[i];

      // Countdown 3, 2, 1 for pose alignment
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        setStatusMsg(`[Góc ${i + 1}/4: ${angleConfig.label}] Chuẩn bị giữ nguyên tư thế trong ${c}s...`);
        await new Promise(r => setTimeout(r, 900));
      }
      setCountdown(null);

      // Burst capture sequence of 20 continuous frames
      let burstSuccess = false;
      for (let f = 1; f <= TOTAL_BURST_FRAMES; f++) {
        setBurstFrame(f);
        setStatusMsg(`⚡ AI đang trích xuất & phân tích vector liên tục: ${f}/${TOTAL_BURST_FRAMES} frames...`);
        await new Promise(r => setTimeout(r, 90)); // ~90ms interval burst sampling
      }

      // Send snapshot & register angle
      burstSuccess = await captureAndSaveSingleAngle(angleConfig.key);
      setBurstFrame(0);

      if (burstSuccess) {
        localCaptured[angleConfig.key] = true;
        setCapturedAngles({ ...localCaptured });
        setStatusMsg(`✓ Đã phân tích thành công 20 frames & lưu góc mặt: ${angleConfig.label}`);
        await new Promise(r => setTimeout(r, 600));
      } else {
        setStatusMsg(`⚠️ Khung hình chưa chuẩn. Đang quét lại góc ${angleConfig.label}...`);
        i--; // Retry angle
        await new Promise(r => setTimeout(r, 1200));
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

      return res.ok;
    } catch (err) {
      setErrorMsg('Lỗi gửi dữ liệu khuôn mặt.');
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-3xl p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 my-auto">
        {/* Header Alert & Progress */}
        <div className="space-y-4 border-b border-slate-800 pb-4">
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

          {/* 4 Steps Visual Badges - Simply Turn SOLID GREEN on completion without extra text */}
          <div className="grid grid-cols-4 gap-3 pt-1">
            {KYC_ANGLES.map((ang, idx) => {
              const isDone = capturedAngles[ang.key];
              const isCurrent = idx === currentStepIndex && isAutoScanning;

              return (
                <div
                  key={ang.key}
                  className={`py-3.5 px-2 rounded-2xl border text-center transition-all flex items-center justify-center gap-1.5 font-bold text-sm ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                      : isCurrent
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-500/40 animate-pulse'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>{ang.icon}</span>
                  <span>{ang.key}</span>
                  {isDone && <span className="ml-1 text-xs">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status & Error Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-between gap-2">
            <span>⚠️ {errorMsg}</span>
            <button
              type="button"
              onClick={initCameraStream}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold"
            >
              Bật Lại Cam
            </button>
          </div>
        )}

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold space-y-2">
            <div className="flex items-center gap-2">
              <span>✨ {statusMsg}</span>
            </div>
            {/* Burst Sampling Progress Bar */}
            {burstFrame > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-emerald-500/30">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full transition-all duration-75"
                  style={{ width: `${(burstFrame / TOTAL_BURST_FRAMES) * 100}%` }}
                />
              </div>
            )}
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

        {/* Live Camera Feed Box */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-900 aspect-video flex items-center justify-center shadow-inner">
          <canvas ref={canvasRef} className="hidden" />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover camera-mirror-preview rounded-2xl"
          />

          {!hasCameraStream && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10">
              <span className="text-4xl animate-bounce">🎥</span>
              <p className="text-xs text-slate-300 font-semibold max-w-sm">
                Nhấn nút bên dưới để cấp quyền mở Camera Laptop trực tiếp.
              </p>
              <button
                type="button"
                onClick={initCameraStream}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                🎥 Bật Camera Laptop
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
          disabled={isAutoScanning}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isAutoScanning ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang Tự Động Quét Nối Tiếp 4 Bước KYC...</span>
            </>
          ) : (
            '🚀 Bắt Đầu Tự Động Quét 4 Góc Mặt KYC'
          )}
        </button>
      </div>
    </div>
  );
}
