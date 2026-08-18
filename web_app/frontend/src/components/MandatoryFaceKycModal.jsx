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
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);

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

  // Single Start Button triggers smooth AI-Validated 4-Angle Scanner Sequence
  const startAutoScanSequence = async () => {
    if (!hasCameraStream) {
      await initCameraStream();
    }

    setIsAutoScanning(true);
    setErrorMsg('');
    setStatusMsg('🚀 Bắt đầu quy trình quét 4 góc mặt KYC chuẩn AI...');

    let localCaptured = { ...capturedAngles };

    for (let i = 0; i < KYC_ANGLES.length; i++) {
      setCurrentStepIndex(i);
      const angleConfig = KYC_ANGLES[i];

      // Step 1: Smooth 3-2-1 countdown overlay without screen flicker
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        setStatusMsg(`[Góc ${i + 1}/4: ${angleConfig.label}] Chuẩn bị giữ nguyên tư thế...`);
        await new Promise(r => setTimeout(r, 900));
      }
      setCountdown(null);

      // Step 2: AI Face Detection & Quality Validation Loop
      setStatusMsg(`🔍 AI đang kiểm tra vị trí & chất lượng khuôn mặt...`);
      let validFaceCaptured = false;
      let attempts = 0;

      while (!validFaceCaptured && attempts < 5) {
        attempts++;
        const checkResult = await validateAndSaveFace(angleConfig.key);

        if (checkResult.pass) {
          validFaceCaptured = true;
          localCaptured[angleConfig.key] = true;
          setCapturedAngles({ ...localCaptured });
          setStatusMsg(`✓ Đã xác thực & lưu thành công góc mặt: ${angleConfig.label}`);
          await new Promise(r => setTimeout(r, 800));
        } else {
          // Display exact guidance message from AI Engine without flickering full screen
          setStatusMsg(`⚠️ ${checkResult.message || 'Chưa phát hiện khuôn mặt. Vui lòng căn chỉnh lại...'}`);
          await new Promise(r => setTimeout(r, 1200));
        }
      }

      if (!validFaceCaptured) {
        // If 5 attempts failed, pause and repeat this step
        setErrorMsg(`Không thể nhận diện góc ${angleConfig.label}. Vui lòng nhìn thẳng vào camera và thử lại.`);
        i--;
        await new Promise(r => setTimeout(r, 1500));
        setErrorMsg('');
      }
    }

    setStatusMsg('🎉 HOÀN THÀNH XÁC THỰC 4 GÓC MẶT KYC! Đang mở khóa hệ thống...');
    setIsAutoScanning(false);
    setTimeout(() => {
      onKycSuccess();
    }, 1500);
  };

  const validateAndSaveFace = async (angleKey) => {
    if (!videoRef.current || !canvasRef.current) return { pass: false, message: 'Camera chưa sẵn sàng' };

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
      // 1. Check AI Image Quality & Face Presence
      const checkRes = await fetch('/api/v1/enrollment/check-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle_label: angleKey, image_base64: base64Image })
      });

      const qualityData = await checkRes.json();

      if (!qualityData.pass) {
        return { pass: false, message: qualityData.message };
      }

      // 2. Save Face Embedding in Database
      const saveRes = await fetch('/api/v1/enrollment/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ angle_label: angleKey, image_base64: base64Image })
      });

      if (saveRes.ok) {
        return { pass: true };
      } else {
        const saveErr = await saveRes.json();
        return { pass: false, message: saveErr.detail || 'Lỗi lưu vector khuôn mặt' };
      }
    } catch (err) {
      return { pass: false, message: 'Lỗi kết nối máy chủ AI' };
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

          {/* 4 Steps Visual Badges - Smooth SOLID GREEN on Completion */}
          <div className="grid grid-cols-4 gap-3 pt-1">
            {KYC_ANGLES.map((ang, idx) => {
              const isDone = capturedAngles[ang.key];
              const isCurrent = idx === currentStepIndex && isAutoScanning;

              return (
                <div
                  key={ang.key}
                  className={`py-3.5 px-2 rounded-2xl border text-center transition-all duration-300 flex items-center justify-center gap-1.5 font-bold text-sm ${
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
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-2">
            <span>✨ {statusMsg}</span>
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

        {/* Smooth Live Camera Feed Box */}
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
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
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
              <span>Đang Quét AI Định Dạng Khuôn Mặt...</span>
            </>
          ) : (
            '🚀 Bắt Đầu Tự Động Quét 4 Góc Mặt KYC'
          )}
        </button>
      </div>
    </div>
  );
}
