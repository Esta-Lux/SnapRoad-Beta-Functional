import { useMemo } from 'react'

// Extended Color Palette - 24 colors with realistic car paint effects
export const CAR_COLORS = {
  // Standard Colors
  'midnight-black': { name: 'Midnight Black', hex: '#0a0a0a', type: 'standard', 
    body: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 40%, #050505 100%)',
    highlight: 'rgba(255,255,255,0.15)', reflection: 'rgba(255,255,255,0.08)' },
  'arctic-white': { name: 'Arctic White', hex: '#f8f8f8', type: 'standard',
    body: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 40%, #e8e8e8 100%)',
    highlight: 'rgba(255,255,255,0.9)', reflection: 'rgba(200,200,200,0.3)' },
  'racing-red': { name: 'Racing Red', hex: '#c41e3a', type: 'standard',
    body: 'linear-gradient(180deg, #e63946 0%, #c41e3a 40%, #9a1829 100%)',
    highlight: 'rgba(255,150,150,0.4)', reflection: 'rgba(255,100,100,0.2)' },
  'ocean-blue': { name: 'Ocean Blue', hex: '#1e4d8c', type: 'standard',
    body: 'linear-gradient(180deg, #2d6bb5 0%, #1e4d8c 40%, #163a6b 100%)',
    highlight: 'rgba(100,180,255,0.3)', reflection: 'rgba(80,150,220,0.2)' },
  'forest-green': { name: 'Forest Green', hex: '#1a5f3b', type: 'standard',
    body: 'linear-gradient(180deg, #248a52 0%, #1a5f3b 40%, #134430 100%)',
    highlight: 'rgba(100,200,130,0.3)', reflection: 'rgba(80,180,100,0.2)' },
  'sunset-orange': { name: 'Sunset Orange', hex: '#d45500', type: 'standard',
    body: 'linear-gradient(180deg, #ff6b1a 0%, #d45500 40%, #a34200 100%)',
    highlight: 'rgba(255,200,100,0.4)', reflection: 'rgba(255,150,50,0.2)' },
  'royal-purple': { name: 'Royal Purple', hex: '#5c2d7a', type: 'standard',
    body: 'linear-gradient(180deg, #7a3d9e 0%, #5c2d7a 40%, #45215c 100%)',
    highlight: 'rgba(200,150,255,0.3)', reflection: 'rgba(150,100,200,0.2)' },
  'canary-yellow': { name: 'Canary Yellow', hex: '#d4a500', type: 'standard',
    body: 'linear-gradient(180deg, #ffc61a 0%, #d4a500 40%, #a38000 100%)',
    highlight: 'rgba(255,230,100,0.5)', reflection: 'rgba(255,220,80,0.3)' },
  
  // Metallic Colors - with shine effects
  'pearl-white': { name: 'Pearl White', hex: '#f5f5f5', type: 'metallic',
    body: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 30%, #e8e8e8 50%, #f0f0f0 70%, #f8f8f8 100%)',
    highlight: 'rgba(255,255,255,1)', reflection: 'rgba(255,255,255,0.5)', shine: true },
  'gunmetal': { name: 'Gunmetal', hex: '#3d4249', type: 'metallic',
    body: 'linear-gradient(180deg, #5a6270 0%, #3d4249 30%, #2d3238 50%, #3d4249 70%, #4a515a 100%)',
    highlight: 'rgba(150,160,180,0.5)', reflection: 'rgba(100,110,130,0.3)', shine: true },
  'chrome-silver': { name: 'Chrome Silver', hex: '#c0c5cb', type: 'metallic',
    body: 'linear-gradient(180deg, #e8eaed 0%, #c0c5cb 25%, #a8adb5 50%, #c5cad0 75%, #d5d8dc 100%)',
    highlight: 'rgba(255,255,255,0.8)', reflection: 'rgba(200,205,215,0.5)', shine: true },
  'copper-bronze': { name: 'Copper Bronze', hex: '#8b4513', type: 'metallic',
    body: 'linear-gradient(180deg, #c4652a 0%, #8b4513 30%, #6b3510 50%, #8b4513 70%, #a85520 100%)',
    highlight: 'rgba(255,180,100,0.5)', reflection: 'rgba(200,130,60,0.3)', shine: true },
  'rose-gold': { name: 'Rose Gold', hex: '#b76e79', type: 'metallic',
    body: 'linear-gradient(180deg, #dba3ab 0%, #b76e79 30%, #9d5560 50%, #b76e79 70%, #c98a93 100%)',
    highlight: 'rgba(255,200,210,0.5)', reflection: 'rgba(220,150,160,0.3)', shine: true },
  'champagne': { name: 'Champagne', hex: '#c9a961', type: 'metallic',
    body: 'linear-gradient(180deg, #e5d08a 0%, #c9a961 30%, #a8894d 50%, #c9a961 70%, #d9bc75 100%)',
    highlight: 'rgba(255,240,180,0.5)', reflection: 'rgba(220,200,120,0.3)', shine: true },
  
  // Matte Colors - flat finish
  'matte-black': { name: 'Matte Black', hex: '#1a1a1a', type: 'matte',
    body: 'linear-gradient(180deg, #252525 0%, #1a1a1a 50%, #151515 100%)',
    highlight: 'rgba(80,80,80,0.2)', reflection: 'rgba(60,60,60,0.1)', matte: true },
  'matte-grey': { name: 'Matte Grey', hex: '#4a4a4a', type: 'matte',
    body: 'linear-gradient(180deg, #5a5a5a 0%, #4a4a4a 50%, #3a3a3a 100%)',
    highlight: 'rgba(120,120,120,0.2)', reflection: 'rgba(100,100,100,0.1)', matte: true },
  'matte-army': { name: 'Matte Army', hex: '#4b5320', type: 'matte',
    body: 'linear-gradient(180deg, #5c6428 0%, #4b5320 50%, #3c4219 100%)',
    highlight: 'rgba(100,110,50,0.2)', reflection: 'rgba(80,90,40,0.1)', matte: true },
  'matte-navy': { name: 'Matte Navy', hex: '#1c2841', type: 'matte',
    body: 'linear-gradient(180deg, #243350 0%, #1c2841 50%, #151f33 100%)',
    highlight: 'rgba(50,70,100,0.2)', reflection: 'rgba(40,60,90,0.1)', matte: true },
  
  // Premium Colors
  'carbon-fiber': { name: 'Carbon Fiber', hex: '#1a1a1a', type: 'premium',
    body: 'repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 1px, #252525 1px, #252525 2px)',
    highlight: 'rgba(100,100,100,0.3)', reflection: 'rgba(80,80,80,0.2)', premium: true, price: 2500 },
  'neon-cyan': { name: 'Neon Cyan', hex: '#00d4ff', type: 'premium',
    body: 'linear-gradient(180deg, #33e0ff 0%, #00d4ff 40%, #00a8cc 100%)',
    highlight: 'rgba(150,255,255,0.6)', reflection: 'rgba(100,230,255,0.4)', premium: true, glow: true, price: 1500 },
  'neon-pink': { name: 'Neon Pink', hex: '#ff1493', type: 'premium',
    body: 'linear-gradient(180deg, #ff4db2 0%, #ff1493 40%, #cc1077 100%)',
    highlight: 'rgba(255,150,220,0.6)', reflection: 'rgba(255,100,200,0.4)', premium: true, glow: true, price: 1500 },
  'neon-lime': { name: 'Neon Lime', hex: '#7fff00', type: 'premium',
    body: 'linear-gradient(180deg, #a0ff33 0%, #7fff00 40%, #66cc00 100%)',
    highlight: 'rgba(200,255,100,0.6)', reflection: 'rgba(150,255,50,0.4)', premium: true, glow: true, price: 1500 },
  'galaxy-purple': { name: 'Galaxy Purple', hex: '#4b0082', type: 'premium',
    body: 'linear-gradient(180deg, #7b2cbf 0%, #5a189a 30%, #4b0082 50%, #3c0068 100%)',
    highlight: 'rgba(180,100,255,0.4)', reflection: 'rgba(140,60,220,0.3)', premium: true, price: 2000 },
  'inferno': { name: 'Inferno', hex: '#ff4500', type: 'premium',
    body: 'linear-gradient(180deg, #ffd700 0%, #ff8c00 25%, #ff4500 50%, #cc3700 100%)',
    highlight: 'rgba(255,220,100,0.5)', reflection: 'rgba(255,180,50,0.3)', premium: true, price: 2000 },
}

