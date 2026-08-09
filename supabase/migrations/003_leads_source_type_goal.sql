-- Migration 003: Add optional source, business_type, and goal columns
ALTER TABLE public.customers_direct_leads
  ADD COLUMN IF NOT EXISTS source        text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS goal          text;
