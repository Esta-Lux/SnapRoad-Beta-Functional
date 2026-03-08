import { Eye, Check, Gem, Edit2, Trash2, Rocket } from 'lucide-react'
import type { Offer } from '@/types/partner'

interface Props {
  offers: Offer[]
  onBoost: (offer: Offer) => void
  onEdit: (offerId: string) => void
  onDelete: (offerId: string) => void
}

export default function OffersTab({ offers, onBoost, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {offers.map(offer => (
          <div key={offer.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-semibold text-lg">{offer.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : offer.status === 'paused' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-4">{offer.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-slate-300">{offer.discount_percent}% off</span>
                  <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-cyan-400 flex items-center gap-1"><Gem size={14} />+{offer.gems_reward}</span>
                  <span className="text-slate-400"><Eye size={14} className="inline mr-1" />{offer.views.toLocaleString()}</span>
                  <span className="text-emerald-400"><Check size={14} className="inline mr-1" />{offer.redemption_count}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onBoost(offer)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 hover:from-orange-500/30 hover:to-red-500/30 flex items-center gap-2 font-medium">
                  <Rocket size={16} />Boost
                </button>
                <button onClick={() => onEdit(String(offer.id))} className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white"><Edit2 size={16} /></button>
                <button onClick={() => onDelete(String(offer.id))} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
