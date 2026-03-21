import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { X, HelpCircle, Search, ChevronDown, ChevronUp, Send, Mail, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface FAQ {
  id: number
  category: string
  question: string
  answer: string
}

interface HelpSupportProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpSupport({ isOpen, onClose }: HelpSupportProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [tab, setTab] = useState<'faq' | 'contact'>('faq')
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [contactForm, setContactForm] = useState({ subject: '', message: '', email: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (isOpen) loadFaqs()
  }, [isOpen])

  const loadFaqs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/help/faq`)
      const data = await res.json()
      if (data.success) {
        setFaqs(Array.isArray(data.data) ? data.data : [])
        setCategories(Array.isArray(data.categories) ? data.categories : [])
      }
    } catch (e) {
    }
  }

  const filteredFaqs = faqs.filter(faq => {
    if (selectedCategory && faq.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
    }
    return true
  })

  const handleSubmitContact = async () => {
    if (!contactForm.subject || !contactForm.message) {
      toast.error('Please fill in subject and message')
      return
    }
    
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/help/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setContactForm({ subject: '', message: '', email: '' })
        setTab('faq')
      }
    } catch (e) {
      toast.error('Could not send message')
    }
    setSending(false)
  }

  if (!isOpen) return null

  const modalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const cardBg = isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/80'

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-2`} onClick={onClose}>
      <div className={`w-full max-w-md h-[85vh] ${modalBg} rounded-2xl overflow-hidden flex flex-col shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Help & Support</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/10 rounded-xl p-1">
            <button onClick={() => setTab('faq')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'faq' ? 'bg-white text-blue-600' : 'text-white'}`}>
              FAQ
            </button>
            <button onClick={() => setTab('contact')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'contact' ? 'bg-white text-blue-600' : 'text-white'}`}>
              Contact Us
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-auto ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
          {tab === 'faq' && (
            <div className="p-4">
              <div className={`${cardBg} rounded-xl px-3 py-2 flex items-center gap-2 mb-3 border ${isLight ? 'border-slate-200' : 'border-transparent'}`}>
                <Search className={textMuted} size={16} />
                <input type="text" placeholder="Search FAQ..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`flex-1 bg-transparent text-sm outline-none ${isLight ? 'text-slate-900 placeholder-slate-500' : 'text-white placeholder-slate-400'}`} />
              </div>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                <button onClick={() => setSelectedCategory('')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${!selectedCategory ? 'bg-blue-500 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')}`}>
                  All
                </button>
                {(categories ?? []).map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedCategory === cat ? 'bg-blue-500 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredFaqs.map(faq => (
                  <div key={faq.id} className={`${cardBg} rounded-xl overflow-hidden border ${isLight ? 'border-slate-200' : 'border-transparent'}`}>
                    <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full p-3 flex items-start justify-between text-left">
                      <span className={`text-sm font-medium pr-2 ${textPrimary}`}>{faq.question}</span>
                      {expandedFaq === faq.id ? <ChevronUp className={`${textMuted} flex-shrink-0`} size={16} /> : <ChevronDown className={`${textMuted} flex-shrink-0`} size={16} />}
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-3 pb-3">
                        <p className={`text-sm ${textMuted}`}>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
                {filteredFaqs.length === 0 && (
                  <div className={`text-center py-8 ${textMuted}`}>No results found</div>
                )}
              </div>
            </div>
          )}
          {tab === 'contact' && (
            <div className="p-4 space-y-4">
              <p className={`text-sm ${textMuted}`}>Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.</p>
              <div>
                <label className={`${textMuted} text-xs mb-1 block`}>Subject</label>
                <input type="text" placeholder="What's this about?" value={contactForm.subject}
                  onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 text-white border-slate-700'}`} />
              </div>
              <div>
                <label className={`${textMuted} text-xs mb-1 block`}>Message</label>
                <textarea placeholder="Describe your issue or question..." value={contactForm.message}
                  onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={5}
                  className={`w-full rounded-xl px-3 py-2 text-sm outline-none resize-none border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 text-white border-slate-700'}`} />
              </div>
              <div>
                <label className={`${textMuted} text-xs mb-1 block`}>Email (optional)</label>
                <input type="email" placeholder="For follow-up (optional)" value={contactForm.email}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 text-white border-slate-700'}`} />
              </div>
              <button onClick={handleSubmitContact} disabled={sending}
                className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={16} /> {sending ? 'Sending...' : 'Send Message'}
              </button>
              <div className={`border-t pt-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <p className={`${textMuted} text-xs text-center mb-3`}>Or reach us directly</p>
                <div className="flex gap-2">
                  <button onClick={() => toast('Opening email client...')}
                    className={`flex-1 py-2 rounded-xl text-sm flex items-center justify-center gap-2 ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-white'}`}>
                    <Mail size={14} /> Email
                  </button>
                  <button onClick={() => toast('Opening chat...')}
                    className={`flex-1 py-2 rounded-xl text-sm flex items-center justify-center gap-2 ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-white'}`}>
                    <MessageCircle size={14} /> Live Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
