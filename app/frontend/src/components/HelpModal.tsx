import { useState } from 'react'
import { 
  X, HelpCircle, ChevronLeft, ChevronRight, MapPin, Gem, Shield, 
  Trophy, Gift, Car, Zap, Target, Star, MessageCircle, ArrowRight,
  Sparkles
} from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  appType?: 'driver' | 'partner' | 'admin'
}

interface HelpTopic {
  id: string
  icon: any
  title: string
  description: string
  steps?: string[]
}

const driverTopics: HelpTopic[] = [
  {
    id: 'navigation',
    icon: MapPin,
    title: 'Navigation',
    description: 'How to use SnapRoad for navigation',
    steps: [
      'Tap on the search bar or destination field',
      'Enter your destination address',
      'Choose your preferred route',
      'Tap "Start" to begin navigation',
      'Follow the turn-by-turn directions'
    ]
  },
  {
    id: 'offers',
    icon: Gift,
    title: 'Redeeming Offers',
    description: 'How to find and redeem offers',
    steps: [
      'Look for glowing gem markers on the map',
      'Tap on a gem to see the offer details',
      'Drive to the location (within 1 mile)',
      'Tap "Get QR Code" when you arrive',
      'Show the QR code to the cashier',
      'Tap "Mark as Redeemed" after use'
    ]
  },
  {
    id: 'gems',
    icon: Gem,
    title: 'Earning Gems',
    description: 'Ways to earn gems in SnapRoad',
    steps: [
      'Complete trips safely to earn base gems',
      'Redeem offers from partner businesses',
      'Win challenges against friends',
      'Report road hazards accurately',
      'Maintain a high safety score for bonuses',
      'Premium users earn 2x gems on everything!'
    ]
  },
  {
    id: 'safety',
    icon: Shield,
    title: 'Safety Score',
    description: 'Understanding your safety score',
    steps: [
      'Safety score ranges from 0-100',
      'Smooth driving increases your score',
      'Hard brakes and speeding lower it',
      'Check your detailed breakdown in Profile',
      'Higher scores unlock better rewards'
    ]
  },
  {
    id: 'challenges',
    icon: Trophy,
    title: 'Challenges',
    description: 'How to challenge friends',
    steps: [
      'Go to Rewards tab and find Leaderboard',
      'Tap on a friend\'s name',
      'Select "Challenge" button',
      'Choose gems to wager',
      'Complete your trip with best safety',
      'Winner takes all wagered gems!'
    ]
  },
  {
    id: 'premium',
    icon: Star,
    title: 'Premium Benefits',
    description: 'What you get with Premium',
    steps: [
      '2x gems on all earnings',
      '18% discounts (vs 6% basic)',
      'Detailed driving score insights',
      'Weekly performance recap',
      'Orion offer announcements',
      'Priority customer support'
    ]
  }
]

const partnerTopics: HelpTopic[] = [
  {
    id: 'offers',
    icon: Gift,
    title: 'Creating Offers',
    description: 'How to create attractive offers',
    steps: [
      'Go to "My Offers" tab',
      'Click "Create Offer" button',
      'Fill in offer details and discount',
      'Optionally generate an AI image',
      'Set expiration date',
      'Click "Create" to publish'
    ]
  },
  {
    id: 'boosts',
    icon: Zap,
    title: 'Boosting Offers',
    description: 'How to increase offer visibility',
    steps: [
      'Go to "Boosts" tab',
      'Select an offer to boost',
      'Choose duration (days)',
      'Choose target reach (people)',
      'Review the calculated cost',
      'Click "Activate Boost"'
    ]
  },
  {
    id: 'analytics',
    icon: Target,
    title: 'Understanding Analytics',
    description: 'Making sense of your data',
    steps: [
      'Views: How many drivers saw your offer',
      'Clicks: How many tapped to learn more',
      'Redemptions: Actual uses of your offer',
      'CTR: Click-through rate percentage',
      'Revenue: Estimated revenue generated'
    ]
  }
]

export default function HelpModal({ isOpen, onClose, appType = 'driver' }: HelpModalProps) {
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null)
  
  const topics = appType === 'driver' ? driverTopics : partnerTopics

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[85vh] bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-slate-800/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            {selectedTopic ? (
              <button 
                onClick={() => setSelectedTopic(null)}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <HelpCircle className="text-emerald-400" size={20} />
            )}
            <h2 className="text-white font-semibold">
              {selectedTopic ? selectedTopic.title : 'Help Center'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {!selectedTopic ? (
            // Topic List
            <div className="space-y-3">
              <p className="text-slate-400 text-sm mb-4">
                Select a topic to learn more about using SnapRoad
              </p>
              
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="w-full flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <topic.icon className="text-emerald-400" size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{topic.title}</p>
                    <p className="text-slate-400 text-sm">{topic.description}</p>
                  </div>
                  <ChevronRight className="text-slate-500" size={20} />
                </button>
              ))}

              {/* Contact Support */}
              <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="text-blue-400" size={20} />
                  <p className="text-white font-medium">Need more help?</p>
                </div>
                <p className="text-slate-400 text-sm mb-3">
                  Our support team is here to assist you
                </p>
                <button className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2">
                  Contact Support
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            // Topic Detail
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <selectedTopic.icon className="text-emerald-400" size={32} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{selectedTopic.title}</h3>
                  <p className="text-slate-400 text-sm">{selectedTopic.description}</p>
                </div>
              </div>

              {selectedTopic.steps && (
                <div className="space-y-3">
                  {selectedTopic.steps.map((step, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl"
                    >
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <p className="text-slate-300 text-sm pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="text-amber-400" size={16} />
                  <p className="text-amber-400 font-medium text-sm">Pro Tip</p>
                </div>
                <p className="text-slate-300 text-sm">
                  {selectedTopic.id === 'navigation' && 'Set frequent destinations as favorites for quick access!'}
                  {selectedTopic.id === 'offers' && 'Premium users get 3x better discounts on all offers!'}
                  {selectedTopic.id === 'gems' && 'Complete daily challenges for bonus gems!'}
                  {selectedTopic.id === 'safety' && 'Check your weekly recap to track your improvement!'}
                  {selectedTopic.id === 'challenges' && 'Start with small wagers until you master safe driving!'}
                  {selectedTopic.id === 'premium' && 'Premium pays for itself with just a few offer redemptions!'}
                  {selectedTopic.id === 'boosts' && 'Weekend boosts typically get 2x more engagement!'}
                  {selectedTopic.id === 'analytics' && 'Track your best-performing offers and create similar ones!'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
