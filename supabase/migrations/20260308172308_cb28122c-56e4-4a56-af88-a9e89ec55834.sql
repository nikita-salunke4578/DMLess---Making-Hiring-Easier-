
ALTER TABLE public.candidate_submissions ADD COLUMN video_intro_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-intros', 'video-intros', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Candidates can upload video intros"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'video-intros');

CREATE POLICY "Authenticated users can view video intros"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-intros');
