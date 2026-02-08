import { useMemo } from 'react'

// Extended Color Palette - 24 colors including metallics and mattes
export const CAR_COLORS = {
  // Standard Colors
  'midnight-black': { name: 'Midnight Black', hex: '#1a1a1a', type: 'standard', gradient: 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 50%, #0d0d0d 100%)' },
  'arctic-white': { name: 'Arctic White', hex: '#f5f5f5', type: 'standard', gradient: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 50%, #e8e8e8 100%)' },
  'racing-red': { name: 'Racing Red', hex: '#dc2626', type: 'standard', gradient: 'linear-gradient(145deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)' },
  'ocean-blue': { name: 'Ocean Blue', hex: '#2563eb', type: 'standard', gradient: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' },
  'forest-green': { name: 'Forest Green', hex: '#16a34a', type: 'standard', gradient: 'linear-gradient(145deg, #22c55e 0%, #16a34a 50%, #15803d 100%)' },
  'sunset-orange': { name: 'Sunset Orange', hex: '#ea580c', type: 'standard', gradient: 'linear-gradient(145deg, #f97316 0%, #ea580c 50%, #c2410c 100%)' },
  'royal-purple': { name: 'Royal Purple', hex: '#7c3aed', type: 'standard', gradient: 'linear-gradient(145deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)' },
  'canary-yellow': { name: 'Canary Yellow', hex: '#eab308', type: 'standard', gradient: 'linear-gradient(145deg, #facc15 0%, #eab308 50%, #ca8a04 100%)' },
  
  // Metallic Colors
  'pearl-white': { name: 'Pearl White', hex: '#fafafa', type: 'metallic', gradient: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 30%, #e8e8e8 50%, #f5f5f5 70%, #ffffff 100%)', shine: true },
  'gunmetal': { name: 'Gunmetal', hex: '#374151', type: 'metallic', gradient: 'linear-gradient(145deg, #6b7280 0%, #4b5563 30%, #374151 50%, #4b5563 70%, #6b7280 100%)', shine: true },
  'chrome-silver': { name: 'Chrome Silver', hex: '#d1d5db', type: 'metallic', gradient: 'linear-gradient(145deg, #f3f4f6 0%, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%, #f9fafb 100%)', shine: true },
  'copper-bronze': { name: 'Copper Bronze', hex: '#b45309', type: 'metallic', gradient: 'linear-gradient(145deg, #d97706 0%, #b45309 30%, #92400e 50%, #b45309 70%, #d97706 100%)', shine: true },
  'rose-gold': { name: 'Rose Gold', hex: '#f472b6', type: 'metallic', gradient: 'linear-gradient(145deg, #fbcfe8 0%, #f9a8d4 30%, #f472b6 50%, #f9a8d4 70%, #fbcfe8 100%)', shine: true },
  'champagne': { name: 'Champagne', hex: '#d4af37', type: 'metallic', gradient: 'linear-gradient(145deg, #fde68a 0%, #d4af37 30%, #b8860b 50%, #d4af37 70%, #fde68a 100%)', shine: true },
  
  // Matte Colors
  'matte-black': { name: 'Matte Black', hex: '#262626', type: 'matte', gradient: 'linear-gradient(145deg, #303030 0%, #262626 50%, #1f1f1f 100%)', matte: true },
  'matte-grey': { name: 'Matte Grey', hex: '#525252', type: 'matte', gradient: 'linear-gradient(145deg, #5c5c5c 0%, #525252 50%, #474747 100%)', matte: true },
  'matte-army': { name: 'Matte Army', hex: '#4d5739', type: 'matte', gradient: 'linear-gradient(145deg, #5a6642 0%, #4d5739 50%, #3f4730 100%)', matte: true },
  'matte-navy': { name: 'Matte Navy', hex: '#1e3a5f', type: 'matte', gradient: 'linear-gradient(145deg, #254770 0%, #1e3a5f 50%, #172d4d 100%)', matte: true },
  
  // Premium Colors (require unlock)
  'carbon-fiber': { name: 'Carbon Fiber', hex: '#1f1f1f', type: 'premium', gradient: 'repeating-linear-gradient(45deg, #1f1f1f 0px, #1f1f1f 2px, #2d2d2d 2px, #2d2d2d 4px)', premium: true, price: 2500 },
  'neon-cyan': { name: 'Neon Cyan', hex: '#06b6d4', type: 'premium', gradient: 'linear-gradient(145deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)', premium: true, glow: true, price: 1500 },
  'neon-pink': { name: 'Neon Pink', hex: '#ec4899', type: 'premium', gradient: 'linear-gradient(145deg, #f472b6 0%, #ec4899 50%, #db2777 100%)', premium: true, glow: true, price: 1500 },
  'neon-lime': { name: 'Neon Lime', hex: '#84cc16', type: 'premium', gradient: 'linear-gradient(145deg, #a3e635 0%, #84cc16 50%, #65a30d 100%)', premium: true, glow: true, price: 1500 },
  'galaxy-purple': { name: 'Galaxy Purple', hex: '#581c87', type: 'premium', gradient: 'linear-gradient(145deg, #7c3aed 0%, #6b21a8 30%, #581c87 50%, #3b0764 100%)', premium: true, price: 2000 },
  'inferno': { name: 'Inferno', hex: '#dc2626', type: 'premium', gradient: 'linear-gradient(145deg, #fbbf24 0%, #f97316 30%, #dc2626 60%, #991b1b 100%)', premium: true, price: 2000 },
}

// Car Categories with variants
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
  
  const sizeClasses = {
    sm: { width: 60, height: 30 },
    md: { width: 120, height: 60 },
    lg: { width: 180, height: 90 },
    xl: { width: 260, height: 130 },
  }
  
  const { width, height } = sizeClasses[size]
  
  // Generate car shape based on category
  const carShape = useMemo(() => {
    const shapes: Record<string, { body: string, roof: string, wheels: string, lights: string }> = {
      sedan: {
        body: 'M5,65 L15,65 L20,55 L25,45 L75,45 L85,55 L90,65 L95,65 L95,75 L5,75 Z',
        roof: 'M30,45 L35,30 L65,30 L70,45 Z',
        wheels: '18,75 82,75',
        lights: 'M10,58 L18,58 L18,68 L10,68 Z M82,58 L90,58 L90,68 L82,68 Z'
      },
      suv: {
        body: 'M5,65 L10,65 L15,50 L20,40 L80,40 L85,50 L90,65 L95,65 L95,78 L5,78 Z',
        roof: 'M22,40 L25,25 L75,25 L78,40 Z',
        wheels: '18,78 82,78',
        lights: 'M8,52 L16,52 L16,64 L8,64 Z M84,52 L92,52 L92,64 L84,64 Z'
      },
      sports: {
        body: 'M2,68 L12,68 L18,58 L30,50 L70,50 L85,58 L92,68 L98,68 L98,75 L2,75 Z',
        roof: 'M35,50 L40,38 L60,38 L65,50 Z',
        wheels: '16,75 84,75',
        lights: 'M5,60 L14,60 L14,68 L5,68 Z M86,60 L95,60 L95,68 L86,68 Z'
      },
      truck: {
        body: 'M5,65 L10,65 L15,50 L20,40 L45,40 L48,50 L95,50 L95,78 L5,78 Z',
        roof: 'M22,40 L25,28 L43,28 L46,40 Z',
        wheels: '18,78 78,78',
        lights: 'M8,52 L16,52 L16,64 L8,64 Z M88,55 L93,55 L93,65 L88,65 Z'
      },
      hatchback: {
        body: 'M8,65 L15,65 L20,52 L28,45 L72,45 L82,55 L88,65 L92,65 L92,75 L8,75 Z',
        roof: 'M32,45 L35,32 L70,32 L75,45 Z',
        wheels: '20,75 78,75',
        lights: 'M12,55 L18,55 L18,64 L12,64 Z M82,55 L88,55 L88,64 L82,64 Z'
      },
      luxury: {
        body: 'M3,65 L12,65 L18,52 L25,42 L78,42 L85,52 L92,65 L97,65 L97,76 L3,76 Z',
        roof: 'M28,42 L32,28 L72,28 L76,42 Z',
        wheels: '16,76 84,76',
        lights: 'M6,54 L15,54 L15,65 L6,65 Z M85,54 L94,54 L94,65 L85,65 Z'
      },
      electric: {
        body: 'M5,65 L12,65 L18,55 L25,48 L75,48 L82,55 L88,65 L95,65 L95,74 L5,74 Z',
        roof: 'M28,48 L32,35 L68,35 L72,48 Z',
        wheels: '18,74 82,74',
        lights: 'M8,56 L16,56 L16,65 L8,65 Z M84,56 L92,56 L92,65 L84,65 Z'
      },
    }
    return shapes[category] || shapes.sedan
  }, [category])

  const perspectiveTransform = {
    side: 'rotateY(0deg)',
    front: 'rotateY(90deg)',
    angled: 'rotateX(15deg) rotateY(-25deg)',
    top: 'rotateX(60deg)',
  }

  return (
    <div 
      className={`relative ${animated ? 'animate-float' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      style={{ 
        width, 
        height: height + 20,
        perspective: '500px',
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
    >
      {/* Car Container with 3D Transform */}
      <div 
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transform: `${perspectiveTransform[perspective]} rotateZ(${rotation}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Main Car SVG */}
        <svg 
          viewBox="0 0 100 85" 
          className="w-full h-full drop-shadow-2xl"
          style={{ 
            filter: colorData.glow ? `drop-shadow(0 0 10px ${colorData.hex})` : undefined 
          }}
        >
          <defs>
            {/* Body Gradient */}
            <linearGradient id={`body-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorData.hex} stopOpacity="1" />
              <stop offset="50%" stopColor={colorData.hex} stopOpacity="0.9" />
              <stop offset="100%" stopColor={colorData.hex} stopOpacity="0.7" />
            </linearGradient>
            
            {/* Metallic Shine */}
            {colorData.shine && (
              <linearGradient id={`shine-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                <stop offset="50%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="white" stopOpacity="0.2" />
              </linearGradient>
            )}
            
            {/* Window Gradient */}
            <linearGradient id="window-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            
            {/* Chrome Gradient for trim */}
            <linearGradient id="chrome" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>
          </defs>
          
          {/* Shadow underneath */}
          {showShadow && (
            <ellipse cx="50" cy="82" rx="40" ry="3" fill="rgba(0,0,0,0.3)" />
          )}
          
          {/* Car Body */}
          <path 
            d={carShape.body} 
            fill={`url(#body-${color})`}
            stroke={colorData.hex}
            strokeWidth="0.5"
            className="transition-all duration-300"
          />
          
          {/* Body Highlight for 3D effect */}
          <path 
            d={carShape.body} 
            fill="url(#chrome)"
            opacity="0.1"
            style={{ clipPath: 'inset(0 0 50% 0)' }}
          />
          
          {/* Metallic Shine Overlay */}
          {colorData.shine && (
            <path 
              d={carShape.body} 
              fill={`url(#shine-${color})`}
            />
          )}
          
          {/* Roof / Windows */}
          <path 
            d={carShape.roof} 
            fill="url(#window-gradient)"
            stroke="#475569"
            strokeWidth="0.5"
          />
          
          {/* Window Reflection */}
          <path 
            d={carShape.roof} 
            fill="white"
            opacity="0.15"
            style={{ clipPath: 'inset(0 50% 50% 0)' }}
          />
          
          {/* Headlights / Taillights */}
          <path 
            d={carShape.lights} 
            fill="#fef3c7"
            stroke="#fbbf24"
            strokeWidth="0.3"
          />
          
          {/* Wheels */}
          {carShape.wheels.split(' ').map((pos, i) => {
            const [x, y] = pos.split(',').map(Number)
            return (
              <g key={i}>
                {/* Tire */}
                <circle cx={x} cy={y} r="8" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
                {/* Rim */}
                <circle cx={x} cy={y} r="5" fill="url(#chrome)" />
                {/* Rim Center */}
                <circle cx={x} cy={y} r="2" fill="#374151" />
                {/* Rim Spokes */}
                {[0, 72, 144, 216, 288].map((angle, j) => (
                  <line 
                    key={j}
                    x1={x} y1={y - 5}
                    x2={x} y2={y - 2}
                    stroke="#6b7280"
                    strokeWidth="0.5"
                    transform={`rotate(${angle} ${x} ${y})`}
                  />
                ))}
              </g>
            )
          })}
          
          {/* Chrome Trim Line */}
          <line x1="15" y1="65" x2="85" y2="65" stroke="url(#chrome)" strokeWidth="1" opacity="0.6" />
          
          {/* Door Handle */}
          <rect x="45" y="55" width="6" height="2" rx="1" fill="url(#chrome)" opacity="0.8" />
          
          {/* Side Mirror (left) */}
          <ellipse cx="22" cy="48" rx="3" ry="2" fill={`url(#body-${color})`} stroke={colorData.hex} strokeWidth="0.3" />
        </svg>
      </div>
      
      {/* Floor Reflection */}
      {showReflection && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/3 opacity-20"
          style={{
            transform: 'scaleY(-1)',
            maskImage: 'linear-gradient(to bottom, transparent, black)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
          }}
        >
          <svg viewBox="0 0 100 85" className="w-full h-full">
            <path d={carShape.body} fill={colorData.hex} opacity="0.3" />
          </svg>
        </div>
      )}
    </div>
  )
}

// Navigation Marker Component - Shows car from angled top-down view
interface NavMarkerProps {
  category: keyof typeof CAR_CATEGORIES
  color: keyof typeof CAR_COLORS
  heading?: number // Direction in degrees
  size?: number
  isMoving?: boolean
}

export function NavMarker({ category, color, heading = 0, size = 32, isMoving = false }: NavMarkerProps) {
  const colorData = CAR_COLORS[color] || CAR_COLORS['midnight-black']
  
  return (
    <div 
      className={`relative ${isMoving ? 'animate-pulse' : ''}`}
      style={{ 
        width: size, 
        height: size * 1.5,
        transform: `rotate(${heading}deg)`,
        transition: 'transform 0.3s ease-out',
      }}
    >
      <svg viewBox="0 0 32 48" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id={`nav-body-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorData.hex} />
            <stop offset="100%" stopColor={colorData.hex} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        
        {/* Car body - angled top view */}
        <path 
          d="M16,2 L28,14 L28,38 L24,44 L8,44 L4,38 L4,14 Z" 
          fill={`url(#nav-body-${color})`}
          stroke={colorData.hex}
          strokeWidth="1"
        />
        
        {/* Windshield */}
        <path 
          d="M10,16 L16,8 L22,16 L22,22 L10,22 Z" 
          fill="#1e293b"
          opacity="0.8"
        />
        
        {/* Rear window */}
        <path 
          d="M10,32 L22,32 L22,38 L10,38 Z" 
          fill="#1e293b"
          opacity="0.6"
        />
        
        {/* Headlights */}
        <circle cx="10" cy="12" r="2" fill="#fef3c7" />
        <circle cx="22" cy="12" r="2" fill="#fef3c7" />
        
        {/* Taillights */}
        <rect x="8" y="40" width="4" height="2" rx="0.5" fill="#ef4444" />
        <rect x="20" y="40" width="4" height="2" rx="0.5" fill="#ef4444" />
        
        {/* Direction indicator arrow */}
        {isMoving && (
          <path 
            d="M16,0 L20,6 L12,6 Z" 
            fill="#3b82f6"
            className="animate-bounce"
          />
        )}
      </svg>
    </div>
  )
}

// Mini car for profile avatars
interface ProfileCarProps {
  category: keyof typeof CAR_CATEGORIES
  color: keyof typeof CAR_COLORS
  size?: number
}

export function ProfileCar({ category, color, size = 48 }: ProfileCarProps) {
  const colorData = CAR_COLORS[color] || CAR_COLORS['midnight-black']
  
  return (
    <div 
      className="relative"
      style={{ width: size, height: size * 0.6 }}
    >
      <svg viewBox="0 0 100 60" className="w-full h-full">
        <defs>
          <linearGradient id={`profile-body-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorData.hex} />
            <stop offset="100%" stopColor={colorData.hex} stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Simplified car silhouette */}
        <path 
          d="M10,40 L15,40 L20,30 L30,22 L70,22 L80,30 L85,40 L90,40 L90,48 L10,48 Z" 
          fill={`url(#profile-body-${color})`}
        />
        <path 
          d="M32,22 L38,12 L62,12 L68,22 Z" 
          fill="#334155"
        />
        {/* Wheels */}
        <circle cx="25" cy="48" r="6" fill="#1f2937" />
        <circle cx="25" cy="48" r="3" fill="#6b7280" />
        <circle cx="75" cy="48" r="6" fill="#1f2937" />
        <circle cx="75" cy="48" r="3" fill="#6b7280" />
      </svg>
    </div>
  )
}
