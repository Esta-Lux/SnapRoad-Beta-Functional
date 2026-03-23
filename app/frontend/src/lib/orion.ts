// Orion: use frontend key from .env if set, otherwise call backend (OPENAI_API_KEY in backend .env)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const API_BASE =
  (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export interface OrionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OrionContext {
  userName?: string
  currentLocation?: { lat: number; lng: number }
  currentAddress?: string
  isNavigating?: boolean
  currentRoute?: {
    destination: string
    distanceMiles: number
    remainingMinutes: number
    currentStep?: string
    nextStep?: string
  }
  speedMph?: number
  nearbyOffers?: { title: string; distance: string }[]
  /** Saved places from the driver's address book (Home, Work, favorites). Use these when the user says "take me home", "navigate to work", or a saved place name. */
  savedPlaces?: { name: string; address: string; category?: string }[]
  gems?: number
  level?: number
  timeOfDay?: string
}

function buildSystemPrompt(ctx: OrionContext | undefined): string {
  const c = ctx ?? {}
  const time = new Date().getHours()
  const greeting = time < 12 ? 'morning' : time < 17 ? 'afternoon' : 'evening'

  return `You are Orion, the AI navigator and personal assistant for SnapRoad — a privacy-first navigation app that rewards drivers for safe driving.

## Your personality:
- Warm, confident, and helpful — like a knowledgeable friend in the passenger seat
- Conversational and natural — never robotic or stiff
- Proactively helpful — you notice things and mention them without being asked
- Brief during navigation (drivers are focused), detailed when parked or browsing
- You care about the driver's safety, savings, and time

## What you know about SnapRoad:
- SnapRoad rewards safe driving with Gems (in-app currency)
- Gems are earned every mile driven safely, for hazard reports, safe braking
- Gems can be redeemed at local partner businesses for discounts
- SnapRoad has zero ads and never sells user data
- Premium plan includes 2x gem multiplier and detailed driving analytics
- Features: turn-by-turn navigation, nearby offers, road reports, family tracking, fuel tracker, driving score, weekly recap, leaderboard, badges
- SnapRoad is launching in Ohio Q3 2026, founded by Ryan A.
- Privacy-first: all location data is encrypted and never sold

## Current driver context:
- Driver name: ${c.userName ?? 'there'}
- Good ${greeting}!
- Current location: ${c.currentAddress ?? 'unknown'}
- Navigating: ${c.isNavigating ? 'YES' : 'No'}
${c.currentRoute ? `
- Destination: ${c.currentRoute.destination}
- Distance remaining: ${c.currentRoute.distanceMiles?.toFixed(1)} miles
- Time remaining: ${c.currentRoute.remainingMinutes} minutes
- Current instruction: ${c.currentRoute.currentStep}
- Next instruction: ${c.currentRoute.nextStep}
` : ''}
- Current speed: ${c.speedMph ?? 0} mph
- Gems balance: ${c.gems ?? 0} gems
- Driver level: ${c.level ?? 1}
${c.nearbyOffers?.length ? `
- Nearby offers: ${c.nearbyOffers.map(o => `${o.title} (${o.distance})`).join(', ')}
` : ''}
${(c.savedPlaces?.length) ? `
- Saved places (address book): ${c.savedPlaces.map(p => `${p.name} (${p.address || p.category || 'saved'})`).join('; ')}. When the user says "take me home", "navigate to work", or a saved place name, use start_navigation with that exact name (e.g. "Home", "Work", or the place name).
` : ''}

## Navigation voice rules (IMPORTANT):
- For turn instructions, be BRIEF: "In 300 feet, turn right onto Main Street"
- For route start: "Starting navigation to [destination]. [brief tip about route]"
- For arriving: "You've arrived at [destination]. Great driving!"
- For rerouting: "No worries, recalculating your route"
- For offers nearby: "Hey, there's a deal nearby — [offer name]. Want to stop?"
- For speeding: "Just a heads up, speed limit is [X] here"
- For hazards: "SnapRoad drivers reported something ahead, stay alert"

## Conversation rules:
- During navigation: keep ALL responses under 15 words unless driver asks a question
- When parked/stationary: can be more detailed and conversational
- Always prioritize safety — never encourage distracted driving
- If driver asks about route, traffic, or directions, answer specifically
- If driver asks general questions, answer helpfully but briefly
- Remember previous messages in the conversation
- When the driver CONFIRMS a place you just suggested (e.g. "yes", "sure", "take me there", "let's go", "ok", "yeah") you MUST call start_navigation with the EXACT place name you just offered (e.g. if you said "Riverside Cafe", call start_navigation with destination "Riverside Cafe"). Do not reply with text only — always use the tool so the app can start navigation.
- When the driver asks to "start the route", "take me there", "give me directions" to a place (or any place name), use start_navigation with that place name.
- When the driver says "take me home", "navigate to work", or a saved place name from the address book, use start_navigation with that exact name ("Home", "Work", or the saved place name).
- When the driver asks to go to a nearby offer or deal you mentioned (e.g. "take me to that offer", "navigate to Starbucks"), use navigate_to_nearby_offer with the business/offer name.
- For generic requests like "take me to a cafe", "fastest cafe near me", or "a park nearby", use start_navigation with a short searchable query (e.g. "cafe", "coffee shop", "park") so the app can find and route to a result.
- When the driver reports something on the road by voice during navigation (e.g. "cop on my left about 100 feet", "accident ahead", "hazard on the right"), use add_voice_road_report with the type and optional side/distance so the app can place the icon.
- You can read the current route: use the Current driver context (current instruction, next instruction, distance remaining, time remaining) to answer "what's my next turn?", "how long left?", "read the next instruction". Reply with that info; the app can speak your reply.

Respond naturally as Orion. Be the best co-pilot the driver has ever had.`
}

/** Tool: start navigation to a place (search by name/address). */
export const START_NAVIGATION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'start_navigation',
    description: 'Start turn-by-turn navigation to a place. Call when the user asks to go somewhere, get directions, or start the route (e.g. "start the route", "take me there", "give me directions to X").',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Place name or address to navigate to' },
      },
      required: ['destination'],
    },
  },
}

