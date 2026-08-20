import React, { useState, useRef, useEffect } from 'react';

const KYC_ANGLES = [
  { key: 'FRONT', label: '1. Nhìn Thẳng Chính Diện', guide: 'Giữ đầu thẳng và nhìn trực diện vào Camera', icon: '😐' },
  { key: 'LEFT', label: '2. Quay Nhẹ Sang Trái', guide: 'Quay nhẹ mặt sang BÊN TRÁI khoảng 25 độ', icon: '👈' },
  { key: 'RIGHT', label: '3. Quay Nhẹ Sang Phải', guide: 'Quay nhẹ mặt sang BÊN PHẢI khoảng 25 độ', icon: '👉' },
  { key: 'TILT', label: '4. Ngửa Nhẹ Cằm Lên', guide: 'Ngửa nhẹ cằm LÊN TRÊN khoảng 15 độ', icon: '👆' }
];

export default function MandatoryFaceKycModal({ user, token, onKycSuccess, onLogout }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedAngles, setCapturedAngles] = useState({});
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Hãy căn chỉnh mặt vào khung Oval và bấm "Bắt Đầu"');
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedBox, setDetectedBox] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Refs for tracking loop state cleanly without stale closures or React flickering
  const currentStepRef = useRef(0);
  const capturedRef = useRef({});
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
      setErrorMsg('Không thể truy cập Camera. Vui lòng cấp quyền truy cập trình duyệt.');
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

  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const updateStatusText = (newMsg) => {
    if (lastMsgRef.current !== newMsg) {
      lastMsgRef.current = newMsg;
      setStatusMsg(newMsg);
    }
  };

  // Start Silent Background Capture Loop ("Chụp Ngầm AI Real-Time")
  const startSilentKycProcess = () => {
    setIsScanning(true);
    currentStepRef.current = 0;
    capturedRef.current = {};
    setCurrentStepIndex(0);
    setCapturedAngles({});
    updateStatusText(`🔍 AI đang định vị tư thế 3D. ${KYC_ANGLES[0].guide}...`);

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

      if (!checkRes) return;

      if (checkRes.box) {
        setDetectedBox(checkRes.box);
      } else {
        setDetectedBox(null);
      }

      if (!checkRes.pass) {
        updateStatusText(`👉 [${targetAngle.key}]: ${checkRes.message}`);
      } else {
        // Pose matched! Trigger Silent Background Save ("Chụp Ngầm")
        isSavingRef.current = true;
        updateStatusText(`✨ Đã khớp tư thế ${targetAngle.key}! Đang lưu dữ liệu sinh trắc...`);

        const saveSuccess = await saveFaceEmbeddingSilent(targetAngle.key);

        if (saveSuccess) {
          capturedRef.current[targetAngle.key] = true;
          setCapturedAngles({ ...capturedRef.current });

          const nextStep = stepIdx + 1;
          currentStepRef.current = nextStep;

          if (nextStep < KYC_ANGLES.length) {
            setCurrentStepIndex(nextStep);
            const nextAngleConfig = KYC_ANGLES[nextStep];
            updateStatusText(`🎉 Rất tốt! Tiếp theo: ${nextAngleConfig.guide}`);
          } else {
            // All 4 angles complete!
            stopSilentScanLoop();
            updateStatusText('🎉 HOÀN THÀNH XÁC THỰC 4 GÓC MẶT KYC! Đang mở khóa hệ thống...');
            setTimeout(() => {
              onKycSuccess();
            }, 1500);
          }
        }
        isSavingRef.current = false;
      }
    }, 450); // Polling interval ~450ms
  };

  const performSilentQualityCheck = async (angleKey) => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    // IMPORTANT: Reset transform before matrix flip to prevent alternating flip/unflip bug!
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
      return await res.json();
    } catch (err) {
      return null;
    }
  };

  const saveFaceEmbeddingSilent = async (angleKey) => {
    if (!videoRef.current || !canvasRef.current) return false;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    const base64Image = canvas.toDataURL('image/jpeg', 0.9);

    try {
      const res = await fetch('/api/v1/enrollment/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ angle_label: angleKey, image_base64: base64Image })
      });
      return res.ok;
    } catch (err) {
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
              🛡️ Quét 3D Face ID KYC
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

          {/* 4 Steps Visual Badges */}
          <div className="grid grid-cols-4 gap-3 pt-1">
            {KYC_ANGLES.map((ang, idx) => {
              const isDone = capturedAngles[ang.key];
              const isCurrent = idx === currentStepIndex && isScanning;

              return (
                <div
                  key={ang.key}
                  className={`py-3.5 px-2 rounded-2xl border text-center transition-all duration-300 flex items-center justify-center gap-1.5 font-bold text-sm ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                      : isCurrent
                      ? 'bg-indigo-600/60 border-indigo-400 text-white ring-2 ring-indigo-500/50'
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

        {/* Live Guidance Banner */}
        {errorMsg ? (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
            <span className="text-3xl">{currentAngle.icon}</span>
            <div>
              <div className="text-sm font-bold text-white">Bước {currentStepIndex + 1}/4: {currentAngle.label}</div>
              <div className="text-xs text-indigo-300 mt-0.5">{statusMsg}</div>
            </div>
          </div>
        )}

        {/* Silent Live Camera Feed Box */}
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
              <span className="text-4xl">🎥</span>
              <p className="text-xs text-slate-300 font-semibold max-w-sm">
                Cấp quyền truy cập Camera Laptop để tự động quét tư thế khuôn mặt 3D.
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

          {/* Dynamic AI Bounding Box Overlay (Reference: src/app_modules/test_pose_liveness.py) */}
          {detectedBox && (
            <div
              className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded-xl transition-all duration-150 pointer-events-none flex items-start justify-center"
              style={{
                // Flip X position for mirrored preview
                left: `${100 - ((detectedBox[0] + detectedBox[2]) / 640) * 100}%`,
                top: `${(detectedBox[1] / 480) * 100}%`,
                width: `${(detectedBox[2] / 640) * 100}%`,
                height: `${(detectedBox[3] / 480) * 100}%`
              }}
            >
              <span className="text-[10px] font-mono-grotesk font-bold text-white bg-emerald-600/90 px-2 py-0.5 rounded-b-md shadow">
                {currentAngle.key} AI DETECTED
              </span>
            </div>
          )}

          {/* Dynamic Oval Target Guideline */}
          <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-56 h-64 border-2 border-dashed border-indigo-400/70 rounded-full flex flex-col items-center justify-center bg-indigo-950/10 backdrop-blur-[1px] shadow-2xl">
              <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider bg-slate-900/90 px-3 py-1.5 rounded-full border border-indigo-500/40 shadow-lg">
                {currentAngle.icon} {currentAngle.key}
              </span>
            </div>
          </div>
        </div>

        {/* Start Silent Scanner Button */}
        <button
          type="button"
          onClick={startSilentKycProcess}
          disabled={isScanning}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang Tự Động Nhận Diện &amp; Quét Ngầm Tư Thế 3D...</span>
            </>
          ) : (
            '🚀 Bắt Đầu Tự Động Quét Ngầm 3D Face ID'
          )}
        </button>
      </div>
    </div>
  );
}
