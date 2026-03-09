
-- Allow anyone to read company_name and logo_url from profiles (for candidate-facing branding)
CREATE POLICY "Anyone can view company branding"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
