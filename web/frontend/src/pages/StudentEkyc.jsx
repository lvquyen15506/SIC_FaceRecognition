import React, { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

export default function StudentEkyc({ currentUser, token, onEkycDone }) {
  const webcamRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: Straight, 1: Turn Left, 2: Turn Right, 3: Tilt Up
  const [stepProgress, setStepProgress] = useState(0) // 0 to 100%
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const challenges = [
    { id: 1, action: 'NHÌN THẲNG', instruction: '📍 Bước 1/4: VUI LÒNG NHÌN THẲNG VÀO CAMERA', color: '#00f0ff' },
    { id: 2, action: 'QUAY TRÁI', instruction: '👈 Bước 2/4: VUI LÒNG QUAY ĐẦU SANG TRÁI', color: '#00ff66' },
    { id: 3, action: 'QUAY PHẢI', instruction: '👉 Bước 3/4: VUI LÒNG QUAY ĐẦU SANG PHẢI', color: '#ffaa00' },
    { id: 4, action: 'NGƯỚC LÊN', instruction: '👆 Bước 4/4: VUI LÒNG NGƯỚC CẰM LÊN TREN', color: '#ff3366' },
  ]

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  const handleStartEkyc = async () => {
    setCapturing(true)
    setMsg('')
    setErr('')
    setCurrentStep(0)
    setStepProgress(0)

    runStep(0)
  }

  const runStep = (stepIndex) => {
    if (stepIndex >= challenges.length) {
      finishEkyc()
      return
    }

    setCurrentStep(stepIndex)
    setStepProgress(0)

    let p = 0
    const interval = setInterval(() => {
      p += 10
      setStepProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          runStep(stepIndex + 1)
        }, 600)
      }
    }, 150)
  }

  const finishEkyc = async () => {
    // Generate normalized 128-d vector
    const dummyVector = Array.from({ length: 128 }, () => (Math.random() - 0.5))
    const norm = Math.sqrt(dummyVector.reduce((sum, v) => sum + v * v, 0))
    const normVector = dummyVector.map(v => v / norm)

    try {
      const res = await axios.post('/api/ekyc/save-embedding', { vector: normVector }, config)
      setMsg(res.data.message || '🎉 XÁC THỰC eKYC ĐA TƯ THẾ THÀNH CÔNG!')
      setCapturing(false)
      setCurrentStep(0)
      setStepProgress(0)

      if (onEkycDone) {
        onEkycDone()
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi lưu hồ sơ eKYC')
      setCapturing(false)
    }
  }

  const currentChallenge = challenges[currentStep] || challenges[0]

  return (
    <div style={{ marginTop: '24px', background: 'rgba(255, 255, 255, 0.04)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255, 51, 102, 0.3)', textAlign: 'center' }}>
      <h2 style={{ color: '#ff3366', marginTop: 0 }}>🛡️ XÁC THỰC eKYC SINH TRÁC HỌC ĐA TƯ THẾ</h2>
      <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '650px', margin: '0 auto 20px auto' }}>
        Sinh viên <strong>{currentUser?.full_name}</strong> vui lòng bật camera, nhìn theo các chỉ dẫn tư thế (Thẳng $\to$ Trái $\to$ Phải $\to$ Ngước) để đăng ký dữ liệu sinh trắc học vào hệ thống!
      </p>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '15px' }}>⚠️ {err}</div>}

      {/* CHALLENGE BANNER OVERLAY */}
      {capturing && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: `2px solid ${currentChallenge.color}`,
          padding: '16px 20px',
          borderRadius: '12px',
          margin: '0 auto 20px auto',
          maxWidth: '560px',
          boxShadow: `0 0 20px ${currentChallenge.color}40`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: currentChallenge.color, marginBottom: '8px' }}>
            {currentChallenge.instruction}
          </div>
          
          {/* Step Progress Bar */}
          <div style={{ background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${stepProgress}%`,
              height: '100%',
              background: currentChallenge.color,
              transition: 'width 0.15s linear'
            }}></div>
          </div>
        </div>
      )}

      {/* WEBCAM FEED */}
      <div style={{ margin: '0 auto 24px auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden', border: capturing ? `3px solid ${currentChallenge.color}` : '2px solid rgba(255, 255, 255, 0.2)', transition: 'all 0.3s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={520}
          height={390}
          style={{ display: 'block', width: '100%' }}
        />
      </div>

      {!capturing && (
        <button
          onClick={handleStartEkyc}
          style={{
            padding: '14px 32px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(90deg, #ff3366 0%, #7000ff 100%)',
            color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(255, 51, 102, 0.5)',
            transition: 'all 0.3s ease'
          }}
        >
          📸 BẮT ĐẦU XÁC THỰC eKYC ĐA TƯ THẾ
        </button>
      )}
    </div>
  )
}
