BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================
-- 1. Core tables
-- =========================================

CREATE TABLE IF NOT EXISTS public.surveys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    public_slug text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    question_type text NOT NULL
        CHECK (question_type IN ('multiple_choice', 'true_false')),
    position integer NOT NULL CHECK (position > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.choices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    choice_text text NOT NULL,
    position integer NOT NULL CHECK (position > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    anonymous_token text NOT NULL,
    submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id uuid NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    choice_id uuid REFERENCES public.choices(id) ON DELETE SET NULL,
    text_answer text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (response_id, question_id)
);

-- =========================================
-- 2. Indexes
-- =========================================

CREATE INDEX IF NOT EXISTS surveys_status_idx ON public.surveys(status);
CREATE INDEX IF NOT EXISTS surveys_public_slug_idx ON public.surveys(public_slug);
CREATE INDEX IF NOT EXISTS questions_survey_id_idx ON public.questions(survey_id);
CREATE INDEX IF NOT EXISTS choices_question_id_idx ON public.choices(question_id);
CREATE INDEX IF NOT EXISTS responses_survey_id_idx ON public.responses(survey_id);
CREATE INDEX IF NOT EXISTS responses_submitted_at_idx ON public.responses(submitted_at);
CREATE INDEX IF NOT EXISTS answers_response_id_idx ON public.answers(response_id);
CREATE INDEX IF NOT EXISTS answers_question_id_idx ON public.answers(question_id);
CREATE INDEX IF NOT EXISTS answers_choice_id_idx ON public.answers(choice_id);

-- Only one active survey is allowed at a time.
CREATE UNIQUE INDEX IF NOT EXISTS only_one_active_survey
    ON public.surveys(status)
    WHERE status = 'active';

-- Prevent duplicate anonymous submissions per survey and token.
CREATE UNIQUE INDEX IF NOT EXISTS responses_unique_student_per_survey
    ON public.responses(survey_id, anonymous_token);

-- =========================================
-- 3. Updated timestamp trigger
-- =========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS surveys_updated_at ON public.surveys;
CREATE TRIGGER surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 4. RLS setup
-- =========================================

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Authenticated instructors have full access to all instructor-only data.
GRANT ALL ON public.surveys TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.choices TO authenticated;
GRANT ALL ON public.responses TO authenticated;
GRANT ALL ON public.answers TO authenticated;

-- Public access is limited to active survey metadata and nested questions/choices.
GRANT SELECT ON public.surveys TO anon;
GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.choices TO anon;

REVOKE ALL ON public.responses FROM anon;
REVOKE ALL ON public.answers FROM anon;

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

-- =========================================
-- 5. Public helper functions
-- =========================================

CREATE OR REPLACE FUNCTION public.generate_public_slug()
RETURNS text
LANGUAGE sql
AS $$
    SELECT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- =========================================
-- 6. Secure instructor management functions
-- =========================================

CREATE OR REPLACE FUNCTION public.activate_survey(p_survey_id uuid, p_public_slug text DEFAULT NULL)
RETURNS public.surveys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slug text;
    v_row public.surveys;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to activate surveys';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.surveys WHERE id = p_survey_id
    ) THEN
        RAISE EXCEPTION 'Survey not found';
    END IF;

    UPDATE public.surveys
    SET status = 'closed', updated_at = now()
    WHERE status = 'active' AND id <> p_survey_id;

    v_slug := trim(COALESCE(p_public_slug, ''));
    IF v_slug = '' THEN
        v_slug := public.generate_public_slug();
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.surveys
        WHERE public_slug = v_slug AND id <> p_survey_id
    ) THEN
        RAISE EXCEPTION 'Public slug is already in use';
    END IF;

    UPDATE public.surveys
    SET status = 'active',
        public_slug = v_slug,
        updated_at = now()
    WHERE id = p_survey_id
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_survey(p_survey_id uuid)
RETURNS public.surveys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.surveys;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to close surveys';
    END IF;

    UPDATE public.surveys
    SET status = 'closed', updated_at = now()
    WHERE id = p_survey_id
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RAISE EXCEPTION 'Survey not found';
    END IF;

    RETURN v_row;
END;
$$;

-- =========================================
-- 7. Anonymous submission function
-- =========================================

