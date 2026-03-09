
-- Create public storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- Allow users to update/delete their own logos
CREATE POLICY "Users can manage own logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
