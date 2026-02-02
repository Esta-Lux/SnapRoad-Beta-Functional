import { useState, useEffect, useRef } from 'react'
import { X, RotateCcw, Gem, Lock, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface Car {
  id: number
  name: string
  type: string
  price: number
  owned: boolean
  equipped: boolean
  color: string
}

interface Skin {
  id: number
  name: string
  color: string | null
  gradient: string | null
  price: number
  owned: boolean
  equipped: boolean
  rarity: string
}

interface CarShowroomProps {
  isOpen: boolean
  onClose: () => void
  userGems: number
  onGemsUpdate: (newGems: number) => void
}

export default function CarShowroom({ isOpen, onClose, userGems, onGemsUpdate }: CarShowroomProps) {
  const [tab, setTab] = useState<'cars' | 'skins'>('cars')
  const [cars, setCars] = useState<Car[]>([])
  const [skins, setSkins] = useState<Skin[]>([])
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null)
  const [equippedCarId, setEquippedCarId] = useState(1)
  const [equippedSkinId, setEquippedSkinId] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const lastX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [carsRes, skinsRes] = await Promise.all([
        fetch(`${API_URL}/api/cars`),
        fetch(`${API_URL}/api/skins`)
      ])
      const carsData = await carsRes.json()
      const skinsData = await skinsRes.json()
      
      if (carsData.success) {
        setCars(carsData.data)
        setEquippedCarId(carsData.equipped_id)
        setSelectedCar(carsData.data.find((c: Car) => c.id === carsData.equipped_id) || carsData.data[0])
      }
      if (skinsData.success) {
        setSkins(skinsData.data)
        setEquippedSkinId(skinsData.equipped_id)
        setSelectedSkin(skinsData.data.find((s: Skin) => s.id === skinsData.equipped_id) || skinsData.data[0])
      }
    } catch (e) {
      console.log('Could not load car data')
    }
  }

  const handlePurchaseCar = async (car: Car) => {
    if (car.owned) return
    if (userGems < car.price) {
      toast.error(`Need ${car.price - userGems} more gems`)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/cars/${car.id}/purchase`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        onGemsUpdate(data.new_gems)
        loadData()
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error('Purchase failed')
    }
  }

  const handleEquipCar = async (car: Car) => {
    if (!car.owned) return
    try {
      const res = await fetch(`${API_URL}/api/cars/${car.id}/equip`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setEquippedCarId(car.id)
      }
    } catch (e) {
      toast.error('Could not equip car')
    }
  }

  const handlePurchaseSkin = async (skin: Skin) => {
    if (skin.owned) return
    if (userGems < skin.price) {
      toast.error(`Need ${skin.price - userGems} more gems`)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/skins/${skin.id}/purchase`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        onGemsUpdate(data.new_gems)
        loadData()
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error('Purchase failed')
    }
  }

  const handleEquipSkin = async (skin: Skin) => {
    if (!skin.owned) return
    try {
      const res = await fetch(`${API_URL}/api/skins/${skin.id}/equip`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setEquippedSkinId(skin.id)
        setSelectedSkin(skin)
      }
    } catch (e) {
      toast.error('Could not equip skin')
    }
  }

  // Rotation handlers for 360 view
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    lastX.current = e.clientX
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const delta = e.clientX - lastX.current
    setRotation(prev => (prev + delta * 0.5) % 360)
    lastX.current = e.clientX
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    lastX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const delta = e.touches[0].clientX - lastX.current
    setRotation(prev => (prev + delta * 0.5) % 360)
    lastX.current = e.touches[0].clientX
  }

  const getCurrentSkinStyle = () => {
    const skin = selectedSkin || skins.find(s => s.id === equippedSkinId)
    if (!skin) return { background: '#3B82F6' }
    if (skin.gradient) return { background: skin.gradient }
    return { background: skin.color || '#3B82F6' }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-slate-400'
      case 'uncommon': return 'text-green-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-purple-400'
      case 'legendary': return 'text-yellow-400'
      default: return 'text-slate-400'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">Car Studio</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-900/50 px-3 py-1 rounded-full">
                <Gem className="text-emerald-400" size={14} />
                <span className="text-white font-bold text-sm">{userGems.toLocaleString()}</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <X className="text-white" size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 bg-slate-900/50 rounded-xl p-1">
            <button onClick={() => setTab('cars')} data-testid="cars-tab"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'cars' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>
              My Cars
            </button>
            <button onClick={() => setTab('skins')} data-testid="skins-tab"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'skins' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>
              Paint Shop
            </button>
          </div>
        </div>

        {/* 3D Car View */}
        <div 
          ref={containerRef}
          className="h-48 bg-gradient-to-b from-slate-800 to-slate-900 relative cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Floor reflection */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-700/30 to-transparent" />
          
          {/* Car SVG */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotateY(${rotation}deg)`, transformStyle: 'preserve-3d' }}>
            <svg viewBox="0 0 200 100" className="w-56 h-28 drop-shadow-2xl" style={{ transform: `perspective(500px) rotateY(${rotation * 0.1}deg)` }}>
              {/* Car body */}
              <path d="M30 60 Q30 45 50 45 L70 45 L80 30 Q85 25 100 25 L130 25 Q145 25 150 30 L160 45 L170 45 Q190 45 190 60 L190 70 L30 70 Z" 
                style={getCurrentSkinStyle()} className="transition-all duration-300" />
              {/* Windows */}
              <path d="M82 32 L90 45 L140 45 L148 32 Q145 28 130 28 L100 28 Q87 28 82 32" fill="#1e293b" fillOpacity="0.8" />
              {/* Window divider */}
              <line x1="115" y1="28" x2="115" y2="45" stroke="#0f172a" strokeWidth="2" />
              {/* Wheels */}
              <circle cx="60" cy="70" r="14" fill="#1f2937" />
              <circle cx="60" cy="70" r="10" fill="#374151" />
              <circle cx="60" cy="70" r="4" fill="#6b7280" />
              <circle cx="160" cy="70" r="14" fill="#1f2937" />
              <circle cx="160" cy="70" r="10" fill="#374151" />
              <circle cx="160" cy="70" r="4" fill="#6b7280" />
              {/* Headlights */}
              <ellipse cx="185" cy="55" rx="4" ry="6" fill="#fbbf24" fillOpacity="0.8" />
              <ellipse cx="35" cy="55" rx="4" ry="6" fill="#ef4444" fillOpacity="0.8" />
              {/* Details */}
              <line x1="50" y1="60" x2="170" y2="60" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.3" />
            </svg>
          </div>

          {/* Rotation controls */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button onClick={() => setRotation(r => r - 45)} className="w-8 h-8 bg-slate-700/80 rounded-full flex items-center justify-center">
              <ChevronLeft className="text-white" size={16} />
            </button>
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <RotateCcw size={12} />
              <span>Drag to rotate</span>
            </div>
            <button onClick={() => setRotation(r => r + 45)} className="w-8 h-8 bg-slate-700/80 rounded-full flex items-center justify-center">
              <ChevronRight className="text-white" size={16} />
            </button>
          </div>

          {/* Current car name */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/80 px-3 py-1 rounded-full">
            <p className="text-white text-sm font-medium">{selectedCar?.name || 'Compact Cruiser'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[280px] overflow-auto">
          {tab === 'cars' && (
            <div className="grid grid-cols-2 gap-2">
              {cars.map(car => (
                <button key={car.id} onClick={() => setSelectedCar(car)} data-testid={`car-${car.id}`}
                  className={`bg-slate-800 rounded-xl p-3 text-left relative overflow-hidden ${selectedCar?.id === car.id ? 'ring-2 ring-blue-500' : ''}`}>
                  {!car.owned && (
                    <div className="absolute top-2 right-2">
                      <Lock className="text-slate-500" size={14} />
                    </div>
                  )}
                  {car.id === equippedCarId && car.owned && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="text-white" size={12} />
                    </div>
                  )}
                  
                  {/* Mini car preview */}
                  <div className="w-full h-12 flex items-center justify-center mb-2">
                    <div className="w-16 h-8 rounded-lg" style={{ background: car.color }} />
                  </div>
                  
                  <p className="text-white text-sm font-medium truncate">{car.name}</p>
                  <p className="text-slate-400 text-xs capitalize">{car.type}</p>
                  
                  {car.owned ? (
                    car.id === equippedCarId ? (
                      <span className="text-emerald-400 text-xs">Equipped</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleEquipCar(car) }}
                        className="text-blue-400 text-xs hover:underline">Equip</button>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      <Gem size={10} /> {car.price.toLocaleString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === 'skins' && (
            <div className="grid grid-cols-3 gap-2">
              {skins.map(skin => (
                <button key={skin.id} onClick={() => { setSelectedSkin(skin); if (skin.owned) handleEquipSkin(skin) }}
                  data-testid={`skin-${skin.id}`}
                  className={`relative rounded-xl overflow-hidden ${selectedSkin?.id === skin.id ? 'ring-2 ring-blue-500' : ''}`}>
                  {/* Color preview */}
                  <div className="aspect-square" style={skin.gradient ? { background: skin.gradient } : { background: skin.color || '#3B82F6' }}>
                    {!skin.owned && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="text-white" size={20} />
                      </div>
                    )}
                    {skin.id === equippedSkinId && skin.owned && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={12} />
                      </div>
                    )}
                    {skin.rarity === 'legendary' && (
                      <Sparkles className="absolute top-1 left-1 text-yellow-300" size={14} />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="bg-slate-800 p-2">
                    <p className="text-white text-[10px] font-medium truncate">{skin.name}</p>
                    <p className={`text-[9px] capitalize ${getRarityColor(skin.rarity)}`}>{skin.rarity}</p>
                    {!skin.owned && (
                      <div className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                        <Gem size={8} /> {skin.price}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action button */}
        {tab === 'cars' && selectedCar && !selectedCar.owned && (
          <div className="p-4 pt-0">
            <button onClick={() => handlePurchaseCar(selectedCar)} data-testid="purchase-car-btn"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <Gem size={16} /> Purchase for {selectedCar.price.toLocaleString()} gems
            </button>
          </div>
        )}
        
        {tab === 'skins' && selectedSkin && !selectedSkin.owned && (
          <div className="p-4 pt-0">
            <button onClick={() => handlePurchaseSkin(selectedSkin)} data-testid="purchase-skin-btn"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <Gem size={16} /> Purchase for {selectedSkin.price.toLocaleString()} gems
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
