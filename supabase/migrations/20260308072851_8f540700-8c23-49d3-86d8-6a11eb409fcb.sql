
-- Tighten the update policy: candidates can only update submissions that are still in_progress
DROP POLICY "Anyone can update own submission" ON public.candidate_submissions;
CREATE POLICY "Can update in-progress submissions" ON public.candidate_submissions FOR UPDATE TO anon, authenticated USING (status = 'in_progress') WITH CHECK (status IN ('in_progress', 'completed', 'knocked_out'));
