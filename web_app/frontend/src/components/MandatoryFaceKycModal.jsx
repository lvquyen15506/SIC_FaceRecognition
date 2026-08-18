import React, { useState, useRef, useEffect } from 'react';

export default function MandatoryFaceKycModal({ user, token, onKycSuccess, onLogout }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
      }
      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
      setErrorMsg('Không thể mở Camera. Vui lòng cho phép quyền truy cập Camera hoặc chọn tải tệp ảnh khuôn mặt.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    // Mirror horizontally for natural view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(base64);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterFace = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setStatusMsg('AI đang phân tích khuôn mặt & trích xuất Đặc trưng Vector 512-d...');
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/enrollment/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          angle_label: 'FRONT',
          image_base64: capturedImage
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg('✓ ĐĂNG KÝ KHUÔN MẶT THÀNH CÔNG! Đang mở khóa hệ thống...');
        setTimeout(() => {
          onKycSuccess();
        }, 1200);
      } else {
        setErrorMsg(data.detail || 'Khuôn mặt chưa đạt tiêu chuẩn. Vui lòng nhìn thẳng và đảm bảo đủ ánh sáng.');
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
        {/* Header Alert */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
                🛡️ Yêu Cầu Xác Thực Bắt Buộc (Face KYC)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">Đăng Ký Dữ Liệu Khuôn Mặt Để Vào Hệ Thống</h2>
            <p className="text-xs text-slate-400 mt-1">
              Tài khoản <span className="text-indigo-400 font-semibold">{user.full_name} ({user.code})</span> chưa có dữ liệu điểm danh. Bạn cần đăng ký ảnh mặt chính diện để mở khóa tính năng hệ thống.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-red-400 font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 transition"
          >
            Đăng Xuất
          </button>
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

        {/* Main Camera / Captured Image Preview Area */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center">
          <canvas ref={canvasRef} className="hidden" />

          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured face"
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover camera-mirror-preview rounded-2xl"
            />
          ) : (
            <div className="text-center p-6 text-slate-500 text-xs">
              <span>Camera chưa sẵn sàng. Bạn có thể chọn file ảnh bên dưới.</span>
            </div>
          )}

          {/* Camera Frame Overlay */}
          <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-56 h-64 border-2 border-dashed border-indigo-400/50 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider bg-slate-900/80 px-2 py-1 rounded">
                Đặt Khuôn Mặt Vào Khung
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!capturedImage ? (
              <button
                type="button"
                onClick={handleCapture}
                disabled={!cameraActive}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                📷 Chụp Ảnh Trực Tiếp Từ Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                🔄 Chụp Lại / Chọn Ảnh Khác
              </button>
            )}

            <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 cursor-pointer transition flex items-center gap-1.5">
              📁 Tải Ảnh Từ Máy Tính
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleRegisterFace}
            disabled={!capturedImage || isProcessing}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>AI Đang Kiểm Tra Chất Lượng &amp; Lưu Vector 512-d...</span>
              </>
            ) : (
              '🚀 Xác Thực & Đăng Ký Khuôn Mặt Để Vào Hệ Thống'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