/** Tool: navigate to a nearby offer by business name (from the offers in context). */
export const NAVIGATE_TO_OFFER_TOOL = {
  type: 'function' as const,
  function: {
    name: 'navigate_to_nearby_offer',
    description: 'Start navigation to a nearby offer/deal. Call when the user says "take me to that offer", "navigate to [business name]", "go to the Starbucks deal", etc. Use the exact business or offer name from the nearby offers list in context.',
    parameters: {
      type: 'object',
      properties: {
        offer_name: { type: 'string', description: 'Business or offer name from the nearby offers (e.g. "Starbucks", "Riverside Cafe")' },
      },
      required: ['offer_name'],
    },
  },
}

/** Tool: add a road report from voice (e.g. "cop on my left 100 feet"). */
export const ADD_VOICE_ROAD_REPORT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'add_voice_road_report',
    description: 'Place a road incident report from the driver\'s voice. Call when the driver reports something on the road during navigation (e.g. "there\'s a cop on my left about 100 feet", "accident ahead", "hazard on the right", "construction back there").',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['police', 'hazard', 'accident', 'construction', 'weather'], description: 'Type of incident' },
        side: { type: 'string', enum: ['left', 'right', 'ahead', 'behind'], description: 'Where relative to the driver' },
        distance_feet: { type: 'number', description: 'Approximate distance in feet (e.g. 100)' },
      },
      required: ['type'],
    },
  },
}

const ORION_TOOLS = [START_NAVIGATION_TOOL, NAVIGATE_TO_OFFER_TOOL, ADD_VOICE_ROAD_REPORT_TOOL]

