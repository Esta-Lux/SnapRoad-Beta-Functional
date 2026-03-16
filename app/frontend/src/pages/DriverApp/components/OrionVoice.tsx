import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, VolumeX, X, Mic, Square } from 'lucide-react'
import {
  chatWithOrion,
  chatWithOrionWithTools,
  streamOrion,
  orionSpeak,
  startListening,
  type OrionMessage,
  type OrionContext,
} from '@/lib/orion'

interface Props {
  isOpen: boolean
  onClose: () => void
  context: OrionContext
  isMuted: boolean
  onMuteToggle: () => void
  /** When Orion decides to start navigation (e.g. user said "start the route"), call with place name to resolve and start. */
  onStartNavigation?: (destinationName: string) => void
  /** When user asks to go to a nearby offer (e.g. "take me to that Starbucks offer"), call with offer/business name. */
  onNavigateToOffer?: (offerName: string) => void
  /** When user reports an incident by voice during nav (e.g. "cop on my left 100 feet"), call with type and optional side/distance. */
  onVoiceReport?: (report: { type: string; side?: string; distance_feet?: number }) => void
}

export default function OrionVoice({
  isOpen,
  onClose,
  context: contextProp,
  isMuted,
  onMuteToggle,
  onStartNavigation,
  onNavigateToOffer,
  onVoiceReport,
}: Props) {
  const context = contextProp ?? {}
  const [messages, setMessages] = useState<OrionMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [orionTyping, setOrionTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stopListeningRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (!isOpen || messages.length > 0) return
    const greet = async () => {
      setOrionTyping(true)
      try {
        const greeting = await chatWithOrion(
          [{ role: 'user', content: 'greet me briefly' }],
          context
        )
        setMessages([{ role: 'assistant', content: greeting }])
        orionSpeak(greeting, 'normal', isMuted)
      } catch {
        setMessages([{ role: 'assistant', content: "Hey! I'm Orion. Ask me about your route, nearby offers, or anything SnapRoad." }])
      }
      setOrionTyping(false)
    }
    greet()
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: OrionMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setStreamingText('')
    setOrionTyping(true)

    const hasToolCallbacks = onStartNavigation || onNavigateToOffer || onVoiceReport
    try {
      if (context.isNavigating && !hasToolCallbacks) {
        const reply = await chatWithOrion(newMessages, context)
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        orionSpeak(reply, 'normal', isMuted)
      } else if (hasToolCallbacks) {
        const result = await chatWithOrionWithTools(newMessages, context)
        let didStartNav = false
        for (const t of result.toolCalls ?? []) {
          if (t.name === 'start_navigation' && onStartNavigation) {
            const dest = t.arguments?.destination
            if (typeof dest === 'string' && dest.trim()) {
              onStartNavigation(dest.trim())
              orionSpeak(`Taking you now.`, 'high', isMuted)
              didStartNav = true
            }
          } else if (t.name === 'navigate_to_nearby_offer' && onNavigateToOffer) {
            const name = t.arguments?.offer_name
            if (typeof name === 'string' && name.trim()) {
              onNavigateToOffer(name.trim())
              orionSpeak(`Taking you now.`, 'high', isMuted)
              didStartNav = true
            }
          } else if (t.name === 'add_voice_road_report' && onVoiceReport) {
            const type = t.arguments?.type
            if (typeof type === 'string') {
              onVoiceReport({
                type,
                side: typeof t.arguments?.side === 'string' ? t.arguments.side : undefined,
                distance_feet: typeof t.arguments?.distance_feet === 'number' ? t.arguments.distance_feet : undefined,
              })
              orionSpeak(`Reported ${type}. Thanks for keeping the road safe.`, 'normal', isMuted)
            }
          }
        }
        const displayContent = didStartNav ? 'Taking you now!' : (result.content || (result.toolCalls?.length ? 'Done.' : 'Done.'))
        setMessages((prev) => [...prev, { role: 'assistant', content: displayContent }])
        if (displayContent && !result.toolCalls?.length) orionSpeak(displayContent, 'normal', isMuted)
      } else {
        let fullReply = ''
        for await (const chunk of streamOrion(newMessages, context)) {
          fullReply += chunk
          setStreamingText(fullReply)
        }
        setStreamingText('')
        setMessages((prev) => [...prev, { role: 'assistant', content: fullReply }])
        orionSpeak(fullReply, 'normal', isMuted)
      }
    } catch {
      const err = 'Sorry, I had a hiccup. Try again!'
      setMessages((prev) => [...prev, { role: 'assistant', content: err }])
    }

    setIsLoading(false)
    setOrionTyping(false)
  }, [messages, context, isMuted, isLoading, onStartNavigation, onNavigateToOffer, onVoiceReport])

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListeningRef.current?.()
      setIsListening(false)
      return
    }

    setIsListening(true)
    const stop = startListening(
      (text) => {
        setIsListening(false)
        sendMessage(text)
      },
      () => setIsListening(false)
    )
    stopListeningRef.current = stop ?? null
  }, [isListening, sendMessage])

  if (!isOpen) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2001,
          background: '#0D0D0F',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            margin: '12px auto 0',
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              marginRight: 12,
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(124,58,237,0.5)',
            }}
          >
            &#10022;
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
              Orion
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {context.isNavigating ? 'Navigating mode' : 'AI Assistant'}
            </div>
          </div>

          <button
            onClick={onMuteToggle}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isMuted ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: isMuted ? '#FF3B30' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              marginRight: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
          }}
        >
          {messages.length === 0 && !orionTyping && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>&#10022;</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                Ask Orion anything about your route, nearby offers, or SnapRoad
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'center',
                  marginTop: 16,
                }}
              >
                {[
                  'How long until I arrive?',
                  'Any offers nearby?',
                  'How are my gems?',
                  'Whats the traffic like?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    style={{
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 20,
                      padding: '6px 14px',
                      color: '#A78BFA',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              {msg.role === 'assistant' && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  &#10022;
                </div>
              )}
              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius:
                    msg.role === 'user'
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
                      : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {streamingText && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                &#10022;
              </div>
              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {streamingText}
                <span
                  className="orion-cursor"
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 14,
                    background: '#7C3AED',
                    marginLeft: 2,
                    borderRadius: 2,
                    verticalAlign: 'middle',
                  }}
                />
              </div>
            </div>
          )}

          {orionTyping && !streamingText && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                &#10022;
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="orion-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: '#7C3AED',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              paddingRight: 8,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage(input)
              }}
              placeholder={
                context.isNavigating ? 'Ask Orion...' : 'Message Orion...'
              }
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: 14,
                height: 40,
              }}
            />
            {input.length > 0 && (
              <button
                onClick={() => sendMessage(input)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: '#7C3AED',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: 'white',
                }}
              >
                ↑
              </button>
            )}
          </div>

          <button
            onClick={handleVoiceInput}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: isListening
                ? 'linear-gradient(135deg, #FF3B30, #CC0000)'
                : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening
                ? '0 0 20px rgba(255,59,48,0.5)'
                : '0 0 16px rgba(124,58,237,0.4)',
              animation: isListening ? 'orion-pulse 1s infinite' : 'none',
            }}
          >
            {isListening ? (
              <Square size={18} style={{ color: 'white' }} />
            ) : (
              <Mic size={18} style={{ color: 'white' }} />
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes orion-dot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        .orion-dot {
          animation: orion-dot 1.2s infinite;
        }
        @keyframes orion-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .orion-cursor {
          animation: orion-cursor 0.8s infinite;
        }
        @keyframes orion-pulse {
          0%, 100% { box-shadow: 0 0 16px rgba(255,59,48,0.4); }
          50% { box-shadow: 0 0 32px rgba(255,59,48,0.8); }
        }
      `}</style>
    </>
  )
}