// Car Categories with realistic shapes
export const CAR_CATEGORIES = {
  sedan: {
    name: 'Sedan',
    icon: '🚗',
    description: 'Classic 4-door comfort',
    variants: [
      { id: 'sedan-classic', name: 'Classic Sedan', style: 'classic' },
      { id: 'sedan-sport', name: 'Sport Sedan', style: 'sport' },
      { id: 'sedan-luxury', name: 'Executive Sedan', style: 'luxury' },
    ]
  },
  suv: {
    name: 'SUV',
    icon: '🚙',
    description: 'Versatile family vehicle',
    variants: [
      { id: 'suv-compact', name: 'Compact SUV', style: 'compact' },
      { id: 'suv-midsize', name: 'Midsize SUV', style: 'midsize' },
      { id: 'suv-fullsize', name: 'Full-Size SUV', style: 'fullsize' },
    ]
  },
  sports: {
    name: 'Sports Car',
    icon: '🏎️',
    description: 'Speed and style',
    variants: [
      { id: 'sports-coupe', name: 'Sports Coupe', style: 'coupe' },
      { id: 'sports-convertible', name: 'Convertible', style: 'convertible' },
      { id: 'sports-supercar', name: 'Supercar', style: 'supercar' },
    ]
  },
  truck: {
    name: 'Truck',
    icon: '🛻',
    description: 'Power and utility',
    variants: [
      { id: 'truck-standard', name: 'Standard Pickup', style: 'standard' },
      { id: 'truck-crew', name: 'Crew Cab', style: 'crew' },
      { id: 'truck-offroad', name: 'Off-Road', style: 'offroad' },
    ]
  },
  hatchback: {
    name: 'Hatchback',
    icon: '🚘',
    description: 'Compact and efficient',
    variants: [
      { id: 'hatch-city', name: 'City Hatch', style: 'city' },
      { id: 'hatch-sport', name: 'Hot Hatch', style: 'sport' },
      { id: 'hatch-wagon', name: 'Sport Wagon', style: 'wagon' },
    ]
  },
  luxury: {
    name: 'Luxury',
    icon: '🚐',
    description: 'Premium elegance',
    variants: [
      { id: 'luxury-sedan', name: 'Luxury Sedan', style: 'sedan' },
      { id: 'luxury-coupe', name: 'Grand Tourer', style: 'gt' },
      { id: 'luxury-limo', name: 'Executive', style: 'executive' },
    ]
  },
  electric: {
    name: 'Electric',
    icon: '⚡',
    description: 'Future forward',
    variants: [
      { id: 'ev-sedan', name: 'EV Sedan', style: 'sedan' },
      { id: 'ev-suv', name: 'EV Crossover', style: 'crossover' },
      { id: 'ev-sports', name: 'EV Sports', style: 'sports' },
    ]
  },
}