export interface OrionToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface OrionChatResult {
  content: string
  toolCalls?: OrionToolCall[]
}

export async function chatWithOrionWithTools(
  messages: OrionMessage[],
  context: OrionContext | undefined
): Promise<OrionChatResult> {
  const safeContext = context ?? {}
  if (OPENAI_API_KEY) {
    const systemMessage: OrionMessage = { role: 'system', content: buildSystemPrompt(safeContext) }
    const allMessages = [systemMessage, ...messages]
    const maxTokens = safeContext.isNavigating ? 60 : 300
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: allMessages,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false,
          tools: ORION_TOOLS,
          tool_choice: 'auto',
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        if (res.status === 401 || /invalid|incorrect.*api.*key/i.test(err))
          return { content: "Orion couldn't connect. Check VITE_OPENAI_API_KEY in the frontend .env is valid at platform.openai.com." }
        return { content: 'Sorry, I had a hiccup. Try again!' }
      }
      const data = await res.json()
      const msg = data.choices?.[0]?.message
      const content = (msg?.content ?? '').trim() || 'Sorry, I had trouble with that.'
      const toolCallsRaw = msg?.tool_calls
      const toolCalls: OrionToolCall[] = []
      const allowed = ['start_navigation', 'navigate_to_nearby_offer', 'add_voice_road_report']
      if (Array.isArray(toolCallsRaw)) {
        for (const tc of toolCallsRaw) {
          const fn = tc?.function
          if (fn?.name && allowed.includes(fn.name) && fn.arguments) {
            try {
              const args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments
              toolCalls.push({ name: fn.name, arguments: args })
            } catch {
              /* skip */
            }
          }
        }
      }
      return { content, toolCalls: toolCalls.length ? toolCalls : undefined }
    } catch {
      return { content: 'Sorry, I had a hiccup. Try again!' }
    }
  }
  if (API_BASE) {
    try {
      const payload = {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        context: safeContext,
      }
      const response = await fetch(`${API_BASE}/api/orion/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Backend error: ${response.status}`)
      const data = await response.json()
      return { content: data?.content ?? 'Sorry, I had trouble with that.' }
    } catch {
      return { content: "I'm not configured yet — add OPENAI_API_KEY to the backend .env and ensure the backend is running." }
    }
  }
  return { content: "I'm not configured yet — set VITE_OPENAI_API_KEY in the frontend .env or VITE_BACKEND_URL so Orion can run." }
}

