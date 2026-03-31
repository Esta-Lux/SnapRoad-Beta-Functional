import { useEffect, useRef, useState } from 'react'

export interface Lane {
  direction: 'left' | 'straight' | 'right' | 'slight-left' | 'slight-right' | 'uturn'
  isActive: boolean
}

export interface LaneGuideProps {
  lanes: Lane[]
  visible: boolean
  distanceToTurn: number // meters
}

export function parseLanes(maneuver: string, instruction: string): Lane[] {
  const i = (instruction || '').toLowerCase()
  const m = (maneuver || '').toLowerCase()

  if (m.includes('turn-left') || i.includes('turn left')) {
    return [
      { direction: 'left', isActive: true },
      { direction: 'straight', isActive: false },
      { direction: 'straight', isActive: false },
    ]
  }
  if (m.includes('turn-right') || i.includes('turn right')) {
    return [
      { direction: 'straight', isActive: false },
      { direction: 'straight', isActive: false },
      { direction: 'right', isActive: true },
    ]
  }
  if (m.includes('slight-left') || i.includes('slight left')) {
    return [
      { direction: 'slight-left', isActive: true },
      { direction: 'straight', isActive: false },
    ]
  }
  if (m.includes('slight-right') || i.includes('slight right')) {
    return [
      { direction: 'straight', isActive: false },
      { direction: 'slight-right', isActive: true },
    ]
  }
  if (m.includes('uturn') || i.includes('u-turn')) {
    return [
      { direction: 'uturn', isActive: true },
      { direction: 'straight', isActive: false },
    ]
  }
  return [
    { direction: 'straight', isActive: false },
    { direction: 'straight', isActive: true },
    { direction: 'straight', isActive: false },
  ]
}

function drawLaneArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: Lane['direction'],
  isActive: boolean
) {
  ctx.save()
  ctx.translate(x, y)

  const color = isActive ? '#007AFF' : 'rgba(255,255,255,0.3)'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = isActive ? 3 : 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const s = size * 0.4

  const rotations: Record<Lane['direction'], number> = {
    straight: 0,
    left: -90,
    right: 90,
    'slight-left': -45,
    'slight-right': 45,
    uturn: 180,
  }
  ctx.rotate((rotations[direction] * Math.PI) / 180)

  ctx.beginPath()
  ctx.moveTo(0, s)
  ctx.lineTo(0, -s * 0.3)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-s * 0.4, s * 0.1)
  ctx.lineTo(0, -s * 0.6)
  ctx.lineTo(s * 0.4, s * 0.1)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

export default function LaneGuide({
  lanes,
  visible,
  distanceToTurn,
}: LaneGuideProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (!visible || lanes.length === 0) {
      setOpacity(0)
      return
    }
    if (distanceToTurn < 400) {
      const o = Math.min(1, (400 - distanceToTurn) / 200)
      setOpacity(o)
    }
  }, [visible, distanceToTurn, lanes.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || lanes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, 12)
    } else {
      ctx.rect(0, 0, w, h)
    }
    ctx.fill()

    const laneWidth = (w - 32) / lanes.length
    lanes.forEach((lane, i) => {
      const x = 16 + laneWidth * i + laneWidth / 2
      const y = h / 2

      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(16 + laneWidth * i, 8)
        ctx.lineTo(16 + laneWidth * i, h - 8)
        ctx.stroke()
      }

      if (lane.isActive) {
        ctx.fillStyle = 'rgba(0,122,255,0.15)'
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(16 + laneWidth * i + 2, 4, laneWidth - 4, h - 8, 8)
        } else {
          ctx.rect(16 + laneWidth * i + 2, 4, laneWidth - 4, h - 8)
        }
        ctx.fill()
      }

      drawLaneArrow(ctx, x, y, laneWidth, lane.direction, lane.isActive)
    })
  }, [lanes])

  if (!visible || opacity === 0) return null

  const canvasWidth = Math.max(120, lanes.length * 56)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(160px + env(safe-area-inset-bottom, 20px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 998,
        opacity,
        transition: 'opacity 0.5s ease',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={64}
        style={{
          borderRadius: 12,
          display: 'block',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      />
      {distanceToTurn < 50 && (
        <div
          style={{
            textAlign: 'center',
            color: 'white',
            fontSize: 11,
            fontWeight: 600,
            marginTop: 4,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          GET IN LANE
        </div>
      )}
    </div>
  )
}
