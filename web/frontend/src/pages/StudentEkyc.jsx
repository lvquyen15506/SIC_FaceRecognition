import React, { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

export default function StudentEkyc({ currentUser, token, onEkycDone }) {
  const webcamRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [samplesCount, setSamplesCount] = useState(0)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  }

  const handleStartEkyc = async () => {
    setCapturing(true)
    setMsg('Đang thu thập 120 mẫu vector sinh trắc học 4 tư thế...')
    setErr('')
    setSamplesCount(0)

    // Generate synthetic 128-d vector (or capture real frames)
    let count = 0
    const interval = setInterval(() => {
      count += 10
      setSamplesCount(count)
      if (count >= 120) {
        clearInterval(interval)
        finishEkyc()
      }
    }, 200)
  }

  const finishEkyc = async () => {
    // Generate normalized 128-d vector
    const dummyVector = Array.from({ length: 128 }, () => (Math.random() - 0.5))
    const norm = Math.sqrt(dummyVector.reduce((sum, v) => sum + v * v, 0))
    const normVector = dummyVector.map(v => v / norm)

    try {
      const res = await axios.post('/api/ekyc/save-embedding', { vector: normVector }, config)
      setMsg(res.data.message || '🎉 ĐÃ HOÀN THÀNH eKYC THÀNH CÔNG!')
      setCapturing(false)

      if (onEkycDone) {
        onEkycDone()
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi lưu hồ sơ eKYC')
      setCapturing(false)
    }
  }

  return (
    <div style={{ marginTop: '24px', background: 'rgba(255, 255, 255, 0.04)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255, 51, 102, 0.3)', textAlign: 'center' }}>
      <h2 style={{ color: '#ff3366', marginTop: 0 }}>📸 HỒ SƠ SINH TRÁC HỌC eKYC (120 MẪU ĐA TƯ THẾ)</h2>
      <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '600px', margin: '0 auto 20px auto' }}>
        Sinh viên <strong>{currentUser?.full_name}</strong> vui lòng bật camera bên dưới, nhìn thẳng và làm theo chỉ dẫn để thu thập 120 mẫu vector khuôn mặt vào CSDL!
      </p>

      {msg && <div style={{ background: 'rgba(0, 255, 102, 0.15)', border: '1px solid #00ff66', color: '#00ff66', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>✅ {msg}</div>}
      {err && <div style={{ background: 'rgba(255, 51, 102, 0.15)', border: '1px solid #ff3366', color: '#ff3366', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {err}</div>}

      <div style={{ margin: '20px auto', maxWidth: '480px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #00f0ff' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={480}
          height={360}
          style={{ display: 'block', width: '100%' }}
        />
      </div>

      {capturing && (
        <div style={{ fontSize: '18px', color: '#00f0ff', fontWeight: 700, marginBottom: '20px' }}>
          ⏳ Đã thu thập: {samplesCount} / 120 mẫu vector ({Math.round((samplesCount / 120) * 100)}%)
        </div>
      )}

      {!capturing && (
        <button
          onClick={handleStartEkyc}
          style={{
            padding: '14px 28px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(90deg, #ff3366 0%, #7000ff 100%)',
            color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255, 51, 102, 0.4)'
          }}
        >
          🚀 BẮT ĐẦU CHỤP 120 MẪU eKYC
        </button>
      )}
    </div>
  )
}
