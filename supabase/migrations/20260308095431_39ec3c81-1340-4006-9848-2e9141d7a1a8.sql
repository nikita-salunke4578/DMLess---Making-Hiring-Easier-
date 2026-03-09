-- Update the RLS policy to allow 'qualified' status and allow updates on qualified submissions for resume upload
DROP POLICY "Can update in-progress submissions" ON public.candidate_submissions;

CREATE POLICY "Can update submissions"
ON public.candidate_submissions
FOR UPDATE
TO anon, authenticated
USING (status IN ('in_progress', 'qualified'))
WITH CHECK (status IN ('in_progress', 'completed', 'knocked_out', 'qualified'));