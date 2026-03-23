import { useState } from 'react'
import { X, Sparkles, RefreshCw, Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Props {
  onClose: () => void
  onGenerate: (imageUrl: string) => void
}

const STYLES = [
  { id: 'photo', label: 'Realistic' },
  { id: 'illustration', label: 'Illustration' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold & Vibrant' },
]

export default function ImageGeneratorModal({ onClose, onGenerate }: Props) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('photo')
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt) return
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/ai/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${prompt}, ${style} style, professional business promotional image`, size: '512x512' }),
      })
      const data = await res.json()
      if (data.success && data.image_url) {
        setGeneratedImage(data.image_url)
      }
    } catch (e) {
      console.error('Image generation error:', e)
    }
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <Sparkles className="text-purple-400" size={24} />AI Image Generator
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Describe your promotional image</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A vibrant coffee shop with steaming latte art..."
                  rows={3}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${style === s.id ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-700/50 text-slate-400 border border-white/5 hover:border-white/20'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Generated" className="w-full h-48 object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={handleGenerate} disabled={generating || !prompt} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 flex items-center justify-center gap-2">
                  {generating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {generating ? 'Generating...' : 'Generate Image'}
                </button>
                {generatedImage && (
                  <button onClick={() => { onGenerate(generatedImage); onClose() }} className="flex-1 bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2">
                    <Check size={18} />Use This Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