interface Car3DProps {
  category: keyof typeof CAR_CATEGORIES
  variant?: string
  color: keyof typeof CAR_COLORS
  size?: 'sm' | 'md' | 'lg' | 'xl'
  rotation?: number
  showShadow?: boolean
  showReflection?: boolean
  perspective?: 'side' | 'front' | 'angled' | 'top'
  animated?: boolean
  onClick?: () => void
}

export default function Car3D({ 
  category, 
  variant,
  color, 
  size = 'md', 
  rotation = 0,
  showShadow = true,
  showReflection = false,
  perspective = 'angled',
  animated = false,
  onClick
}: Car3DProps) {
  const colorData = CAR_COLORS[color] || CAR_COLORS['midnight-black']
  
  const sizeMap = {
    sm: { width: 80, height: 45 },
    md: { width: 160, height: 90 },
    lg: { width: 240, height: 135 },
    xl: { width: 320, height: 180 },
  }
  
  const { width, height } = sizeMap[size]

  // Realistic car path shapes by category
  const carPaths = useMemo(() => {
    const paths: Record<string, {
      body: string
      bodyTop: string
      hood: string
      cabin: string
      windows: string
      frontWindow: string
      rearWindow: string
      trim: string
      bumperFront: string
      bumperRear: string
      wheelWellFront: string
      wheelWellRear: string
      doorLine: string
      handleArea: string
    }> = {
      sedan: {
        body: 'M 15 65 Q 10 65 8 60 L 12 48 Q 18 42 28 38 L 72 38 Q 82 42 88 48 L 92 60 Q 90 65 85 65 L 15 65 Z',
        bodyTop: 'M 20 48 Q 22 42 30 38 L 70 38 Q 78 42 80 48 L 20 48 Z',
        hood: 'M 12 52 L 28 40 L 36 40 L 36 52 Z',
        cabin: 'M 30 38 Q 32 26 40 22 L 60 22 Q 68 26 70 38 L 30 38 Z',
        windows: 'M 32 36 Q 34 28 40 24 L 60 24 Q 66 28 68 36 L 32 36 Z',
        frontWindow: 'M 34 35 L 38 26 L 49 26 L 49 35 Z',
        rearWindow: 'M 51 35 L 51 26 L 62 26 L 66 35 Z',
        trim: 'M 15 52 L 85 52',
        bumperFront: 'M 8 62 Q 6 58 10 55 L 18 55 Q 14 58 14 62 Z',
        bumperRear: 'M 86 62 Q 86 58 82 55 L 90 55 Q 94 58 92 62 Z',
        wheelWellFront: 'M 18 65 Q 18 56 26 56 Q 34 56 34 65',
        wheelWellRear: 'M 66 65 Q 66 56 74 56 Q 82 56 82 65',
        doorLine: 'M 50 38 L 50 62',
        handleArea: 'M 42 48 L 48 48 L 48 50 L 42 50 Z',
      },
      suv: {
        body: 'M 12 68 Q 8 68 6 62 L 10 48 Q 14 40 24 36 L 76 36 Q 86 40 90 48 L 94 62 Q 92 68 88 68 L 12 68 Z',
        bodyTop: 'M 18 48 Q 20 40 26 36 L 74 36 Q 80 40 82 48 L 18 48 Z',
        hood: 'M 10 52 L 24 38 L 32 38 L 32 52 Z',
        cabin: 'M 26 36 Q 28 22 36 18 L 64 18 Q 72 22 74 36 L 26 36 Z',
        windows: 'M 28 34 Q 30 24 36 20 L 64 20 Q 70 24 72 34 L 28 34 Z',
        frontWindow: 'M 30 32 L 35 22 L 48 22 L 48 32 Z',
        rearWindow: 'M 52 32 L 52 22 L 65 22 L 70 32 Z',
        trim: 'M 12 52 L 88 52',
        bumperFront: 'M 6 65 Q 4 60 8 56 L 16 56 Q 12 60 12 65 Z',
        bumperRear: 'M 88 65 Q 88 60 84 56 L 92 56 Q 96 60 94 65 Z',
        wheelWellFront: 'M 16 68 Q 16 58 26 58 Q 36 58 36 68',
        wheelWellRear: 'M 64 68 Q 64 58 74 58 Q 84 58 84 68',
        doorLine: 'M 50 36 L 50 65',
        handleArea: 'M 40 48 L 46 48 L 46 51 L 40 51 Z',
      },
      sports: {
        body: 'M 8 62 Q 4 62 4 58 L 10 48 Q 18 42 30 40 L 70 40 Q 85 42 92 48 L 96 58 Q 96 62 92 62 L 8 62 Z',
        bodyTop: 'M 16 48 Q 22 42 32 40 L 68 40 Q 80 42 84 48 L 16 48 Z',
        hood: 'M 10 52 L 32 42 L 42 42 L 36 52 Z',
        cabin: 'M 38 40 Q 40 32 46 30 L 58 30 Q 64 32 66 40 L 38 40 Z',
        windows: 'M 40 38 Q 42 32 46 30 L 58 30 Q 62 32 64 38 L 40 38 Z',
        frontWindow: 'M 42 37 L 45 31 L 51 31 L 51 37 Z',
        rearWindow: 'M 53 37 L 53 31 L 59 31 L 62 37 Z',
        trim: 'M 10 50 L 90 50',
        bumperFront: 'M 4 60 Q 2 56 6 52 L 14 52 Q 10 56 10 60 Z',
        bumperRear: 'M 90 60 Q 90 56 86 52 L 94 52 Q 98 56 96 60 Z',
        wheelWellFront: 'M 14 62 Q 14 54 22 54 Q 30 54 30 62',
        wheelWellRear: 'M 70 62 Q 70 54 78 54 Q 86 54 86 62',
        doorLine: 'M 52 40 L 52 60',
        handleArea: 'M 44 48 L 50 48 L 50 50 L 44 50 Z',
      },
      truck: {
        body: 'M 12 70 Q 8 70 6 64 L 10 52 Q 14 44 22 40 L 46 40 L 46 50 L 88 50 L 94 64 Q 92 70 88 70 L 12 70 Z',
        bodyTop: 'M 16 52 Q 18 44 24 40 L 44 40 L 44 50 L 84 50 L 16 52 Z',
        hood: 'M 10 55 L 22 42 L 30 42 L 30 55 Z',
        cabin: 'M 24 40 Q 26 28 32 24 L 44 24 Q 46 28 46 40 L 24 40 Z',
        windows: 'M 26 38 Q 28 30 32 26 L 44 26 Q 45 30 45 38 L 26 38 Z',
        frontWindow: 'M 28 36 L 32 28 L 44 28 L 44 36 Z',
        rearWindow: 'M 44 36 L 44 28 L 44 28 L 44 36 Z',
        trim: 'M 12 55 L 46 55 M 46 55 L 88 55',
        bumperFront: 'M 6 68 Q 4 62 8 58 L 16 58 Q 12 62 12 68 Z',
        bumperRear: 'M 88 68 Q 88 62 84 58 L 92 58 Q 96 62 94 68 Z',
        wheelWellFront: 'M 16 70 Q 16 60 26 60 Q 36 60 36 70',
        wheelWellRear: 'M 68 70 Q 68 60 78 60 Q 88 60 88 70',
        doorLine: 'M 36 40 L 36 67',
        handleArea: 'M 30 50 L 34 50 L 34 52 L 30 52 Z',
      },
      hatchback: {
        body: 'M 14 64 Q 10 64 8 58 L 12 48 Q 18 42 28 40 L 72 40 Q 80 44 84 52 L 88 58 Q 86 64 82 64 L 14 64 Z',
        bodyTop: 'M 18 48 Q 22 42 30 40 L 70 40 Q 76 44 78 52 L 18 48 Z',
        hood: 'M 12 52 L 28 42 L 36 42 L 36 52 Z',
        cabin: 'M 30 40 Q 32 28 38 24 L 62 24 Q 72 28 78 40 L 30 40 Z',
        windows: 'M 32 38 Q 34 30 38 26 L 62 26 Q 70 30 75 38 L 32 38 Z',
        frontWindow: 'M 34 36 L 38 28 L 50 28 L 50 36 Z',
        rearWindow: 'M 52 36 L 52 28 L 66 28 L 72 36 Z',
        trim: 'M 14 52 L 82 52',
        bumperFront: 'M 8 62 Q 6 58 10 54 L 18 54 Q 14 58 14 62 Z',
        bumperRear: 'M 82 62 Q 82 58 78 54 L 86 54 Q 90 58 88 62 Z',
        wheelWellFront: 'M 18 64 Q 18 56 26 56 Q 34 56 34 64',
        wheelWellRear: 'M 62 64 Q 62 56 70 56 Q 78 56 78 64',
        doorLine: 'M 48 40 L 48 62',
        handleArea: 'M 40 48 L 46 48 L 46 50 L 40 50 Z',
      },
      luxury: {
        body: 'M 10 66 Q 6 66 4 60 L 8 48 Q 14 40 26 36 L 74 36 Q 86 40 92 48 L 96 60 Q 94 66 90 66 L 10 66 Z',
        bodyTop: 'M 14 48 Q 18 40 28 36 L 72 36 Q 82 40 86 48 L 14 48 Z',
        hood: 'M 8 52 L 26 38 L 36 38 L 34 52 Z',
        cabin: 'M 28 36 Q 30 24 38 20 L 62 20 Q 70 24 72 36 L 28 36 Z',
        windows: 'M 30 34 Q 32 26 38 22 L 62 22 Q 68 26 70 34 L 30 34 Z',
        frontWindow: 'M 32 33 L 37 24 L 49 24 L 49 33 Z',
        rearWindow: 'M 51 33 L 51 24 L 63 24 L 68 33 Z',
        trim: 'M 10 52 L 90 52 M 10 56 L 90 56',
        bumperFront: 'M 4 64 Q 2 58 6 54 L 14 54 Q 10 58 10 64 Z',
        bumperRear: 'M 90 64 Q 90 58 86 54 L 94 54 Q 98 58 96 64 Z',
        wheelWellFront: 'M 16 66 Q 16 56 26 56 Q 36 56 36 66',
        wheelWellRear: 'M 64 66 Q 64 56 74 56 Q 84 56 84 66',
        doorLine: 'M 50 36 L 50 64',
        handleArea: 'M 42 46 L 48 46 L 48 49 L 42 49 Z',
      },
      electric: {
        body: 'M 12 64 Q 8 64 6 58 L 10 48 Q 16 42 28 40 L 72 40 Q 84 42 90 48 L 94 58 Q 92 64 88 64 L 12 64 Z',
        bodyTop: 'M 16 48 Q 20 42 30 40 L 70 40 Q 80 42 84 48 L 16 48 Z',
        hood: 'M 10 52 L 28 42 L 38 42 L 36 52 Z',
        cabin: 'M 30 40 Q 32 28 40 24 L 60 24 Q 68 28 70 40 L 30 40 Z',
        windows: 'M 32 38 Q 34 30 40 26 L 60 26 Q 66 30 68 38 L 32 38 Z',
        frontWindow: 'M 34 36 L 39 28 L 49 28 L 49 36 Z',
        rearWindow: 'M 51 36 L 51 28 L 61 28 L 66 36 Z',
        trim: 'M 12 52 L 88 52',
        bumperFront: 'M 6 62 Q 4 58 8 54 L 16 54 Q 12 58 12 62 Z',
        bumperRear: 'M 88 62 Q 88 58 84 54 L 92 54 Q 96 58 94 62 Z',
        wheelWellFront: 'M 18 64 Q 18 55 27 55 Q 36 55 36 64',
        wheelWellRear: 'M 64 64 Q 64 55 73 55 Q 82 55 82 64',
        doorLine: 'M 50 40 L 50 62',
        handleArea: 'M 42 48 L 48 48 L 48 50 L 42 50 Z',
      },
    }
    return paths[category] || paths.sedan
  }, [category])

  const transform3D = {
    side: 'rotateY(0deg) rotateX(5deg)',
    front: 'rotateY(-75deg) rotateX(5deg)',
    angled: 'rotateY(-25deg) rotateX(12deg)',
    top: 'rotateX(55deg) rotateY(0deg)',
  }

  return (
    <div 
      className={`relative ${animated ? 'animate-float' : ''} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      style={{ 
        width, 
        height: height + 30,
        perspective: '800px',
      }}
      onClick={onClick}
    >
      {/* 3D Container */}
      <div 
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          transform: `${transform3D[perspective]} rotateZ(${rotation}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Ground Shadow */}
        {showShadow && (
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width: width * 0.7,
              height: 8,
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
              filter: 'blur(4px)',
              transform: 'translateZ(-20px)',
            }}
          />
        )}

        {/* Main Car SVG */}
        <svg 
          viewBox="0 0 100 80" 
          className="w-full h-full"
          style={{
            filter: colorData.glow 
              ? `drop-shadow(0 0 15px ${colorData.hex}80) drop-shadow(0 4px 8px rgba(0,0,0,0.3))` 
              : 'drop-shadow(0 4px 12px rgba(0,0,0,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          }}
        >
          <defs>
            {/* Main body gradient */}
            <linearGradient id={`body-grad-${color}-${category}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorData.highlight} />
              <stop offset="15%" stopColor={colorData.hex} />
              <stop offset="60%" stopColor={colorData.hex} />
              <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
            </linearGradient>

            {/* Hood/roof highlight */}
            <linearGradient id={`hood-highlight-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Window glass gradient */}
            <linearGradient id="window-glass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a2530" />
              <stop offset="30%" stopColor="#2a3a48" />
              <stop offset="70%" stopColor="#1a2530" />
              <stop offset="100%" stopColor="#0f1820" />
            </linearGradient>

            {/* Window reflection */}
            <linearGradient id="window-reflect" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(180,200,220,0.5)" />
              <stop offset="30%" stopColor="rgba(180,200,220,0.2)" />
              <stop offset="100%" stopColor="rgba(180,200,220,0)" />
            </linearGradient>

            {/* Chrome trim */}
            <linearGradient id="chrome-trim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f0f0f0" />
              <stop offset="30%" stopColor="#c0c0c0" />
              <stop offset="50%" stopColor="#a0a0a0" />
              <stop offset="70%" stopColor="#c0c0c0" />
              <stop offset="100%" stopColor="#808080" />
            </linearGradient>

            {/* Tire rubber */}
            <radialGradient id="tire-rubber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="70%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#0a0a0a" />
            </radialGradient>

            {/* Rim gradient */}
            <radialGradient id="rim-metal" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e8e8e8" />
              <stop offset="50%" stopColor="#b0b0b0" />
              <stop offset="100%" stopColor="#707070" />
            </radialGradient>

            {/* Headlight */}
            <radialGradient id="headlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fff8e0" />
              <stop offset="100%" stopColor="#d0c8a0" />
            </radialGradient>

            {/* Taillight */}
            <radialGradient id="taillight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff4040" />
              <stop offset="60%" stopColor="#cc2020" />
              <stop offset="100%" stopColor="#801010" />
            </radialGradient>
          </defs>

          {/* Car Body - Main Shape */}
          <path 
            d={carPaths.body}
            fill={`url(#body-grad-${color}-${category})`}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="0.5"
          />

          {/* Body panel highlight */}
          <path 
            d={carPaths.bodyTop}
            fill={`url(#hood-highlight-${color})`}
            opacity={colorData.matte ? 0.1 : 0.4}
          />

          {/* Cabin/Roof Structure */}
          <path 
            d={carPaths.cabin}
            fill={`url(#body-grad-${color}-${category})`}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="0.3"
          />

          {/* Windows - Glass */}
          <path 
            d={carPaths.windows}
            fill="url(#window-glass)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.3"
          />

          {/* Window Reflection */}
          <path 
            d={carPaths.frontWindow}
            fill="url(#window-reflect)"
            opacity="0.6"
          />

          {/* Wheel Wells */}
          <path 
            d={carPaths.wheelWellFront}
            fill="#0a0a0a"
          />
          <path 
            d={carPaths.wheelWellRear}
            fill="#0a0a0a"
          />

          {/* Front Wheel */}
          <g transform="translate(26, 64)">
            {/* Tire */}
            <ellipse cx="0" cy="0" rx="8" ry="8" fill="url(#tire-rubber)" />
            {/* Rim */}
            <ellipse cx="0" cy="0" rx="5.5" ry="5.5" fill="url(#rim-metal)" />
            {/* Rim center cap */}
            <circle cx="0" cy="0" r="2" fill="#505050" />
            {/* Rim spokes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <line 
                key={i}
                x1="0" y1="-2"
                x2="0" y2="-5"
                stroke="#808080"
                strokeWidth="1"
                transform={`rotate(${angle})`}
              />
            ))}
          </g>

          {/* Rear Wheel */}
          <g transform="translate(74, 64)">
            <ellipse cx="0" cy="0" rx="8" ry="8" fill="url(#tire-rubber)" />
            <ellipse cx="0" cy="0" rx="5.5" ry="5.5" fill="url(#rim-metal)" />
            <circle cx="0" cy="0" r="2" fill="#505050" />
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <line 
                key={i}
                x1="0" y1="-2"
                x2="0" y2="-5"
                stroke="#808080"
                strokeWidth="1"
                transform={`rotate(${angle})`}
              />
            ))}
          </g>

          {/* Chrome Trim Lines */}
          <path 
            d={carPaths.trim}
            fill="none"
            stroke="url(#chrome-trim)"
            strokeWidth="0.8"
            opacity="0.7"
          />

          {/* Door Line */}
          <path 
            d={carPaths.doorLine}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.5"
          />

          {/* Door Handle */}
          <path 
            d={carPaths.handleArea}
            fill="url(#chrome-trim)"
            opacity="0.8"
          />

          {/* Headlights */}
          <ellipse cx="12" cy="52" rx="3" ry="2" fill="url(#headlight)" />
          
          {/* Taillights */}
          <ellipse cx="88" cy="54" rx="2.5" ry="1.8" fill="url(#taillight)" />

          {/* Front Grille Area */}
          <rect x="9" y="54" width="6" height="4" rx="0.5" fill="rgba(30,30,30,0.9)" />

          {/* Side Mirror */}
          <ellipse cx="28" cy="42" rx="2" ry="1.2" fill={colorData.hex} stroke="rgba(0,0,0,0.2)" strokeWidth="0.2" />
        </svg>
      </div>

      {/* Floor Reflection */}
      {showReflection && (
        <div 
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: height * 0.3,
            transform: 'scaleY(-0.4) translateY(20px)',
            opacity: 0.15,
            maskImage: 'linear-gradient(to top, transparent 0%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 100%)',
            filter: 'blur(2px)',
          }}
        >
          <svg viewBox="0 0 100 80" className="w-full h-full">
            <path d={carPaths.body} fill={colorData.hex} />
          </svg>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

