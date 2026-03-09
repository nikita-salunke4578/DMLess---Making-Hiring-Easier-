
-- Drop the restrictive insert policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.candidate_submissions;
CREATE POLICY "Anyone can insert submissions"
  ON public.candidate_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also fix the update policy to be permissive
DROP POLICY IF EXISTS "Can update in-progress submissions" ON public.candidate_submissions;
CREATE POLICY "Can update in-progress submissions"
  ON public.candidate_submissions
  FOR UPDATE
  TO anon, authenticated
  USING (status = 'in_progress')
  WITH CHECK (status IN ('in_progress', 'completed', 'knocked_out'));
