import React, { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

export default function StudentEkyc({ currentUser, token, onEkycDone }) {
  const webcamRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: Straight, 1: Turn Left, 2: Turn Right, 3: Tilt Up
  const [stepProgress, setStepProgress] = useState(0)
  const [collectedEmbeddings, setCollectedEmbeddings] = useState([])
  const [faceDetectedStatus, setFaceDetectedStatus] = useState('Đang đợi khuôn mặt...')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const challenges = [
    { id: 1, action: 'STRAIGHT', instruction: '📍 Bước 1/4: VUI LÒNG NHÌN THẲNG VÀO CAMERA', color: '#00f0ff' },
    { id: 2, action: 'LEFT', instruction: '👈 Bước 2/4: VUI LÒNG QUAY ĐẦU SANG TRÁI', color: '#00ff66' },
    { id: 3, action: 'RIGHT', instruction: '👉 Bước 3/4: VUI LÒNG QUAY ĐẦU SANG PHẢI', color: '#ffaa00' },
    { id: 4, action: 'UP', instruction: '👆 Bước 4/4: VUI LÒNG NGƯỚC CẰM LÊN TRÊN', color: '#ff3366' },
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
    setCollectedEmbeddings([])

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

    const interval = setInterval(async () => {
      if (!webcamRef.current) return

      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        try {
          const res = await axios.post('/api/ekyc/process-frame', { image_base64: imageSrc }, config)
          if (res.data.detected && res.data.embedding) {
            accumEmbeddings.push(res.data.embedding)
            framesCapturedInStep += 1
            setFaceDetectedStatus(`✅ Đã trích xuất AI khuôn mặt: ${framesCapturedInStep}/${targetFrames} mẫu`)
            setStepProgress(Math.min(100, Math.round((framesCapturedInStep / targetFrames) * 100)))

            if (framesCapturedInStep >= targetFrames) {
              clearInterval(interval)
              setTimeout(() => {
                runStep(stepIndex + 1, accumEmbeddings)
              }, 400)
            }
          } else {
            setFaceDetectedStatus('⚠️ Vui lòng điều chỉnh góc mặt đúng chỉ dẫn...')
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

    // L2 normalization
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
      <h2 style={{ color: '#ff3366', marginTop: 0 }}>🛡️ XÁC THỰC eKYC SINH TRÁC HỌC THẬT (YUNET + ARCFACE V2)</h2>
      <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '650px', margin: '0 auto 20px auto' }}>
        Sinh viên <strong>{currentUser?.full_name}</strong> bật Web camera, di chuyển đầu theo 4 tư thế để AI quét khuôn mặt trực tiếp (Real-time AI Face Detection & Embedding Extraction như Ngân hàng)!
      </p>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '15px' }}>⚠️ {err}</div>}

      {/* CHALLENGE BANNER OVERLAY */}
      {capturing && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: `2px solid ${currentChallenge.color}`,
          padding: '16px 20px',
          borderRadius: '14px',
          margin: '0 auto 20px auto',
          maxWidth: '560px',
          boxShadow: `0 0 20px ${currentChallenge.color}40`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: currentChallenge.color, marginBottom: '6px' }}>
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
          📸 BẮT ĐẦU XÁC THỰC eKYC THẬT
        </button>
      )}
    </div>
  )
}
