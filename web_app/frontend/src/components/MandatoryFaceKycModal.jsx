import React, { useState, useRef, useEffect } from 'react';

const KYC_ANGLES = [
  { key: 'FRONT', label: '1. Nhìn Thẳng Chính Diện', guide: 'Hãy giữ đầu thẳng và nhìn trực diện vào Camera', icon: '😐' },
  { key: 'LEFT', label: '2. Quay Nhẹ Sang Trái', guide: 'Hãy quay nhẹ mặt sang bên trái khoảng 20-30 độ', icon: '👈' },
  { key: 'RIGHT', label: '3. Quay Nhẹ Sang Phải', guide: 'Hãy quay nhẹ mặt sang bên phải khoảng 20-30 độ', icon: '👉' },
  { key: 'TILT', label: '4. Ngửa Nhẹ Đầu Lên', guide: 'Hãy ngửa nhẹ cằm lên phía trên khoảng 15 độ', icon: '👆' }
];

export default function MandatoryFaceKycModal({ user, token, onKycSuccess, onLogout }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedAngles, setCapturedAngles] = useState({});
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const currentAngle = KYC_ANGLES[currentStepIndex];

  useEffect(() => {
    let active = true;

    async function startCameraStream() {
      setErrorMsg('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraActive(true);
        }
      } catch (err) {
        if (active) {
          setCameraActive(false);
          setErrorMsg('Không thể kết nối Camera. Vui lòng cho phép quyền truy cập Camera trong Cài đặt Trình duyệt và thử lại.');
        }
      }
    }

    startCameraStream();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Ensure video plays when element mounts or updates
  const handleVideoCanPlay = () => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  };

  const captureAndSaveAngle = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setErrorMsg('');
    setStatusMsg(`AI đang phân tích & trích xuất vector góc mặt ${currentAngle.label}...`);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    // Mirror horizontally for natural camera feed
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
          angle_label: currentAngle.key,
          image_base64: base64Image
        })
      });

      const data = await res.json();
      if (res.ok) {
        const newCaptured = { ...capturedAngles, [currentAngle.key]: base64Image };
        setCapturedAngles(newCaptured);
        setStatusMsg(`✓ Đã ghi nhận góc mặt: ${currentAngle.label}`);

        if (currentStepIndex < KYC_ANGLES.length - 1) {
          setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
            setStatusMsg('');
          }, 800);
        } else {
          // Completed all 4 KYC angles!
          setStatusMsg('🎉 HOÀN THÀNH XÁC THỰC 4 GÓC MẶT KYC! Đang mở khóa hệ thống...');
          setTimeout(() => {
            onKycSuccess();
          }, 1500);
        }
      } else {
        setErrorMsg(data.detail || 'Khuôn mặt chưa khớp với yêu cầu góc quét. Vui lòng làm theo đúng hướng dẫn!');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối khi gửi dữ liệu khuôn mặt.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-3xl p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 my-auto">
        {/* Header Alert & Progress */}
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
              🛡️ Quy Trình Xác Thực Live KYC 4 Góc Mặt
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

          {/* 4 Steps Progress Bar */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {KYC_ANGLES.map((ang, idx) => (
              <div
                key={ang.key}
                className={`p-2 rounded-xl border text-center transition ${
                  idx === currentStepIndex
                    ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg ring-2 ring-indigo-500/30'
                    : capturedAngles[ang.key]
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-xs font-bold">{ang.icon} {ang.key}</div>
                <div className="text-[10px] mt-0.5 font-semibold">
                  {capturedAngles[ang.key] ? '✓ Đã quét' : idx === currentStepIndex ? 'Đang thực hiện' : 'Chờ'}
                </div>
              </div>
            ))}
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

        {/* Guidance Banner for Active Angle */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
          <span className="text-3xl">{currentAngle.icon}</span>
          <div>
            <div className="text-sm font-bold text-white">Bước {currentStepIndex + 1}/4: {currentAngle.label}</div>
            <div className="text-xs text-indigo-300 mt-0.5">{currentAngle.guide}</div>
          </div>
        </div>

        {/* Live Camera Video Feed Box */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-900 aspect-video flex items-center justify-center shadow-inner">
          <canvas ref={canvasRef} className="hidden" />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={handleVideoCanPlay}
            className="w-full h-full object-cover camera-mirror-preview rounded-2xl"
          />

          {!cameraActive && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <span className="text-3xl">🎥</span>
              <p className="text-xs text-slate-300 font-semibold max-w-sm">
                Vui lòng kiểm tra biểu tượng Camera trên thanh địa chỉ trình duyệt và bấm "Cho phép" (Allow) để kích hoạt Live Camera KYC.
              </p>
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

        {/* Main Action Button */}
        <button
          type="button"
          onClick={captureAndSaveAngle}
          disabled={!cameraActive || isProcessing}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>AI Đang Kiểm Tra &amp; Trích Xuất Vector...</span>
            </>
          ) : (
            `📷 Quét &amp; Đăng Ký Góc Mặt: ${currentAngle.label}`
          )}
        </button>
      </div>
    </div>
  );
}