CREATE OR REPLACE FUNCTION public.submit_survey_response(
    p_survey_id uuid,
    p_anonymous_token text,
    p_answers jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_survey public.surveys;
    v_question_count integer;
    v_response_id uuid;
    v_answer jsonb;
    v_question_id uuid;
    v_choice_id uuid;
    v_question public.questions;
BEGIN
    IF p_anonymous_token IS NULL OR btrim(p_anonymous_token) = '' THEN
        RAISE EXCEPTION 'Anonymous token is required';
    END IF;

    IF jsonb_typeof(p_answers) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Answers must be provided as a JSON array';
    END IF;

    SELECT * INTO v_survey
    FROM public.surveys
    WHERE id = p_survey_id
    FOR UPDATE;

    IF v_survey.id IS NULL THEN
        RAISE EXCEPTION 'Survey not found';
    END IF;

    IF v_survey.status <> 'active' THEN
        RAISE EXCEPTION 'Survey is not active';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.responses
        WHERE survey_id = p_survey_id
          AND anonymous_token = p_anonymous_token
    ) THEN
        RAISE EXCEPTION 'Duplicate submission prevented';
    END IF;

    v_question_count := (
        SELECT count(*)
        FROM public.questions
        WHERE survey_id = p_survey_id
    );

    IF jsonb_array_length(p_answers) <> v_question_count THEN
        RAISE EXCEPTION 'Answer count does not match the survey question count';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT value->>'question_id' AS question_id
            FROM jsonb_array_elements(p_answers)
        ) q
        GROUP BY q.question_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate question answers are not allowed';
    END IF;

    INSERT INTO public.responses (survey_id, anonymous_token)
    VALUES (p_survey_id, p_anonymous_token)
    RETURNING id INTO v_response_id;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_question_id := NULL;
        v_choice_id := NULL;

        IF v_answer ? 'question_id' IS FALSE OR v_answer->>'question_id' = '' THEN
            RAISE EXCEPTION 'Each answer must include a question_id';
        END IF;

        v_question_id := (v_answer->>'question_id')::uuid;

        SELECT * INTO v_question
        FROM public.questions
        WHERE id = v_question_id AND survey_id = p_survey_id;

        IF v_question.id IS NULL THEN
            RAISE EXCEPTION 'Question does not belong to the requested survey';
        END IF;

        IF v_answer ? 'choice_id' AND v_answer->>'choice_id' <> '' THEN
            v_choice_id := (v_answer->>'choice_id')::uuid;
            IF NOT EXISTS (
                SELECT 1
                FROM public.choices
                WHERE id = v_choice_id
                  AND question_id = v_question_id
            ) THEN
                RAISE EXCEPTION 'Choice does not belong to the selected question';
            END IF;
        END IF;

        IF v_question.question_type IN ('multiple_choice', 'true_false') AND v_choice_id IS NULL THEN
            RAISE EXCEPTION 'Multiple-choice and true/false questions require a valid choice selection';
        END IF;

        INSERT INTO public.answers (
            response_id,
            question_id,
            choice_id,
            text_answer
        )
        VALUES (
            v_response_id,
            v_question_id,
            v_choice_id,
            NULLIF(v_answer->>'text_answer', '')
        );
    END LOOP;

    RETURN v_response_id;
END;
$$;

-- =========================================
-- 8. Least-privilege function access
-- =========================================

-- Explicitly remove any default PUBLIC execution rights before granting only the required roles.
REVOKE ALL ON FUNCTION public.generate_public_slug() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_survey(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_survey(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_survey_response(uuid, text, jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.generate_public_slug() FROM anon;
REVOKE ALL ON FUNCTION public.activate_survey(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.close_survey(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.submit_survey_response(uuid, text, jsonb) FROM anon;

REVOKE ALL ON FUNCTION public.generate_public_slug() FROM authenticated;
REVOKE ALL ON FUNCTION public.activate_survey(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.close_survey(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.submit_survey_response(uuid, text, jsonb) FROM authenticated;

-- Instructor-only functions are available only to authenticated users.
GRANT EXECUTE ON FUNCTION public.activate_survey(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_survey(uuid) TO authenticated;

-- Anonymous students may submit responses only through the secure RPC.
GRANT EXECUTE ON FUNCTION public.submit_survey_response(uuid, text, jsonb) TO anon;

COMMIT;
