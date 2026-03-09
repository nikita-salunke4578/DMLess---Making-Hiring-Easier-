
-- Add logo_url and industry to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry text;

-- Add company branding overrides to hiring_links
ALTER TABLE public.hiring_links ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.hiring_links ADD COLUMN IF NOT EXISTS company_logo_url text;
