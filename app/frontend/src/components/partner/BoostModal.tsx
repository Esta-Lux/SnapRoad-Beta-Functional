import { useState } from 'react'
import { X, Rocket, Zap, TrendingUp, Clock, Users } from 'lucide-react'
import type { Offer, BoostConfig } from '@/types/partner'

interface Props {
  offer: Offer
  onClose: () => void
  onBoost: (boostType: string) => Promise<void>
}

const BOOST_PACKAGES = [
  { id: 'basic', name: 'Basic Boost', duration: '24 hours', reach: '500 drivers', price: '10 credits', icon: Zap, color: 'from-blue-500 to-cyan-500', multiplier: '2x' },
  { id: 'standard', name: 'Standard Boost', duration: '3 days', reach: '2,000 drivers', price: '20 credits', icon: TrendingUp, color: 'from-orange-500 to-amber-500', multiplier: '5x', popular: true },
  { id: 'premium', name: 'Premium Boost', duration: '7 days', reach: '5,000+ drivers', price: '40 credits', icon: Rocket, color: 'from-purple-500 to-pink-500', multiplier: '10x' },
]

export default function BoostModal({ offer, onClose, onBoost }: Props) {
  const [selectedBoost, setSelectedBoost] = useState<string | null>(null)
  const [boosting, setBoosting] = useState(false)
  const [boostConfig, setBoostConfig] = useState<BoostConfig>({ duration_days: 3, reach_target: 2000, total_cost: 20 })

  const handleBoost = async () => {
    if (!selectedBoost) return
    setBoosting(true)
    await onBoost(selectedBoost)
    setBoosting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <Rocket className="text-orange-400" size={24} />Boost Offer
                </h2>
                <p className="text-slate-400 text-sm mt-1">Amplify "{offer.title}" to reach more drivers</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {BOOST_PACKAGES.map(pkg => (
                <button key={pkg.id} onClick={() => { setSelectedBoost(pkg.id); setBoostConfig({ duration_days: pkg.id === 'basic' ? 1 : pkg.id === 'standard' ? 3 : 7, reach_target: pkg.id === 'basic' ? 500 : pkg.id === 'standard' ? 2000 : 5000, total_cost: parseFloat(pkg.price) }) }}
                  className={`relative p-5 rounded-xl border text-left transition-all ${selectedBoost === pkg.id ? 'border-orange-500/50 bg-orange-500/10 ring-2 ring-orange-500/20' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}>
                  {pkg.popular && (<div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">BEST VALUE</div>)}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-3`}>
                    <pkg.icon className="text-white" size={20} />
                  </div>
                  <p className="text-white font-semibold text-sm">{pkg.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{pkg.duration} · {pkg.reach}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-white font-bold">{pkg.price}</span>
                    <span className="text-orange-400 text-xs font-semibold">{pkg.multiplier} reach</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedBoost && (
              <div className="bg-slate-700/30 rounded-xl p-5 mb-6">
                <h3 className="text-white font-semibold text-sm mb-3">Boost Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Clock size={16} className="text-slate-400 mx-auto mb-1" />
                    <p className="text-white font-bold">{boostConfig.duration_days}d</p>
                    <p className="text-slate-500 text-xs">Duration</p>
                  </div>
                  <div>
                    <Users size={16} className="text-slate-400 mx-auto mb-1" />
                    <p className="text-white font-bold">{boostConfig.reach_target.toLocaleString()}</p>
                    <p className="text-slate-500 text-xs">Target Reach</p>
                  </div>
                  <div>
                    <TrendingUp size={16} className="text-slate-400 mx-auto mb-1" />
                    <p className="text-white font-bold">{boostConfig.total_cost} cr</p>
                    <p className="text-slate-500 text-xs">Credits Used</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700 font-medium">Cancel</button>
              <button onClick={handleBoost} disabled={!selectedBoost || boosting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-400 hover:to-red-400 disabled:opacity-50 flex items-center justify-center gap-2">
                {boosting ? (<><Rocket className="animate-bounce" size={18} />Boosting...</>) : (<><Rocket size={18} />Boost Now</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
