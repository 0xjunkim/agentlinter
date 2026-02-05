import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          {/* Connection lines */}
          <line x1="10" y1="8" x2="22" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="22" y1="12" x2="10" y2="20" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="10" y1="20" x2="22" y2="24" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="16" y1="15" x2="10" y2="8" stroke="rgba(94,234,212,0.5)" strokeWidth="1" />
          <line x1="16" y1="15" x2="22" y2="12" stroke="rgba(94,234,212,0.5)" strokeWidth="1" />
          <line x1="16" y1="15" x2="10" y2="20" stroke="rgba(94,234,212,0.5)" strokeWidth="1" />
          <line x1="16" y1="15" x2="22" y2="24" stroke="rgba(94,234,212,0.5)" strokeWidth="1" />
          {/* Nodes */}
          <circle cx="10" cy="8" r="2.5" fill="white" />
          <circle cx="22" cy="12" r="2.5" fill="white" />
          <circle cx="10" cy="20" r="2.5" fill="white" />
          <circle cx="22" cy="24" r="2.5" fill="white" />
          {/* Center node — teal */}
          <circle cx="16" cy="15" r="3" fill="#5eead4" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
