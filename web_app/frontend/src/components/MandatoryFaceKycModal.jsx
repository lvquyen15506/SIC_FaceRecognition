import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const KYC_ANGLES = [
  { key: 'FRONT', displayLabel: 'TRỰC DIỆN', label: '1. Nhìn Thẳng Chính Diện', guide: 'Giữ đầu thẳng và nhìn trực diện vào Camera', icon: '😐' },
  { key: 'LEFT', displayLabel: 'QUAY TRÁI', label: '2. Quay Nhẹ Sang Trái', guide: 'Quay nhẹ mặt sang BÊN TRÁI khoảng 25 độ', icon: '👈' },
  { key: 'RIGHT', displayLabel: 'QUAY PHẢI', label: '3. Quay Nhẹ Sang Phải', guide: 'Quay nhẹ mặt sang BÊN PHẢI khoảng 25 độ', icon: '👉' },
  { key: 'TILT', displayLabel: 'NGỬA CẰM', label: '4. Ngửa Nhẹ Cằm Lên', guide: 'Ngửa nhẹ cằm LÊN TRÊN khoảng 15 độ', icon: '👆' },
  { key: 'DOWN', displayLabel: 'CÚI ĐẦU', label: '5. Cúi Nhẹ Đầu Xuống', guide: 'Cúi nhẹ cằm XUỐNG DƯỚI khoảng 15 độ', icon: '👇' }
];

const SAMPLES_PER_STEP = 24; // 24 samples per angle (Total 120 samples across 5 steps)

