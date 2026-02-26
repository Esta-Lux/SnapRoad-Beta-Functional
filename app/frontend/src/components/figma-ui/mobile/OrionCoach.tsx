// SnapRoad - Orion AI Coach Component
// Voice-enabled AI driving coach with real-time tips

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  MessageCircle,
  Volume2,
  VolumeX,
  Bot,
  Navigation,
  Fuel,
  AlertTriangle,
  Zap,
  TrendingUp,
  Loader2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface OrionCoachProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute?: {
    distance: number;
    duration: number;
    destination: string;
  };
  userContext?: {
    safety_score?: number;
    gems?: number;
    current_speed?: number;
    weather?: string;
  };
}

interface CoachTip {
  id: string;
  type: 'fuel' | 'traffic' | 'safety' | 'reward' | 'eco';
  message: string;
  impact?: string;
  priority: 'low' | 'medium' | 'high';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'orion';
  text: string;
  timestamp: Date;
}

const COACH_TIPS: CoachTip[] = [
  { 
    id: '1', 
    type: 'fuel', 
    message: 'Coast down the upcoming hill to save 12% fuel',
    impact: 'Save $2.40 on this trip',
    priority: 'medium'
  },
  { 
    id: '2', 
    type: 'traffic', 
    message: 'Light traffic ahead on I-71. Stay in current lane.',
    impact: '8 min faster than Alt Route',
    priority: 'high'
  },
  { 
    id: '3', 
    type: 'safety', 
    message: 'School zone in 0.5 miles. Speed limit drops to 25 mph.',
    impact: 'Active hours: 7-9 AM, 2-4 PM',
    priority: 'high'
  },
  { 
    id: '4', 
    type: 'reward', 
    message: 'Coffee House partner 0.3 mi ahead - 15% off with 50 gems!',
    impact: 'Earn 10 bonus gems for stopping',
    priority: 'low'
  },
  { 
    id: '5', 
    type: 'eco', 
    message: 'Maintain 55-65 mph for optimal fuel efficiency',
    impact: 'Current efficiency: 34 MPG',
    priority: 'medium'
  },
];

const QUICK_ACTIONS = [
  { id: 'traffic', label: 'Traffic ahead?', icon: AlertTriangle },
  { id: 'fuel', label: 'Fuel tips', icon: Fuel },
  { id: 'route', label: 'Better route?', icon: Navigation },
  { id: 'rewards', label: 'Nearby rewards', icon: Sparkles },
];

