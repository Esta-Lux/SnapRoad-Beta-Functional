// Admin Dashboard Types
// =============================================

export interface Event {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  gems_multiplier: number
  xp_bonus: number
  start_date: string
  end_date: string
  status: 'active' | 'scheduled' | 'ended'
}

export interface User {
  id: string
  name: string
  email: string
  plan: 'basic' | 'premium' | 'family'
  safety_score: number
  gems: number
  level: number
  status: 'active' | 'suspended'
}

export interface Partner {
  id: string
  business_name: string
  email: string
  business_type: string
  status: 'active' | 'pending' | 'suspended'
  created_at: string
}

// AI Moderation Types
export type IncidentTab = 'new' | 'blurred' | 'review' | 'approved' | 'rejected'

export interface Incident {
  id: number
  type: string
  confidence: number
  status: 'new' | 'review' | 'approved' | 'rejected'
  blurred: boolean
  location: string
  reportedAt: string
}

// Modal Props Types
export interface OnboardingWalkthroughProps {
  onComplete: () => void
  onSkip: () => void
}

export interface ImageGeneratorModalProps {
  onClose: () => void
  onGenerate: (imageUrl: string) => void
}

export interface CreateOfferModalProps {
  onClose: () => void
  partners: Partner[]
}

export interface ExportModalProps {
  onClose: () => void
}

export interface ImportModalProps {
  onClose: () => void
}

export interface BulkUploadModalProps {
  onClose: () => void
}

// Tab Component Props
export interface AIModerationTabProps {
  theme: 'dark' | 'light'
}

export interface FigmaUsersTabProps {
  theme: 'dark' | 'light'
  onExport: () => void
}
