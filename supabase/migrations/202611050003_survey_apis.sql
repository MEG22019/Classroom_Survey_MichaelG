BEGIN;

CREATE OR REPLACE FUNCTION public.generate_public_slug()
RETURNS text
LANGUAGE sql
AS $$
    SELECT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

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
        SELECT 1 FROM public.surveys WHERE public_slug = v_slug AND id <> p_survey_id
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

GRANT EXECUTE ON FUNCTION public.activate_survey(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_survey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(uuid, text, jsonb) TO anon;

COMMIT;
