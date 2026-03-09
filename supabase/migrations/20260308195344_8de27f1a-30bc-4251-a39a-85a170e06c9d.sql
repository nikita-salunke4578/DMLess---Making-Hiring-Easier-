
-- Update RLS policy to allow new pipeline statuses
DROP POLICY IF EXISTS "Can update submissions" ON public.candidate_submissions;
CREATE POLICY "Can update submissions" ON public.candidate_submissions
  FOR UPDATE
  USING (status IN ('in_progress', 'qualified', 'completed', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'knocked_out'))
  WITH CHECK (status IN ('in_progress', 'completed', 'knocked_out', 'qualified', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'));

-- Also allow recruiters to update submissions for their own links (for bulk actions)
CREATE POLICY "Recruiters can update submissions for own links" ON public.candidate_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM hiring_links
    WHERE hiring_links.id = candidate_submissions.hiring_link_id
    AND hiring_links.recruiter_id = auth.uid()
  ));

-- Add unique constraint to prevent duplicate candidates per hiring link
CREATE UNIQUE INDEX IF NOT EXISTS unique_candidate_per_link ON public.candidate_submissions (hiring_link_id, candidate_email) WHERE status != 'knocked_out';
