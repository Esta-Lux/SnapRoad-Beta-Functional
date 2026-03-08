import { useState } from 'react'
import {
  MapPin, Plus, Edit2, Trash2, Crown, Store, X,
  Globe, ChevronRight, Check,
} from 'lucide-react'
import type { PartnerProfile, PartnerLocation } from '@/types/partner'

interface Props {
  partnerProfile: PartnerProfile
  onAdd: (data: LocationFormData) => void
  onUpdate: (locationId: string, data: LocationFormData) => void
  onDelete: (locationId: string) => void
  onSetPrimary: (locationId: string) => void
  onUpgradePlan?: () => void
}

export interface LocationFormData {
  name: string
  address: string
  lat: number
  lng: number
  is_primary: boolean
}

function LocationModal({
  location, onClose, onSave, maxLocations, currentCount,
}: {
  location?: PartnerLocation
  onClose: () => void
  onSave: (data: LocationFormData) => void
  maxLocations: number
  currentCount: number
}) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    address: location?.address || '',
    lat: location?.lat || 39.9612,
    lng: location?.lng || -82.9988,
    is_primary: location?.is_primary || currentCount === 0,
  })
  const [useManualCoords, setUseManualCoords] = useState(false)

  const sampleAddresses = [
    { label: 'Downtown Columbus', address: '100 N High St, Columbus, OH 43215', lat: 39.9612, lng: -82.9988 },
    { label: 'Short North', address: '700 N High St, Columbus, OH 43215', lat: 39.9780, lng: -83.0030 },
    { label: 'Polaris', address: '1500 Polaris Pkwy, Columbus, OH 43240', lat: 40.1465, lng: -82.9859 },
    { label: 'Easton', address: '160 Easton Town Center, Columbus, OH 43219', lat: 40.0506, lng: -82.9157 },
    { label: 'German Village', address: '588 S Third St, Columbus, OH 43215', lat: 39.9434, lng: -82.9897 },
  ]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <MapPin className="text-emerald-400" size={24} />
                {location ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Location Name <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g., Main Store - Downtown"
                  value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  data-testid="location-name-input" />
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Quick Address Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  {sampleAddresses.map((addr, i) => (
                    <button key={i} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, address: addr.address, lat: addr.lat, lng: addr.lng }))}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.address === addr.address
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-700/30 border-white/5 text-slate-400 hover:border-white/20'
                      }`}>
                      {addr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1 block">Full Address <span className="text-red-400">*</span></label>
                <input type="text" placeholder="123 Main St, City, State ZIP"
                  value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  data-testid="location-address-input" />
              </div>

              <div>
                <button type="button" onClick={() => setUseManualCoords(!useManualCoords)}
                  className="text-slate-400 text-sm hover:text-white flex items-center gap-2">
                  <Globe size={14} />
                  {useManualCoords ? 'Hide' : 'Adjust'} Map Coordinates
                  <ChevronRight className={`transition-transform ${useManualCoords ? 'rotate-90' : ''}`} size={14} />
                </button>

                {useManualCoords && (
                  <div className="mt-3 p-4 bg-slate-700/30 rounded-xl border border-white/5">
                    <p className="text-slate-500 text-xs mb-3">Fine-tune exactly where your offer gem appears on the map</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Latitude</label>
                        <input type="number" step="0.0001" value={formData.lat}
                          onChange={(e) => setFormData(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Longitude</label>
                        <input type="number" step="0.0001" value={formData.lng}
                          onChange={(e) => setFormData(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl">
                <input type="checkbox" id="is-primary"
                  checked={formData.is_primary} onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-emerald-500 focus:ring-emerald-500" />
                <label htmlFor="is-primary" className="text-white cursor-pointer">
                  <span className="font-medium">Set as Primary Location</span>
                  <p className="text-slate-400 text-sm">Primary location is used as default for new offers</p>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">Cancel</button>
                <button type="button" onClick={() => onSave(formData)} disabled={!formData.name || !formData.address}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Check size={18} />
                  {location ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LocationsTab({ partnerProfile, onAdd, onUpdate, onDelete, onSetPrimary, onUpgradePlan }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<PartnerLocation | null>(null)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Crown className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{partnerProfile.plan_info.name} Plan</h3>
              <p className="text-slate-400 text-sm">
                {partnerProfile.location_count} of {partnerProfile.max_locations === 999999 ? 'Unlimited' : partnerProfile.max_locations} locations used
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-emerald-400 font-bold text-xl">{partnerProfile.max_locations === 999999 ? '∞' : partnerProfile.max_locations - partnerProfile.location_count}</p>
              <p className="text-slate-500 text-xs">Remaining</p>
            </div>
            {partnerProfile.plan !== 'enterprise' && (
              <button onClick={onUpgradePlan} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 font-medium text-sm">
                Upgrade Plan
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
            style={{ width: `${Math.min((partnerProfile.location_count / (partnerProfile.max_locations === 999999 ? 100 : partnerProfile.max_locations)) * 100, 100)}%` }} />
        </div>
      </div>

      {partnerProfile.can_add_location && (
        <button onClick={() => setShowAddModal(true)} data-testid="add-location-btn"
          className="w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-dashed border-emerald-500/30 p-6 hover:border-emerald-500/50 transition-all group">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-all">
              <Plus className="text-emerald-400" size={24} />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold">Add New Location</p>
              <p className="text-slate-400 text-sm">Add a store or business location to create offers for</p>
            </div>
          </div>
        </button>
      )}

      <div className="space-y-4">
        {partnerProfile.locations.map(location => (
          <div key={location.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${location.is_primary ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' : 'bg-slate-700/50'}`}>
                  <MapPin className={location.is_primary ? 'text-amber-400' : 'text-slate-400'} size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{location.name}</h3>
                    {location.is_primary && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">Primary</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{location.address}</p>
                  <p className="text-slate-500 text-xs mt-2">Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!location.is_primary && (
                  <button onClick={() => onSetPrimary(location.id)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-medium">
                    Set Primary
                  </button>
                )}
                <button onClick={() => setEditingLocation(location)}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => onDelete(location.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {partnerProfile.locations.length === 0 && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
          <Store className="text-slate-600 mx-auto mb-4" size={64} />
          <h3 className="text-white font-bold text-xl mb-2">No Locations Yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Add your business locations to start creating offers. Each location can have its own offers that appear on the map.</p>
          <button onClick={() => setShowAddModal(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-400 hover:to-teal-400 inline-flex items-center gap-2">
            <Plus size={20} />Add Your First Location
          </button>
        </div>
      )}

      {showAddModal && (
        <LocationModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => { onAdd(data); setShowAddModal(false) }}
          maxLocations={partnerProfile.max_locations}
          currentCount={partnerProfile.location_count}
        />
      )}

      {editingLocation && (
        <LocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={(data) => { onUpdate(editingLocation.id, data); setEditingLocation(null) }}
          maxLocations={partnerProfile.max_locations}
          currentCount={partnerProfile.location_count}
        />
      )}
    </div>
  )
}
