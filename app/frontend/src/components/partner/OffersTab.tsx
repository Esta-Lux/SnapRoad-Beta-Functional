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
              <div className="flex flex-1 gap-4 md:flex-row">
                {offer.image_url ? (
                  <img
                    src={offer.image_url}
                    alt={offer.business_name || offer.title}
                    className="h-24 w-full rounded-2xl object-cover md:h-24 md:w-32"
                  />
                ) : (
                  <div className="h-24 w-full md:w-32 shrink-0 rounded-2xl border border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs text-center px-2">
                    No hero image — drivers still see name & offer details
                  </div>
                )}
                <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-white font-semibold text-lg">{offer.business_name || offer.title}</h3>
                  {offer.title && offer.business_name && offer.title !== offer.business_name ? (
                    <span className="text-slate-400 text-sm font-medium">· {offer.title}</span>
                  ) : null}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : offer.status === 'paused' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                  </span>
                </div>
                {offer.category_label ? (
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">{offer.category_label}</p>
                ) : null}
                <p className="text-slate-400 text-sm mb-4">{offer.description}</p>
                {offer.address ? <p className="text-slate-500 text-xs mb-3">{offer.address}</p> : null}
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-slate-300">{offer.discount_percent}% off</span>
                  <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-cyan-400 flex items-center gap-1"><Gem size={14} />{offer.gem_cost} gem cost</span>
                  <span className="text-slate-400"><Eye size={14} className="inline mr-1" />{offer.views.toLocaleString()}</span>
                  <span className="text-emerald-400"><Check size={14} className="inline mr-1" />{offer.redemption_count}</span>
                </div>
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