export default function MandatoryFaceKycModal({ user, token, onKycSuccess, onLogout }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepSampleCounts, setStepSampleCounts] = useState([0, 0, 0, 0, 0]);
  const [stepProgress, setStepProgress] = useState(0);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Đưa khuôn mặt vào khung elip và bấm "Bắt Đầu Lấy Khuôn Mặt"');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPoseMatched, setIsPoseMatched] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Refs for tracking loop state cleanly without stale closures
  const currentStepRef = useRef(0);
  const stepSamplesRef = useRef([0, 0, 0, 0, 0]);
  const capturedImagesRef = useRef({});
  const isSavingRef = useRef(false);
  const lastMsgRef = useRef('');

  const currentAngle = KYC_ANGLES[currentStepIndex];

  useEffect(() => {
    initCameraStream();
    return () => {
      stopCameraStream();
      stopSilentScanLoop();
    };
  }, []);

  const initCameraStream = async () => {
    setErrorMsg('');
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      mediaStreamRef.current = stream;
      setHasCameraStream(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      setHasCameraStream(false);
      setErrorMsg('Không thể truy cập Camera. Vui lòng cấp quyền webcam trên trình duyệt.');
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setHasCameraStream(false);
  };

  const stopSilentScanLoop = () => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
  };

  const updateStatusText = (newMsg) => {
    if (lastMsgRef.current !== newMsg) {
      lastMsgRef.current = newMsg;
      setStatusMsg(newMsg);
    }
  };

  // Start 5-Step Auto Scanner (24 Samples Per Angle = 120 Total Samples)
  const startSilentKycProcess = () => {
    setIsScanning(true);
    currentStepRef.current = 0;
    stepSamplesRef.current = [0, 0, 0, 0, 0];
    capturedImagesRef.current = {};
    setCurrentStepIndex(0);
    setStepSampleCounts([0, 0, 0, 0, 0]);
    setStepProgress(0);
    setIsPoseMatched(false);
    updateStatusText(`🔍 [Bước 1/5]: ${KYC_ANGLES[0].guide}...`);

    stopSilentScanLoop();

    scanLoopRef.current = setInterval(async () => {
      if (isSavingRef.current) return;

      const stepIdx = currentStepRef.current;
      if (stepIdx >= KYC_ANGLES.length) {
        stopSilentScanLoop();
        return;
      }

      const targetAngle = KYC_ANGLES[stepIdx];
      const checkRes = await performSilentQualityCheck(targetAngle.key);

      if (!checkRes) {
        setIsPoseMatched(false);
        return;
      }

      if (!checkRes.pass) {
        setIsPoseMatched(false);
        updateStatusText(`👉 [${targetAngle.displayLabel}]: ${checkRes.message}`);
      } else {
        // Match! Turn Oval Guide SOLID EMERALD GREEN
        setIsPoseMatched(true);

        stepSamplesRef.current[stepIdx] += 1;
        const currentCount = stepSamplesRef.current[stepIdx];

        // Calculate smooth progress percentage (0% to 100%)
        const pct = Math.min(100, Math.round((currentCount / SAMPLES_PER_STEP) * 100));
        setStepProgress(pct);

        if (checkRes.image_base64) {
          capturedImagesRef.current[targetAngle.key] = checkRes.image_base64;
        }

        // Stable status text during sample collection without numbers flickering
        updateStatusText(`📸 [${targetAngle.displayLabel}]: Đang tự động thu thập dữ liệu sinh trắc...`);

        // If this angle collected samples, advance to next angle!
        if (currentCount >= SAMPLES_PER_STEP) {
          setStepSampleCounts([...stepSamplesRef.current]);
          const nextStep = stepIdx + 1;
          currentStepRef.current = nextStep;

          if (nextStep < KYC_ANGLES.length) {
            setCurrentStepIndex(nextStep);
            setStepProgress(0);
            setIsPoseMatched(false);
            const nextAngleConfig = KYC_ANGLES[nextStep];
            updateStatusText(`🎉 Rất tốt! Tiếp theo [Bước ${nextStep + 1}/5]: ${nextAngleConfig.guide}`);
          } else {
            // ALL 5 ANGLES COMPLETE TOTAL! Trigger Atomic Full KYC Save
            stopSilentScanLoop();
            isSavingRef.current = true;
            setStepProgress(100);
            updateStatusText('✨ Đã hoàn thành thu thập dữ liệu 3D Face ID đủ 5 góc! Đang lưu vào CSDL...');

            const saveSuccess = await saveFullKycSession();
            if (saveSuccess) {
              updateStatusText('🎉 HOÀN THÀNH XÁC THỰC 5 GÓC MẶT KYC 3D! Đang mở khóa hệ thống...');
              setTimeout(() => {
                onKycSuccess();
              }, 1500);
            } else {
              setErrorMsg('Lỗi khi lưu dữ liệu sinh trắc 3D. Vui lòng thử lại.');
              setIsScanning(false);
            }
            isSavingRef.current = false;
          }
        }
      }
    }, 250); // Polling ~250ms per frame
  };

  const performSilentQualityCheck = async (angleKey) => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    // Only resize canvas when dimensions change to prevent DOM layout flickering
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const res = await fetch('/api/v1/enrollment/check-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle_label: angleKey, image_base64: base64Image })
      });
      const data = await res.json();
      if (data) {
        data.image_base64 = base64Image;
      }
      return data;
    } catch (err) {
      return null;
    }
  };

  const saveFullKycSession = async () => {
    try {
      const res = await fetch('/api/v1/enrollment/save-full-kyc-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          angles: capturedImagesRef.current
        })
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto">
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-4 sm:space-y-6 my-auto max-h-[96vh] overflow-y-auto">
        {/* Header Alert & Progress */}
        <div className="space-y-3 sm:space-y-4 border-b border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider flex items-center gap-1">
              🛡️ Quét 3D Face ID Đa Góc Độ
            </span>
            <button
              onClick={onLogout}
              className="text-[11px] sm:text-xs text-slate-400 hover:text-red-400 font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 border border-slate-700 transition"
            >
              Đăng Xuất
            </button>
          </div>

          <h2 className="text-lg sm:text-2xl font-bold text-white">
            Xác Thực Khuôn Mặt: <span className="text-indigo-400">{user.full_name} ({user.code})</span>
          </h2>

          {/* 5 Steps Visual Badges */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2.5 pt-1">
            {KYC_ANGLES.map((ang, idx) => {
              const count = stepSampleCounts[idx] || 0;
              const isDone = count >= SAMPLES_PER_STEP;
              const isCurrent = idx === currentStepIndex && isScanning;

              return (
                <div
                  key={ang.key}
                  className={`py-2 px-1 sm:py-3.5 sm:px-2 rounded-xl sm:rounded-2xl border text-center transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 font-bold text-[10px] sm:text-xs leading-tight ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                      : isCurrent
                      ? 'bg-indigo-600/60 border-indigo-400 text-white ring-2 ring-indigo-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="text-xs sm:text-sm shrink-0">{ang.icon}</span>
                  <span className="truncate max-w-full whitespace-nowrap">{ang.displayLabel}</span>
                  {isDone && <span className="text-[10px] sm:text-xs">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Guidance & Active Smooth Progress Bar Banner */}
        {errorMsg ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        ) : (
          <div className="p-3 sm:p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-2xl sm:text-3xl shrink-0">{currentAngle.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  Bước {currentStepIndex + 1}/{KYC_ANGLES.length}: {currentAngle.label}
                </div>
                <div className="text-[11px] sm:text-xs text-indigo-300 mt-0.5 truncate">{statusMsg}</div>
              </div>
            </div>

            {/* Smooth Auto Animating Step Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${stepProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Camera Feed Box */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-900 aspect-[4/3] sm:aspect-video flex items-center justify-center shadow-inner">
          <canvas ref={canvasRef} className="hidden" />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover camera-mirror-preview rounded-2xl"
          />

          {!hasCameraStream && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 sm:space-y-4 z-10">
              <span className="text-3xl sm:text-4xl">🎥</span>
              <p className="text-xs text-slate-300 font-semibold max-w-sm">
                Cấp quyền truy cập Camera thiết bị để quét khuôn mặt 3D.
              </p>
              <button
                type="button"
                onClick={initCameraStream}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                🎥 Bật Camera
              </button>
            </div>
          )}

          {/* Dynamic Target Oval Guide (Turns SOLID EMERALD GREEN when face/pose is matched!) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2">
            <div
              className={`w-44 h-52 sm:w-56 sm:h-64 max-h-[88%] max-w-[72%] rounded-full flex flex-col items-center justify-center backdrop-blur-[1px] transition-all duration-300 ${
                isPoseMatched
                  ? 'border-4 border-emerald-400 bg-emerald-500/15 shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-[1.02]'
                  : 'border-2 border-dashed border-indigo-400/70 bg-indigo-950/10 shadow-2xl'
              }`}
            >
              <span
                className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border shadow-lg transition-all duration-300 whitespace-nowrap ${
                  isPoseMatched
                    ? 'bg-emerald-600 text-white border-emerald-300 shadow-emerald-600/40'
                    : 'bg-slate-900/90 text-indigo-200 border-indigo-500/40'
                }`}
              >
                {currentAngle.icon} {currentAngle.displayLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Start Scanner Button */}
        <button
          type="button"
          onClick={startSilentKycProcess}
          disabled={isScanning}
          className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang Tự Động Thu Thập Dữ Liệu 3D Face ID...</span>
            </>
          ) : (
            '🚀 Bắt Đầu Lấy Khuôn Mặt (3D Face ID)'
          )}
        </button>
      </div>
    </div>,
    document.body
  );
}
