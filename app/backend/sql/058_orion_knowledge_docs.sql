-- Orion knowledge base documents for RAG-style prompt injection (admin-managed playbook).
CREATE TABLE IF NOT EXISTS public.orion_knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body_markdown TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orion_knowledge_active_category
  ON public.orion_knowledge_docs (active, category);

COMMENT ON TABLE public.orion_knowledge_docs IS
  'Authoritative SnapRoad product/safety copy Orion may cite. Retrieved server-side into prompts.';

-- Seed starter docs (safe to re-run: slug is unique).
INSERT INTO public.orion_knowledge_docs (slug, title, category, body_markdown)
VALUES
  (
    'gems-basics',
    'How gems work',
    'product',
    'SnapRoad gems reward safe driving miles, completing trips, hazard reports, and partner offers. Gems appear in Profile and Rewards. Premium members earn a 2× gem multiplier on eligible rewards.'
  ),
  (
    'premium-benefits',
    'Premium member benefits',
    'premium',
    'Premium includes 2× gems, deeper Insights & Recap analytics, traffic camera layers, richer place alerts, friend live location sharing, and expanded Orion context when available.'
  ),
  (
    'driving-safety',
    'Orion safety boundaries',
    'safety',
    'Orion never encourages speeding, distraction, or risky maneuvers. During navigation, keep replies short. Turn instructions always come first. Do not joke about crashes, police, or emergencies.'
  ),
  (
    'offers-redemption',
    'Offers and online deals',
    'offers',
    'Local offers appear on the map near participating businesses. Online deals live in the Offers tab. Redeem local offers in-app when eligible; online deals open the retailer in the browser.'
  )
ON CONFLICT (slug) DO NOTHING;
