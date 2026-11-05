BEGIN;

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.surveys TO anon;
GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.choices TO anon;

GRANT ALL ON public.surveys TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.choices TO authenticated;
GRANT ALL ON public.responses TO authenticated;
GRANT ALL ON public.answers TO authenticated;

CREATE POLICY "surveys_authenticated_full_access"
ON public.surveys
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "surveys_public_read_active"
ON public.surveys
FOR SELECT
TO anon
USING (status = 'active');

CREATE POLICY "questions_authenticated_full_access"
ON public.questions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "questions_public_read_active"
ON public.questions
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1
        FROM public.surveys s
        WHERE s.id = public.questions.survey_id
          AND s.status = 'active'
    )
);

CREATE POLICY "choices_authenticated_full_access"
ON public.choices
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "choices_public_read_active"
ON public.choices
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1
        FROM public.questions q
        JOIN public.surveys s ON s.id = q.survey_id
        WHERE q.id = public.choices.question_id
          AND s.status = 'active'
    )
);

CREATE POLICY "responses_authenticated_full_access"
ON public.responses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "answers_authenticated_full_access"
ON public.answers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.responses FROM anon;
REVOKE ALL ON public.answers FROM anon;
REVOKE ALL ON public.questions FROM anon;
REVOKE ALL ON public.choices FROM anon;
REVOKE ALL ON public.surveys FROM anon;

COMMIT;
