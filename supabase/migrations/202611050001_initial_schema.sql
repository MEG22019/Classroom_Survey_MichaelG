BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE INDEX IF NOT EXISTS surveys_status_idx ON public.surveys(status);
CREATE INDEX IF NOT EXISTS surveys_public_slug_idx ON public.surveys(public_slug);
CREATE INDEX IF NOT EXISTS questions_survey_id_idx ON public.questions(survey_id);
CREATE INDEX IF NOT EXISTS choices_question_id_idx ON public.choices(question_id);
CREATE INDEX IF NOT EXISTS responses_survey_id_idx ON public.responses(survey_id);
CREATE INDEX IF NOT EXISTS responses_submitted_at_idx ON public.responses(submitted_at);
CREATE UNIQUE INDEX IF NOT EXISTS only_one_active_survey
    ON public.surveys(status)
    WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS responses_unique_student_per_survey
    ON public.responses(survey_id, anonymous_token);
CREATE INDEX IF NOT EXISTS answers_response_id_idx ON public.answers(response_id);
CREATE INDEX IF NOT EXISTS answers_question_id_idx ON public.answers(question_id);
CREATE INDEX IF NOT EXISTS answers_choice_id_idx ON public.answers(choice_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
