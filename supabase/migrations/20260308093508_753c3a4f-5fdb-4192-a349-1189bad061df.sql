
-- Add passing_score to hiring_links
ALTER TABLE public.hiring_links ADD COLUMN passing_score integer NOT NULL DEFAULT 0;

-- Add resume_url to candidate_submissions
ALTER TABLE public.candidate_submissions ADD COLUMN resume_url text DEFAULT NULL;

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policy: anyone can upload resumes
CREATE POLICY "Anyone can upload resumes"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'resumes');

-- Storage policy: authenticated recruiters can read resumes
CREATE POLICY "Authenticated users can read resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');