// Navigation Marker - 3D angled top-down view
interface NavMarkerProps {
  category: keyof typeof CAR_CATEGORIES
  color: keyof typeof CAR_COLORS
  heading?: number
  size?: number
  isMoving?: boolean
}

export function NavMarker({ category, color, heading = 0, size = 40, isMoving = false }: NavMarkerProps) {
  const colorData = CAR_COLORS[color] || CAR_COLORS['midnight-black']
  
  return (
    <div 
      className={`relative ${isMoving ? '' : ''}`}
      style={{ 
        width: size, 
        height: size * 1.4,
        transform: `rotate(${heading}deg)`,
        transition: 'transform 0.4s ease-out',
        filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.4))`,
      }}
    >
      <svg viewBox="0 0 40 56" className="w-full h-full">
        <defs>
          <linearGradient id={`nav-body-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorData.highlight} />
            <stop offset="50%" stopColor={colorData.hex} />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
          <linearGradient id="nav-window" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3a4a58" />
            <stop offset="100%" stopColor="#1a2530" />
          </linearGradient>
        </defs>
        
        {/* Car body - angled top view */}
        <path 
          d="M 20 4 L 34 16 Q 36 18 36 22 L 36 44 Q 36 48 32 50 L 24 54 Q 20 56 16 54 L 8 50 Q 4 48 4 44 L 4 22 Q 4 18 6 16 L 20 4 Z" 
          fill={`url(#nav-body-${color})`}
          stroke={colorData.hex}
          strokeWidth="0.5"
        />
        
        {/* Hood */}
        <path 
          d="M 12 18 L 20 8 L 28 18 L 28 26 L 12 26 Z" 
          fill={colorData.hex}
          opacity="0.9"
        />
        
        {/* Windshield */}
        <path 
          d="M 13 20 L 20 10 L 27 20 L 27 28 L 13 28 Z" 
          fill="url(#nav-window)"
        />
        
        {/* Roof */}
        <rect x="12" y="28" width="16" height="12" rx="2" fill={colorData.hex} opacity="0.95" />
        
        {/* Rear window */}
        <path 
          d="M 13 40 L 27 40 L 27 46 L 13 46 Z" 
          fill="url(#nav-window)"
          opacity="0.8"
        />
        
        {/* Headlights */}
        <ellipse cx="11" cy="17" rx="2" ry="1.5" fill="#fff8e0" />
        <ellipse cx="29" cy="17" rx="2" ry="1.5" fill="#fff8e0" />
        
        {/* Taillights */}
        <rect x="10" y="48" width="4" height="2" rx="0.5" fill="#ff3030" />
        <rect x="26" y="48" width="4" height="2" rx="0.5" fill="#ff3030" />
        
        {/* Direction indicator when moving */}
        {isMoving && (
          <g className="animate-pulse">
            <path d="M 20 0 L 24 6 L 16 6 Z" fill="#4a90d9" />
          </g>
        )}
      </svg>
    </div>
  )
}

