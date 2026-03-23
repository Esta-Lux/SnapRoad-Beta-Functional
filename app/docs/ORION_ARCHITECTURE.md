# Orion AI Architecture

Orion is SnapRoad's in-app AI navigator and assistant. This document describes how the Orion "brain" is structured and how data flows from the app into the AI and back to the user.

## High-level layout

```mermaid
flowchart TB
  subgraph UI [Driver app UI]
    OrionVoice[OrionVoice.tsx]
    IndexCalls[index.tsx voice / nav calls]
  end

  subgraph Context [Context builder]
    BuildCtx[buildOrionContext in index.tsx]
  end

  subgraph OrionLib [lib/orion.ts]
    Chat[chatWithOrion]
    Stream[streamOrion]
    Speak[orionSpeak]
    Listen[startListening]
  end

  subgraph Backend [Backend API]
    Completions[/api/orion/completions]
    StreamEndpoint[/api/orion/completions/stream]
  end

  subgraph External [External]
    OpenAI[OpenAI API]
  end

  OrionVoice --> BuildCtx
  OrionVoice --> Chat
  OrionVoice --> Stream
  OrionVoice --> Speak
  OrionVoice --> Listen
  IndexCalls --> BuildCtx
  IndexCalls --> Chat
  IndexCalls --> Speak
  Chat --> Completions
  Stream --> StreamEndpoint
  Completions --> OpenAI
  StreamEndpoint --> OpenAI
```

## Components

| Piece | Location | Role |
|-------|----------|------|
| **OrionContext** | `lib/orion.ts` (interface) | Typed object: `userName`, `currentLocation`, `currentAddress`, `isNavigating`, `currentRoute`, `speedMph`, `nearbyOffers`, `gems`, `level`, `timeOfDay`. Built in the app and passed into all Orion API calls. |
| **buildOrionContext()** | `pages/DriverApp/index.tsx` | Builds context from app state: user, `userLocation`, `isNavigating`, `navigationData`, `liveEta`, `offers`, `userData`, etc. |
| **buildSystemPrompt(ctx)** | `lib/orion.ts` | Turns `OrionContext` into a string system prompt: Orion personality, SnapRoad features, current driver context, navigation voice rules. Accepts `ctx` as optional; uses `ctx ?? {}` so it never reads properties of `undefined`. |
| **chatWithOrion(messages, context)** | `lib/orion.ts` | Non-streaming: sends system prompt + messages to OpenAI, returns one reply. Uses shorter `max_tokens` when `context.isNavigating` is true. Context is normalized with `context ?? {}`. |
| **streamOrion(messages, context)** | `lib/orion.ts` | Streaming: same as above but streams response chunks. Used in OrionVoice when not navigating. Context is normalized with `context ?? {}`. |
| **orionSpeak(text, priority, isMuted)** | `lib/orion.ts` | Browser speech synthesis (TTS). Used for Orion replies and for one-off announcements from the app (route start, arrival, etc.). |
| **startListening(onResult, onEnd)** | `lib/orion.ts` | Browser speech recognition. Used in OrionVoice for voice input. |

## Data flow

1. **Context**  
   The app builds context with `buildOrionContext()` and passes it to:
   - `OrionVoice` (so the assistant knows driver state, route, offers).
   - One-off `chatWithOrion` / `orionSpeak` calls in `index.tsx` (e.g. route start, arrival).

2. **OrionVoice**  
   Uses that context for:
   - Greeting: one non-streaming `chatWithOrion` call with "greet me briefly".
   - Chat: if `context.isNavigating` is true, uses `chatWithOrion` for brief replies; when false, uses `streamOrion` for streaming answers.

3. **Backend and OpenAI**  
   The frontend never sees the OpenAI key. It sends `messages` and `context` to the backend. The backend builds the system prompt from `context`, calls OpenAI with `OPENAI_API_KEY` from its `.env`, and returns the reply (or streams it).

## Configuration

- **Backend:** Set `OPENAI_API_KEY` in the backend `.env` (e.g. `OPENAI_API_KEY=sk-...`). Optional: `OPENAI_MODEL` (default `gpt-4o-mini`).
- **Frontend:** Set `VITE_BACKEND_URL` (or `VITE_API_URL`) so the app can reach the backend (e.g. `VITE_BACKEND_URL=http://localhost:8001`). No OpenAI key is needed in the frontend.
- **Behavior when key or backend is missing:** `chatWithOrion` and `streamOrion` return a friendly “not configured” message.

## Defensive handling of context

To avoid `Cannot read properties of undefined (reading 'isNavigating')` and similar errors:

- The backend’s `build_orion_system_prompt(ctx)` uses `c = ctx or {}` before reading any property.
- The frontend’s `chatWithOrion` and `streamOrion` accept `OrionContext | undefined` and send `context ?? {}` in the request body.
- The Driver app passes `context={buildOrionContext() ?? {}}` into `OrionVoice` so the prop is never undefined.
