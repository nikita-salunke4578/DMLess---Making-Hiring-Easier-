CREATE POLICY "Recruiters can delete submissions for own links"
ON public.candidate_submissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hiring_links
    WHERE hiring_links.id = candidate_submissions.hiring_link_id
    AND hiring_links.recruiter_id = auth.uid()
  )
);