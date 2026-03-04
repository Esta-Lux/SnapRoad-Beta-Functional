import { useState, useEffect } from 'react'
import { Search, UserPlus, Users, X, ChevronRight, Shield, Trophy, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

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

export default function FriendsHub({ isOpen, onClose, userId, friendsCount }: FriendsHubProps) {
  const [tab, setTab] = useState<'friends' | 'search'>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFriends()
    }
  }, [isOpen])

  const loadFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/friends`)
      const data = await res.json()
      if (data.success) setFriends(data.data)
    } catch (e) {
      console.log('Could not load friends')
    }
  }

  const handleSearch = async () => {
    if (!searchId || searchId.length !== 6) {
      toast.error('Please enter a valid 6-digit ID')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/friends/search?q=${encodeURIComponent(searchId)}`)
      const data = await res.json()
      if (data.success) {
        setSearchResult(data.data)
      } else {
        toast.error('User not found')
        setSearchResult(null)
      }
    } catch (e) {
      toast.error('Search failed')
    }
    setLoading(false)
  }

  const handleAddFriend = async (friendId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: friendId })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setSearchResult({ ...searchResult, is_friend: true })
        loadFriends()
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error('Could not add friend')
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await fetch(`${API_URL}/api/friends/${friendId}`, { method: 'DELETE' })
      toast.success('Friend removed')
      loadFriends()
    } catch (e) {
      toast.error('Could not remove friend')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Friends Hub</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>
          
          {/* My ID Card */}
          <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs">Your SnapRoad ID</p>
              <p className="text-white text-2xl font-bold tracking-wider">{userId}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs">Friends</p>
              <p className="text-white text-xl font-bold">{friendsCount}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button onClick={() => setTab('friends')} data-testid="friends-tab"
            className={`flex-1 py-3 text-sm font-medium ${tab === 'friends' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}>
            My Friends ({friends.length})
          </button>
          <button onClick={() => setTab('search')} data-testid="search-tab"
            className={`flex-1 py-3 text-sm font-medium ${tab === 'search' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}>
            Find Friends
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-auto">
          {tab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto text-slate-600 mb-3" size={48} />
                  <p className="text-slate-400">No friends yet</p>
                  <p className="text-slate-500 text-sm mt-1">Search by ID to add friends</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => (
                    <div key={friend.id} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {friend.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{friend.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Shield size={10} /> {friend.safety_score}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {friend.state}</span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFriend(friend.id)}
                        className="text-red-400 text-xs hover:text-red-300">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'search' && (
            <div>
              {/* Search Input */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Search className="text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit ID" 
                    value={searchId}
                    onChange={e => setSearchId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 bg-transparent text-white text-sm outline-none"
                    maxLength={6}
                  />
                </div>
                <button onClick={handleSearch} disabled={loading} data-testid="search-user-btn"
                  className="bg-blue-500 text-white px-4 rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? '...' : 'Search'}
                </button>
              </div>

              {/* Search Result */}
              {searchResult && (
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                      {searchResult.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{searchResult.name}</p>
                      <p className="text-slate-400 text-sm">ID: {searchResult.id}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-700 rounded-lg p-2 text-center">
                      <Shield className="mx-auto text-emerald-400 mb-1" size={16} />
                      <p className="text-white font-bold text-sm">{searchResult.safety_score}</p>
                      <p className="text-slate-400 text-[10px]">Score</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-2 text-center">
                      <Trophy className="mx-auto text-yellow-400 mb-1" size={16} />
                      <p className="text-white font-bold text-sm">{searchResult.level}</p>
                      <p className="text-slate-400 text-[10px]">Level</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-2 text-center">
                      <MapPin className="mx-auto text-blue-400 mb-1" size={16} />
                      <p className="text-white font-bold text-sm">{searchResult.state}</p>
                      <p className="text-slate-400 text-[10px]">State</p>
                    </div>
                  </div>

                  {searchResult.is_friend ? (
                    <div className="text-center text-emerald-400 text-sm py-2">✓ Already friends</div>
                  ) : (
                    <button onClick={() => handleAddFriend(searchResult.id)} data-testid="add-friend-btn"
                      className="w-full bg-blue-500 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                      <UserPlus size={16} /> Add Friend
                    </button>
                  )}
                </div>
              )}

              {/* Hint */}
              <p className="text-slate-500 text-xs text-center mt-4">
                💡 Share your ID with friends so they can add you!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