// Profile Car - Side view silhouette
interface ProfileCarProps {
  category: keyof typeof CAR_CATEGORIES
  color: keyof typeof CAR_COLORS
  size?: number
}

export function ProfileCar({ category, color, size = 56 }: ProfileCarProps) {
  const colorData = CAR_COLORS[color] || CAR_COLORS['midnight-black']
  
  return (
    <div 
      className="relative"
      style={{ 
        width: size, 
        height: size * 0.5,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    >
      <svg viewBox="0 0 100 50" className="w-full h-full">
        <defs>
          <linearGradient id={`profile-body-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorData.highlight} />
            <stop offset="40%" stopColor={colorData.hex} />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </linearGradient>
        </defs>
        
        {/* Car body silhouette */}
        <path 
          d="M 8 38 Q 5 38 5 34 L 10 28 Q 16 22 26 20 L 74 20 Q 84 22 90 28 L 95 34 Q 95 38 92 38 L 8 38 Z" 
          fill={`url(#profile-body-${color})`}
        />
        
        {/* Cabin */}
        <path 
          d="M 30 20 Q 32 12 40 10 L 60 10 Q 68 12 70 20 Z" 
          fill={colorData.hex}
          opacity="0.9"
        />
        
        {/* Windows */}
        <path 
          d="M 32 18 Q 34 13 40 11 L 60 11 Q 66 13 68 18 Z" 
          fill="#2a3a48"
        />
        
        {/* Wheels */}
        <circle cx="22" cy="38" r="6" fill="#1a1a1a" />
        <circle cx="22" cy="38" r="4" fill="#808080" />
        <circle cx="78" cy="38" r="6" fill="#1a1a1a" />
        <circle cx="78" cy="38" r="4" fill="#808080" />
        
        {/* Headlight */}
        <ellipse cx="8" cy="30" rx="2" ry="1.5" fill="#fff8e0" />
        
        {/* Taillight */}
        <ellipse cx="92" cy="31" rx="1.5" ry="1.2" fill="#ff3030" />
      </svg>
    </div>
  )
}
