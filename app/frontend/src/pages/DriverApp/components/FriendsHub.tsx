import { useState, useEffect } from 'react'
import { Search, UserPlus, Users, X, Shield, Trophy, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '@/contexts/ThemeContext'
import { api } from '@/services/api'

interface Friend {
  id: string
  name: string
  safety_score: number
  level: number
  state: string
}

interface FriendsHubProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  friendsCount: number
}

export default function FriendsHub({ isOpen, onClose, userId }: FriendsHubProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [tab, setTab] = useState<'friends' | 'search'>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      setSearchResult(null)
    }
  }, [isOpen])

  const loadFriends = async () => {
    try {
      const res = await api.get<Friend[]>('/api/friends')
      if (res.success) {
        const data = (res.data as any)?.data ?? res.data
        if (Array.isArray(data)) setFriends(data)
      }
    } catch { /* ignore */ }
  }

  const handleSearch = async () => {
    const id = searchId.trim().replace(/\D/g, '').slice(0, 6)
    if (!id || id.length < 5) {
      toast.error('Enter a valid 5–6 digit SnapRoad ID')
      return
    }
    setLoading(true)
    setSearchResult(null)
    try {
      const res = await api.get<any>(`/api/friends/search?q=${encodeURIComponent(id)}`)
      const data = (res.data as any)?.data ?? res.data
      if (res.success && data) {
        const list = Array.isArray(data) ? data : [data]
        const user = list.length > 0 ? list[0] : null
        setSearchResult(user)
        if (!user) toast.error('User not found')
      } else {
        toast.error('User not found')
      }
    } catch (e) {
      toast.error('Search failed')
    }
    setLoading(false)
  }

  const handleAddFriend = async (friendId: string) => {
    try {
      const res = await api.post<any>('/api/friends/add', { user_id: friendId })
      const data = (res.data as any)?.data ?? res.data
      if (res.success) {
        toast.success((data as any)?.message ?? 'Friend request sent')
        setSearchResult((prev: any) => prev ? { ...prev, is_friend: true } : null)
        loadFriends()
      } else {
        toast.error((data as any)?.message || 'Could not add friend')
      }
    } catch (e) {
      toast.error('Could not add friend')
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const res = await api.delete<any>(`/api/friends/${friendId}`)
      if (res.success) {
        toast.success('Friend removed')
        loadFriends()
      } else {
        toast.error('Could not remove friend')
      }
    } catch (e) {
      toast.error('Could not remove friend')
    }
  }

  if (!isOpen) return null

  const contentBg = isLight ? 'bg-slate-50' : 'bg-slate-900'
  const cardBg = isLight ? 'bg-white border border-slate-200' : 'bg-slate-800'
  const textPrimary = isLight ? 'text-slate-800' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const borderCls = isLight ? 'border-slate-200' : 'border-slate-700'

  return (
    <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-4 ${isLight ? 'bg-black/50' : 'bg-black/80'}`} onClick={onClose}>
      <div className={`w-full max-w-md rounded-2xl overflow-hidden animate-scale-in shadow-xl ${isLight ? 'bg-white' : 'bg-slate-900'}`} onClick={e => e.stopPropagation()}>
        {/* Header — accent bar (matches app) */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Friends Hub</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">
              <X className="text-white" size={16} />
            </button>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs">Your SnapRoad ID</p>
              <p className="text-white text-xl font-bold tracking-wider">{userId}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-xs">Friends</p>
              <p className="text-white text-lg font-bold">{friends.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderCls}`}>
          <button onClick={() => setTab('friends')} data-testid="friends-tab"
            className={`flex-1 py-3 text-sm font-medium ${tab === 'friends' ? 'text-blue-500 border-b-2 border-blue-500' : textMuted}`}>
            My Friends ({friends.length})
          </button>
          <button onClick={() => setTab('search')} data-testid="search-tab"
            className={`flex-1 py-3 text-sm font-medium ${tab === 'search' ? 'text-blue-500 border-b-2 border-blue-500' : textMuted}`}>
            Find Friends
          </button>
        </div>

        {/* Content */}
        <div className={`p-4 max-h-[400px] overflow-auto ${contentBg}`}>
          {tab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className={`mx-auto mb-3 ${isLight ? 'text-slate-300' : 'text-slate-600'}`} size={48} />
                  <p className={textMuted}>No friends yet</p>
                  <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Search by ID in Find Friends to add people</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => (
                    <div key={friend.id} className={`${cardBg} rounded-xl p-3 flex items-center gap-3`}>
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {friend.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${textPrimary}`}>{friend.name}</p>
                        <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                          <span className="flex items-center gap-1"><Shield size={10} /> {friend.safety_score}</span>
                          {friend.state && <><span>·</span><span className="flex items-center gap-1"><MapPin size={10} /> {friend.state}</span></>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFriend(friend.id)}
                        className={`text-sm font-medium ${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'}`}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'search' && (
            <div>
              <div className="flex gap-2 mb-4">
                <div className={`flex-1 ${cardBg} rounded-xl px-3 py-2.5 flex items-center gap-2`}>
                  <Search className={textMuted} size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit ID"
                    value={searchId}
                    onChange={e => setSearchId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`flex-1 bg-transparent text-sm outline-none min-w-0 ${textPrimary}`}
                    maxLength={6}
                  />
                </div>
                <button onClick={handleSearch} disabled={loading} data-testid="search-user-btn"
                  className="bg-blue-500 text-white px-4 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-600">
                  {loading ? '...' : 'Search'}
                </button>
              </div>

              {searchResult && (
                <div className={`${cardBg} rounded-xl p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                      {searchResult.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${textPrimary}`}>{searchResult.name}</p>
                      <p className={`text-sm ${textMuted}`}>ID: {searchResult.id}</p>
                    </div>
                  </div>
                  <div className={`grid grid-cols-3 gap-2 mb-3 ${isLight ? 'bg-slate-100' : 'bg-slate-700/50'} rounded-lg p-2`}>
                    <div className="text-center">
                      <Shield className={`mx-auto mb-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} size={16} />
                      <p className={`font-bold text-sm ${textPrimary}`}>{searchResult.safety_score}</p>
                      <p className={`text-[10px] ${textMuted}`}>Score</p>
                    </div>
                    <div className="text-center">
                      <Trophy className={`mx-auto mb-1 ${isLight ? 'text-amber-600' : 'text-yellow-400'}`} size={16} />
                      <p className={`font-bold text-sm ${textPrimary}`}>{searchResult.level}</p>
                      <p className={`text-[10px] ${textMuted}`}>Level</p>
                    </div>
                    <div className="text-center">
                      <MapPin className={`mx-auto mb-1 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} size={16} />
                      <p className={`font-bold text-sm ${textPrimary}`}>{searchResult.state || '—'}</p>
                      <p className={`text-[10px] ${textMuted}`}>State</p>
                    </div>
                  </div>
                  {searchResult.is_friend ? (
                    <div className={`text-center text-sm py-2 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓ Already friends</div>
                  ) : (
                    <button onClick={() => handleAddFriend(searchResult.id)} data-testid="add-friend-btn"
                      className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-600">
                      <UserPlus size={16} /> Add Friend
                    </button>
                  )}
                </div>
              )}

              <p className={`text-xs text-center mt-4 ${textMuted}`}>
                Share your ID so friends can search and add you.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
