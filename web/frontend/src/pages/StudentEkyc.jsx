import React, { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

export default function StudentEkyc({ currentUser, token, onEkycDone }) {
  const webcamRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: NHIN THANG, 1: QUAY TRAI, 2: QUAY PHAI, 3: NGUOC LEN
  const [stepProgress, setStepProgress] = useState(0)
  const [faceDetectedStatus, setFaceDetectedStatus] = useState('Đang đợi khuôn mặt vào vị trí...')
  const [poseMatchedStatus, setPoseMatchedStatus] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const challenges = [
    { id: 1, action: 'NHIN THANG', instruction: '📍 Bước 1/4: VUI LÒNG NHÌN THẲNG VÀO CAMERA', color: '#00f0ff' },
    { id: 2, action: 'QUAY TRAI', instruction: '👈 Bước 2/4: VUI LÒNG QUAY ĐẦU SANG TRÁI', color: '#00ff66' },
    { id: 3, action: 'QUAY PHAI', instruction: '👉 Bước 3/4: VUI LÒNG QUAY ĐẦU SANG PHẢI', color: '#ffaa00' },
    { id: 4, action: 'NGUOC LEN', instruction: '👆 Bước 4/4: VUI LÒNG NGƯỚC CẰM LÊN TRÊN', color: '#ff3366' },
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

    runStep(0, [])
  }

  const runStep = (stepIndex, accumEmbeddings) => {
    if (stepIndex >= challenges.length) {
      finishEkyc(accumEmbeddings)
      return
    }

    setCurrentStep(stepIndex)
    setStepProgress(0)

    let framesCapturedInStep = 0
    const targetFrames = 10
    const currentChallenge = challenges[stepIndex]

    const interval = setInterval(async () => {
      if (!webcamRef.current) return

      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        try {
          const res = await axios.post('/api/ekyc/process-frame', {
            image_base64: imageSrc,
            target_action: currentChallenge.action
          }, config)

          if (res.data.detected) {
            const detectedPose = res.data.detected_pose || 'Khuôn mặt'
            const isMatched = res.data.pose_matched

            setPoseMatchedStatus(isMatched)

            if (isMatched && res.data.embedding) {
              accumEmbeddings.push(res.data.embedding)
              framesCapturedInStep += 1
              setFaceDetectedStatus(`✅ ĐÃ KHỚP TƯ THẾ '${detectedPose}': ${framesCapturedInStep}/${targetFrames} mẫu`)
              setStepProgress(Math.min(100, Math.round((framesCapturedInStep / targetFrames) * 100)))

              if (framesCapturedInStep >= targetFrames) {
                clearInterval(interval)
                setTimeout(() => {
                  runStep(stepIndex + 1, accumEmbeddings)
                }, 400)
              }
            } else {
              setFaceDetectedStatus(`⚠️ Nhận diện tư thế hiện tại: '${detectedPose}'. Vui lòng làm đúng chỉ dẫn: ${currentChallenge.action}`)
            }
          } else {
            setPoseMatchedStatus(false)
            setFaceDetectedStatus('⚠️ Vui lòng đưa khuôn mặt vào giữa khung hình tròn...')
          }
        } catch (e) {
          console.error(e)
        }
      }
    }, 200)
  }

  const finishEkyc = async (accumEmbeddings) => {
    setFaceDetectedStatus('⚡ AI đang tổng hợp vector sinh trắc học...')

    if (accumEmbeddings.length === 0) {
      setErr('Không trích xuất được vector sinh trắc học nào. Vui lòng thử lại.')
      setCapturing(false)
      return
    }

    // Compute composite mean embedding vector across all captured frames
    const vecLen = 128
    const meanVector = new Array(vecLen).fill(0)

    for (const emb of accumEmbeddings) {
      for (let i = 0; i < vecLen; i++) {
        meanVector[i] += emb[i]
      }
    }

    const count = accumEmbeddings.length
    for (let i = 0; i < vecLen; i++) {
      meanVector[i] /= count
    }

    const norm = Math.sqrt(meanVector.reduce((sum, v) => sum + v * v, 0))
    const finalNormalizedVector = meanVector.map(v => v / (norm || 1))

    try {
      const res = await axios.post('/api/ekyc/save-embedding', { vector: finalNormalizedVector }, config)
      setMsg(res.data.message || '🎉 XÁC THỰC eKYC SINH TRÁC HỌC THÀNH CÔNG!')
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
      <h2 style={{ color: '#ff3366', marginTop: 0 }}>🛡️ XÁC THỰC eKYC BANK-GRADE (YUNET 5 LANDMARKS + ARCFACE V2)</h2>
      <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '680px', margin: '0 auto 20px auto' }}>
        Sinh viên <strong>{currentUser?.full_name}</strong> vui lòng đưa mặt vào **Khung Khuôn Mặt Tròn Oval** và di chuyển đầu theo đúng 4 tư thế AI chỉ dẫn!
      </p>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '15px' }}>⚠️ {err}</div>}

      {/* CHALLENGE BANNER OVERLAY */}
      {capturing && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: `2px solid ${poseMatchedStatus ? '#00ff66' : currentChallenge.color}`,
          padding: '16px 20px',
          borderRadius: '14px',
          margin: '0 auto 20px auto',
          maxWidth: '580px',
          boxShadow: `0 0 24px ${poseMatchedStatus ? '#00ff6680' : currentChallenge.color + '40'}`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: poseMatchedStatus ? '#00ff66' : currentChallenge.color, marginBottom: '6px' }}>
            {currentChallenge.instruction}
          </div>

          <div style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '10px' }}>
            {faceDetectedStatus}
          </div>
          
          {/* Step Progress Bar */}
          <div style={{ background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${stepProgress}%`,
              height: '100%',
              background: poseMatchedStatus ? '#00ff66' : currentChallenge.color,
              transition: 'width 0.15s linear'
            }}></div>
          </div>
        </div>
      )}

      {/* WEBCAM CONTAINER WITH BANKING EKYC FACE OVAL OVERLAY */}
      <div style={{
        position: 'relative',
        margin: '0 auto 24px auto',
        width: '480px',
        height: '360px',
        borderRadius: '20px',
        overflow: 'hidden',
        border: capturing ? `3px solid ${poseMatchedStatus ? '#00ff66' : '#00f0ff'}` : '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: capturing ? `0 0 30px ${poseMatchedStatus ? 'rgba(0, 255, 102, 0.5)' : 'rgba(0, 240, 255, 0.3)'}` : '0 8px 32px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease'
      }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={480}
          height={360}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* BANKING eKYC OVAL FACE TARGET FRAME OVERLAY */}
        {capturing && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '240px',
            height: '300px',
            borderRadius: '50%',
            border: `4px dashed ${poseMatchedStatus ? '#00ff66' : '#00f0ff'}`,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 20px ${poseMatchedStatus ? '#00ff66' : '#00f0ff'}`,
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: poseMatchedStatus ? '#00ff66' : '#00f0ff', fontSize: '12px', fontWeight: 700, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '12px' }}>
              {poseMatchedStatus ? '✅ KHUÔN MẶT HỢP LỆ' : '🎯 ĐẶT MẶT VÀO ĐÂY'}
            </span>
          </div>
        )}
      </div>

      {!capturing && (
        <button
          onClick={handleStartEkyc}
          style={{
            padding: '14px 32px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(90deg, #ff3366 0%, #7000ff 100%)',
            color: '#fff', fontSize: '16px', fontWeight 700, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(255, 51, 102, 0.5)',
            transition: 'all 0.3s ease'
          }}
        >
          📸 BẮT ĐẦU XÁC THỰC eKYC NGÂN HÀNG
        </button>
      )}
    </div>
  )
}
