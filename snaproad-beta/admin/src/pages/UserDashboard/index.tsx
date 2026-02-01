import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Map,
  Diamond,
  Trophy,
  Car,
  TrendingUp,
  Gift,
  Navigation,
  Flame,
  ChevronRight,
  MapPin
} from 'lucide-react'

// Mock user data
const userData = {
  name: 'John Smith',
  email: 'john@example.com',
  avatar: null,
  subscription: 'premium',
  stats: {
    gemsBalance: 1300,
    totalTrips: 45,
    totalDistance: 1250.5,
    averageScore: 92,
    currentStreak: 15,
    weeklyGems: 85,
    rank: 42
  },
  recentTrips: [
    { id: '1', date: 'Today, 2:30 PM', from: 'Home', to: 'Downtown', distance: 12.5, score: 95, gems: 15 },
    { id: '2', date: 'Yesterday', from: 'Downtown', to: 'Gym', distance: 5.2, score: 100, gems: 10 },
    { id: '3', date: 'Jan 28', from: 'Home', to: 'Office', distance: 18.3, score: 88, gems: 12 },
  ],
  nearbyOffers: [
    { id: '1', business: 'Downtown Coffee', title: '20% Off Any Coffee', gems: 50, distance: '0.5 mi' },
    { id: '2', business: 'Auto Plus', title: 'Free Oil Check', gems: 100, distance: '1.2 mi' },
    { id: '3', business: 'City Gas', title: '$0.10 Off Per Gallon', gems: 75, distance: '0.8 mi' },
  ],
  vehicles: [
    { id: '1', name: '2022 Toyota Camry', isPrimary: true },
    { id: '2', name: '2023 Tesla Model 3', isPrimary: false },
  ]
}

export default function UserDashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://customer-assets.emergentagent.com/job_navigate-app-1/artifacts/nn7pu72r_BiggerLogoSR.png"
              alt="SnapRoad"
              className="h-8"
            />
            <span className="text-white font-semibold">Driver Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white text-sm"
            >
              Switch to Admin
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white text-sm font-medium">J</span>
              </div>
              <span className="text-white text-sm">{userData.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome & Quick Stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back, {userData.name.split(' ')[0]}!</h1>
          <p className="text-slate-400">Keep driving safe to earn more Gems!</p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Diamond className="text-white" size={24} />
              <span className="text-purple-200 text-sm">Gems Balance</span>
            </div>
            <p className="text-3xl font-bold text-white">{userData.stats.gemsBalance.toLocaleString()}</p>
            <p className="text-purple-200 text-sm mt-1">+{userData.stats.weeklyGems} this week</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-green-400" size={24} />
              <span className="text-slate-400 text-sm">Driving Score</span>
            </div>
            <p className="text-3xl font-bold text-white">{userData.stats.averageScore}</p>
            <p className="text-green-400 text-sm mt-1">Excellent!</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Flame className="text-orange-400" size={24} />
              <span className="text-slate-400 text-sm">Current Streak</span>
            </div>
            <p className="text-3xl font-bold text-white">{userData.stats.currentStreak} days</p>
            <p className="text-orange-400 text-sm mt-1">Keep it up!</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="text-yellow-400" size={24} />
              <span className="text-slate-400 text-sm">Leaderboard Rank</span>
            </div>
            <p className="text-3xl font-bold text-white">#{userData.stats.rank}</p>
            <p className="text-slate-400 text-sm mt-1">Top 10%</p>
          </div>
        </div>

        {/* Start Navigation CTA */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Ready to drive?</h2>
            <p className="text-primary-100">Start navigating to earn Gems and improve your score</p>
          </div>
          <button className="bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-primary-50 transition-colors">
            <Navigation size={20} />
            Start Navigation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Trips */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Map className="text-primary-400" size={20} />
                Recent Trips
              </h2>
              <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="divide-y divide-slate-700">
              {userData.recentTrips.map((trip) => (
                <div key={trip.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{trip.from} → {trip.to}</p>
                      <p className="text-slate-400 text-sm">{trip.date} • {trip.distance} km</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${trip.score >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                        Score: {trip.score}
                      </p>
                      <p className="text-purple-400 text-sm">+{trip.gems} Gems</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Offers */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gift className="text-yellow-400" size={20} />
                Nearby Offers
              </h2>
              <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="divide-y divide-slate-700">
              {userData.nearbyOffers.map((offer) => (
                <div key={offer.id} className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">{offer.title}</p>
                    <span className="text-purple-400 text-sm font-medium">{offer.gems} Gems</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm">{offer.business}</p>
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <MapPin size={12} /> {offer.distance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My Vehicles */}
        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Car className="text-blue-400" size={20} />
              My Vehicles
            </h2>
            <button className="text-primary-400 hover:text-primary-300 text-sm">+ Add Vehicle</button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {userData.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="text-slate-400" size={20} />
                  <span className="text-white">{vehicle.name}</span>
                </div>
                {vehicle.isPrimary && (
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trip Stats Summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-white">{userData.stats.totalTrips}</p>
            <p className="text-slate-400 text-sm">Total Trips</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-white">{userData.stats.totalDistance.toFixed(0)} km</p>
            <p className="text-slate-400 text-sm">Total Distance</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">$127</p>
            <p className="text-slate-400 text-sm">Fuel Saved</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">8</p>
            <p className="text-slate-400 text-sm">Offers Redeemed</p>
          </div>
        </div>
      </main>
    </div>
  )
}