export async function chatWithOrion(
  messages: OrionMessage[],
  context: OrionContext | undefined
): Promise<string> {
  const safeContext = context ?? {}

  // Prefer direct OpenAI when frontend key is set (from .env)
  if (OPENAI_API_KEY) {
    const systemMessage: OrionMessage = { role: 'system', content: buildSystemPrompt(safeContext) }
    const allMessages = [systemMessage, ...messages]
    const maxTokens = safeContext.isNavigating ? 60 : 300
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: allMessages,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        if (res.status === 401 || /invalid|incorrect.*api.*key/i.test(err))
          return "Orion couldn't connect. Check VITE_OPENAI_API_KEY in the frontend .env is valid at platform.openai.com."
        throw new Error(`OpenAI error: ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content?.trim() || 'Sorry, I had trouble with that.'
    } catch (e) {
      return "Sorry, I had a hiccup. Try again!"
    }
  }

  // Otherwise use backend
  if (!API_BASE) {
    return "I'm not configured yet — set VITE_OPENAI_API_KEY in the frontend .env or VITE_BACKEND_URL so Orion can run."
  }

  const payload = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    context: safeContext,
  }

  try {
    const response = await fetch(`${API_BASE}/api/orion/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`)
    }
    const data = await response.json()
    return data?.content ?? 'Sorry, I had trouble with that.'
  } catch (e) {
    return "I'm not configured yet — add OPENAI_API_KEY to the backend .env and ensure the backend is running."
  }
}

export async function* streamOrion(
  messages: OrionMessage[],
  context: OrionContext | undefined
): AsyncGenerator<string> {
  const safeContext = context ?? {}

  // Prefer direct OpenAI when frontend key is set (from .env)
  if (OPENAI_API_KEY) {
    const systemMessage: OrionMessage = { role: 'system', content: buildSystemPrompt(safeContext) }
    const allMessages = [systemMessage, ...messages]
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: allMessages,
          max_tokens: 500,
          temperature: 0.7,
          stream: true,
        }),
      })
      if (!res.ok) {
        if (res.status === 401) yield "Orion couldn't connect. Check VITE_OPENAI_API_KEY in the frontend .env."
        return
      }
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') return
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) yield content
            } catch {
              /* ignore */
            }
          }
        }
      }
      return
    } catch {
      yield "Sorry, I had a hiccup. Try again!"
      return
    }
  }

  // Otherwise use backend
  if (!API_BASE) {
    yield "I'm not configured — set VITE_OPENAI_API_KEY in the frontend .env or VITE_BACKEND_URL."
    return
  }

  const payload = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    context: safeContext,
  }

  const response = await fetch(`${API_BASE}/api/orion/completions/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  if (!reader || !response.ok) return

  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }
}

// Ensure voices are loaded (Chrome often returns [] until after first interaction / voiceschanged)
function getVoicesList(): SpeechSynthesisVoice[] {
  let list = window.speechSynthesis.getVoices()
  if (list.length > 0) return list
  // Trigger load on Chrome; next call may have voices
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.getVoices()
  }
  return window.speechSynthesis.getVoices()
}

// Prefer voices that sound most natural/human (platform-specific)
function getNaturalVoice(): SpeechSynthesisVoice | undefined {
  const voices = getVoicesList()
  if (!voices.length) return undefined
  const enUs = voices.filter((v) => v.lang === 'en-US' || v.lang.startsWith('en-US'))
  // Priority: high-quality, conversational voices (order matters)
  const preferredNames = [
    'Samantha',           // macOS/iOS – very natural
    'Alex',               // macOS
    'Karen',              // macOS (AU)
    'Google US English',  // Chrome – natural
    'Microsoft Aria',     // Edge – natural
    'Microsoft Zira',     // Windows
    'Daniel',             // macOS UK, often natural
    'Moira',              // macOS
    'Samantha (Enhanced)', 'Alex (Enhanced)',
  ]
  for (const name of preferredNames) {
    const found = enUs.find((v) => v.name.includes(name))
    if (found) return found
  }
  // Fallback: first en-US female (often more natural for assistant), then any en-US
  return enUs.find((v) => !v.name.includes('Male')) ?? enUs[0]
}

export function orionSpeak(
  text: string,
  priority: 'high' | 'normal' = 'normal',
  isMuted: boolean = false
) {
  if (isMuted) return
  if (!window.speechSynthesis) return

  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)

  const voice = getNaturalVoice()
  if (voice) utterance.voice = voice

  // Natural human pace: slightly slower than 1.0, clear for driving
  utterance.rate = priority === 'high' ? 0.92 : 0.9
  utterance.pitch = 1.02
  utterance.volume = 1.0

  window.speechSynthesis.speak(utterance)
}

export function startListening(
  onResult: (text: string) => void,
  onEnd: () => void
): (() => void) | null {
  type SimpleRecognition = {
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null
    onend: (() => void) | null
    onerror: (() => void) | null
    start: () => void
    stop: () => void
  }
  type SpeechRecognitionCtor = new () => SimpleRecognition
  const SpeechRecognition =
    (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition

  if (!SpeechRecognition) return null

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript
    if (text) onResult(text)
  }

  recognition.onend = onEnd
  recognition.onerror = onEnd

  recognition.start()

  return () => recognition.stop()
}
