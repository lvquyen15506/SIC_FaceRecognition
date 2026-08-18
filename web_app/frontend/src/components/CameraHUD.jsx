import React, { useRef, useState, useEffect } from 'react';

export default function CameraHUD({ token, onEnrollSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [feedback, setFeedback] = useState({ pass: false, message: 'Đang mở webcam...', status: 'INIT' });
  const [completedAngles, setCompletedAngles] = useState([]);

  const anglesList = [
    { key: 'FRONT', label: '1. Nhìn Trực diện' },
    { key: 'LEFT', label: '2. Nghiêng Trái 30°' },
    { key: 'RIGHT', label: '3. Nghiêng Phải 30°' },
    { key: 'TILT', label: '4. Cúi / Ngẩng mặt' },
  ];

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setFeedback({ pass: false, message: 'Không thể truy cập Camera. Vui lòng cấp quyền webcam!', status: 'ERROR' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureFrameBase64 = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCapture = async () => {
    const base64Img = captureFrameBase64();
    if (!base64Img) return;

    const currentAngle = anglesList[activeAngleIndex];
    setFeedback({ pass: false, message: 'Đang phân tích chất lượng ảnh...', status: 'CHECKING' });

    try {
      const res = await fetch('/api/v1/enrollment/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          angle_label: currentAngle.key,
          image_base64: base64Img
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ pass: false, message: data.detail || 'Ảnh chưa đạt chất lượng', status: 'WARN' });
      } else {
        setFeedback({ pass: true, message: `✅ Đã lưu thành công góc: ${currentAngle.label}`, status: 'PASS' });
        setCompletedAngles(prev => [...prev, currentAngle.key]);

        if (activeAngleIndex < anglesList.length - 1) {
          setTimeout(() => {
            setActiveAngleIndex(prev => prev + 1);
            setFeedback({ pass: false, message: 'Sẵn sàng cho góc mặt tiếp theo', status: 'READY' });
          }, 1200);
        } else {
          onEnrollSuccess && onEnrollSuccess();
        }
      }
    } catch (err) {
      setFeedback({ pass: false, message: 'Lỗi kết nối máy chủ', status: 'ERROR' });
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 max-w-2xl mx-auto text-center space-y-6">
      {/* Title & Step Guidance */}
      <div>
        <h3 className="text-xl font-bold text-white mb-1">Thu Thập Dữ Liệu Khuôn Mặt Đa Góc Độ</h3>
        <p className="text-xs text-slate-400">
          Đang thực hiện góc: <span className="text-blue-400 font-semibold">{anglesList[activeAngleIndex].label}</span>
        </p>
      </div>

      {/* Camera Viewport with Mirrored Preview & Oval Biometric HUD */}
      <div className="relative w-full max-w-md mx-auto aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover camera-mirror-preview"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Oval Biometric Guide HUD Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-48 h-64 rounded-[50%] border-4 transition-all duration-300 shadow-[0_0_50px_rgba(0,0,0,0.8)] ${
              feedback.status === 'PASS'
                ? 'border-emerald-500 shadow-emerald-500/30'
                : feedback.status === 'WARN'
                ? 'border-amber-500 shadow-amber-500/30'
                : 'border-blue-500 shadow-blue-500/20'
            }`}
          />
        </div>

        {/* Real-time Status Badge */}
        <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
          <div className="inline-block px-4 py-2 rounded-xl glass-card backdrop-blur-md border border-slate-700/80 text-xs font-semibold shadow-lg">
            <span className={feedback.pass ? 'text-emerald-400' : 'text-amber-400'}>
              {feedback.message}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Tracker (4 Angle Cards) */}
      <div className="grid grid-cols-4 gap-2">
        {anglesList.map((item, idx) => {
          const isDone = completedAngles.includes(item.key);
          const isActive = idx === activeAngleIndex;
          return (
            <div
              key={item.key}
              className={`p-2.5 rounded-xl text-xs font-medium border transition-all ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : isActive
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-mono-grotesk font-bold mb-0.5">GÓC {idx + 1}</div>
              <div className="text-[10px] opacity-80">{item.key}</div>
            </div>
          );
        })}
      </div>

      {/* Capture Button */}
      <button
        onClick={handleCapture}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98]"
      >
        Chụp Góc Mặt ({anglesList[activeAngleIndex].key})
      </button>
    </div>
  );
}