export function OrionCoach({ isOpen, onClose, currentRoute, userContext }: OrionCoachProps) {
  const [mode, setMode] = useState<'tips' | 'chat'>('tips');
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [quickTips, setQuickTips] = useState<{id: string; text: string; icon: string}[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch quick tips on mount
  useEffect(() => {
    if (isOpen) {
      fetchQuickTips();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation, isTyping]);

  const fetchQuickTips = async () => {
    try {
      const response = await fetch(`${API_URL}/orion/tips`);
      const data = await response.json();
      if (data.success) {
        setQuickTips(data.tips);
      }
    } catch (error) {
      console.error('Failed to fetch tips:', error);
    }
  };

  const getTipIcon = (type: string) => {
    switch (type) {
      case 'fuel': return <Fuel size={18} className="text-[#00DFA2]" />;
      case 'traffic': return <AlertTriangle size={18} className="text-[#FFC24C]" />;
      case 'safety': return <AlertTriangle size={18} className="text-[#FF5A5A]" />;
      case 'reward': return <Sparkles size={18} className="text-[#9D4EDD]" />;
      case 'eco': return <Zap size={18} className="text-[#0084FF]" />;
      default: return <Bot size={18} className="text-[#0084FF]" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-[#FF5A5A]';
      case 'medium': return 'border-l-[#FFC24C]';
      default: return 'border-l-[#0084FF]';
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: message,
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, userMessage]);
    const userText = message;
    setMessage('');
    setIsTyping(true);

    try {
      // Call real AI backend
      const response = await fetch(`${API_URL}/orion/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          session_id: sessionId,
          context: userContext || { safety_score: 85, gems: 500 }
        })
      });

      const data = await response.json();
      
      const orionResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'orion',
        text: data.success ? data.response : 'Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, orionResponse]);
    } catch (error) {
      // Fallback to local response if API fails
      const orionResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'orion',
        text: getLocalResponse(userText),
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, orionResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const getLocalResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('traffic') || q.includes('route')) {
      return "Based on current traffic data, your route looks clear. There's light congestion on I-71 near Exit 42, but it should add only 3-4 minutes. Would you like me to find an alternative route?";
    }
    if (q.includes('fuel') || q.includes('gas')) {
      return "Your current fuel efficiency is 34 MPG - that's 8% above your weekly average! To maintain this, keep your speed between 55-65 mph and avoid rapid acceleration. There's a Gas Plus partner station 0.8 miles ahead with $0.10/gal discount.";
    }
    if (q.includes('reward') || q.includes('offer') || q.includes('gem')) {
      return "Great news! There are 3 partner offers near your route: Coffee House (15% off, 50 gems), Auto Spa (Free wash, 100 gems), and Gas Plus ($0.10/gal, 75 gems). Would you like me to add any of these as a stop?";
    }
    if (q.includes('safety') || q.includes('score')) {
      return "Your safety score for this trip is 94 so far - excellent! You've maintained smooth braking and consistent speed. Keep it up to earn the 'Perfect Trip' bonus of 25 gems!";
    }
    return "I can help with traffic updates, fuel-saving tips, finding rewards near your route, and safety recommendations. What would you like to know?";
  };

  const handleQuickAction = (actionId: string) => {
    const queries: Record<string, string> = {
      traffic: "What's the traffic like ahead?",
      fuel: "How can I save fuel on this trip?",
      route: "Is there a better route available?",
      rewards: "What rewards are near my route?",
    };
    setMessage(queries[actionId] || '');
    setMode('chat');
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // Voice recognition would be integrated here
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full bg-[#0A0E16] rounded-t-3xl border-t-2 border-[#0084FF] max-h-[85vh] flex flex-col"
        >
          {/* Handle */}
          <div className="flex justify-center py-2">
            <div className="w-12 h-1 bg-[#1B2432] rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 pb-4 border-b border-[#1B2432]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Orion Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0084FF] to-[#00DFA2] flex items-center justify-center">
                    <Bot size={24} className="text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00DFA2] rounded-full border-2 border-[#0A0E16] animate-pulse" />
                </div>
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                    Orion AI
                    <span className="px-2 py-0.5 rounded-full bg-[#00DFA2]/20 text-[#00DFA2] text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </h3>
                  <p className="text-[#8A9BB6] text-[13px]">Your driving assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 rounded-xl bg-[#1B2432] flex items-center justify-center text-[#8A9BB6] hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-[#1B2432] flex items-center justify-center text-[#8A9BB6] hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('tips')}
                className={`flex-1 h-10 rounded-xl transition-all flex items-center justify-center gap-2 font-medium ${
                  mode === 'tips'
                    ? 'bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white'
                    : 'bg-[#1B2432] text-[#8A9BB6] hover:text-white'
                }`}
              >
                <TrendingUp size={16} />
                Live Tips
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`flex-1 h-10 rounded-xl transition-all flex items-center justify-center gap-2 font-medium ${
                  mode === 'chat'
                    ? 'bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white'
                    : 'bg-[#1B2432] text-[#8A9BB6] hover:text-white'
                }`}
              >
                <MessageCircle size={16} />
                Ask Orion
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {mode === 'tips' ? (
              <div className="p-4 space-y-3">
                {/* Route Info */}
                {currentRoute && (
                  <div className="bg-[#1B2432] rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation size={16} className="text-[#0084FF]" />
                        <span className="text-white font-medium">{currentRoute.destination}</span>
                      </div>
                      <div className="text-[#8A9BB6] text-sm">
                        {currentRoute.distance} mi • {currentRoute.duration} min
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#00DFA2]" />
                  <span className="text-[#8A9BB6] text-[13px] font-medium">Active tips for your drive</span>
                </div>
                
                {COACH_TIPS.map((tip) => (
                  <motion.div
                    key={tip.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`bg-[#1B2432] rounded-xl p-4 border-l-4 ${getPriorityColor(tip.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0A0E16] flex items-center justify-center flex-shrink-0">
                        {getTipIcon(tip.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{tip.message}</p>
                        {tip.impact && (
                          <p className="text-[#00DFA2] text-[13px] mt-1">{tip.impact}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {COACH_TIPS.length === 0 && (
                  <div className="text-center py-12">
                    <Bot size={48} className="text-[#1B2432] mx-auto mb-4" />
                    <p className="text-[#8A9BB6] font-medium">No active tips right now</p>
                    <p className="text-[#4B5C74] text-[13px] mt-1">
                      Tips will appear as you navigate
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Quick Actions */}
                {conversation.length === 0 && (
                  <div className="p-4 border-b border-[#1B2432]">
                    <p className="text-[#8A9BB6] text-[13px] mb-3">Quick questions:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action.id)}
                          className="flex items-center gap-2 p-3 rounded-xl bg-[#1B2432] text-white text-[13px] hover:bg-[#2A3544] transition-colors"
                        >
                          <action.icon size={16} className="text-[#0084FF]" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {conversation.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot size={48} className="text-[#1B2432] mx-auto mb-4" />
                      <p className="text-[#8A9BB6] font-medium mb-2">Ask me anything</p>
                      <p className="text-[#4B5C74] text-[13px]">
                        I can help with routes, traffic, fuel, and rewards
                      </p>
                    </div>
                  ) : (
                    conversation.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white'
                              : 'bg-[#1B2432] text-white border border-[#2A3544]'
                          }`}
                        >
                          {msg.role === 'orion' && (
                            <div className="flex items-center gap-2 mb-2">
                              <Bot size={14} className="text-[#00DFA2]" />
                              <span className="text-[#00DFA2] text-[11px] font-bold">ORION</span>
                            </div>
                          )}
                          <p className="text-[14px] leading-relaxed">{msg.text}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-[#8A9BB6]"
                    >
                      <Bot size={16} className="text-[#00DFA2]" />
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#0084FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#0084FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#0084FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-[#1B2432]">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={toggleListening}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isListening 
                          ? 'bg-[#FF5A5A] text-white animate-pulse' 
                          : 'bg-[#1B2432] text-[#8A9BB6] hover:text-white'
                      }`}
                    >
                      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Ask Orion..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        className="w-full h-12 px-4 pr-14 bg-[#1B2432] border border-[#2A3544] rounded-xl text-white placeholder:text-[#4B5C74] focus:outline-none focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/20"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!message.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-r from-[#0084FF] to-[#00DFA2] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default OrionCoach;
