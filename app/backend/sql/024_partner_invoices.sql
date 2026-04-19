CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_invoices_partner_month
  ON public.partner_invoices(partner_id, month_year);

CREATE INDEX IF NOT EXISTS idx_partner_invoices_status
  ON public.partner_invoices(status, generated_at DESC);
