import { AUTH_STORAGE_KEY } from './auth';
import { supabase } from './supabase';
import type { Question, Survey, SurveyChoiceResult, SurveyQuestionResult, SurveyResultsSummary, SurveyStatus, SurveySubmission } from './types';
import { createDefaultQuestion, generateUniquePublicSlug, slugify } from './utils';

const SURVEYS_KEY = 'classroom-survey-surveys-v1';
const SUBMISSIONS_KEY = 'classroom-survey-submissions-v1';

function isSupabaseSessionActive(): boolean {
  return !!supabase && localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? '');
}

function assignUuidIfNeeded(value: string): string {
  if (isValidUuid(value)) {
    return value;
  }

  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : value;
}

function mapSurveyRow(row: any): Survey {
  const questions = (row.questions ?? []).map((questionRow: any) => ({
    id: questionRow.id,
    text: questionRow.question_text,
    type: questionRow.question_type,
    position: questionRow.position ?? 1,
    choices: (questionRow.choices ?? []).map((choiceRow: any) => ({
      id: choiceRow.id,
      text: choiceRow.choice_text,
      position: choiceRow.position ?? 1,
    })).sort((left: any, right: any) => (left.position ?? 0) - (right.position ?? 0)),
  })).sort((left: any, right: any) => (left.position ?? 0) - (right.position ?? 0));

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    slug: row.public_slug ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions,
  };
}

export async function fetchSurveys(): Promise<Survey[]> {
  if (isSupabaseSessionActive()) {
    try {
      const { data, error } = await supabase!
        .from('surveys')
        .select('*, questions(*, choices(*))')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const surveys = data.map(mapSurveyRow);
        localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
        return surveys;
      }

      if (error) {
        console.error('Failed to load surveys from Supabase:', error);
      }
    } catch (error) {
      console.error('Supabase survey fetch failed:', error);
    }
  }

  return getSurveys();
}

export async function fetchSurveyById(surveyId: string): Promise<Survey | undefined> {
  if (isSupabaseSessionActive()) {
    try {
      const { data, error } = await supabase!
        .from('surveys')
        .select('*, questions(*, choices(*))')
        .eq('id', surveyId)
        .maybeSingle();

      if (!error && data) {
        const survey = mapSurveyRow(data);
        localStorage.setItem(SURVEYS_KEY, JSON.stringify([survey]));
        return survey;
      }

      if (error) {
        console.error('Failed to load survey by id from Supabase:', error);
      }
    } catch (error) {
      console.error('Supabase survey lookup failed:', error);
    }
  }

  return getSurveys().find((survey) => survey.id === surveyId);
}

export async function fetchSurveyBySlug(slug: string): Promise<Survey | undefined> {
  if (isSupabaseSessionActive()) {
    try {
      const { data, error } = await supabase!
        .from('surveys')
        .select('*, questions(*, choices(*))')
        .eq('public_slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (!error && data) {
        const survey = mapSurveyRow(data);
        localStorage.setItem(SURVEYS_KEY, JSON.stringify([survey]));
        return survey;
      }

      if (error) {
        console.error('Failed to load survey by slug from Supabase:', error);
      }
    } catch (error) {
      console.error('Supabase survey slug lookup failed:', error);
    }
  }

  return getSurveys().find((survey) => survey.slug === slug && survey.status === 'active');
}

const seedSurveys: Survey[] = [
  {
    id: 'survey-demo-1',
    title: 'Recursion Concept Check',
    description: 'A quick poll to check whether students understand recursive calls.',
    status: 'active',
    slug: 'recursion-check',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'q-1',
        text: 'What is required for a recursive function to stop?',
        type: 'multiple_choice',
        position: 1,
        choices: [
          { id: 'c-1', text: 'A base case', position: 1 },
          { id: 'c-2', text: 'A pointer', position: 2 },
          { id: 'c-3', text: 'A loop', position: 3 },
        ],
      },
      {
        id: 'q-2',
        text: 'A recursive function must always return a value.',
        type: 'true_false',
        position: 2,
        choices: [
          { id: 'c-4', text: 'True', position: 1 },
          { id: 'c-5', text: 'False', position: 2 },
        ],
      },
    ],
  },
  {
    id: 'survey-demo-2',
    title: 'Pointer Review',
    description: 'Practice recall for the pointer lesson from the last class.',
    status: 'closed',
    slug: 'pointer-review',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    questions: [
      {
        id: 'q-3',
        text: 'What does a pointer store?',
        type: 'multiple_choice',
        position: 1,
        choices: [
          { id: 'c-6', text: 'A memory address', position: 1 },
          { id: 'c-7', text: 'A value only', position: 2 },
        ],
      },
    ],
  },
];

export function normalizeSurvey(survey: Survey): Survey {
  const normalizedQuestions = (survey.questions ?? []).map((question, questionIndex) => ({
    ...question,
    position: questionIndex + 1,
    choices: (question.choices ?? []).map((choice, choiceIndex) => ({
      ...choice,
      position: choiceIndex + 1,
    })),
  }));

  return {
    ...survey,
    title: survey.title?.trim() || 'Untitled Survey',
    description: survey.description ?? '',
    questions: normalizedQuestions,
    updatedAt: new Date().toISOString(),
  };
}

export function getSurveys(): Survey[] {
  const raw = localStorage.getItem(SURVEYS_KEY);
  if (!raw) {
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(seedSurveys));
    return [...seedSurveys];
  }

  try {
    const parsed = JSON.parse(raw) as Survey[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...seedSurveys];
    }

    return parsed.map((survey) => normalizeSurvey(survey));
  } catch {
    return [...seedSurveys];
  }
}

export async function saveSurveys(surveys: Survey[]) {
  const safeSurveys = surveys.map((survey) => normalizeSurvey(survey)).map((survey) => ({
    ...survey,
    id: assignUuidIfNeeded(survey.id),
    questions: survey.questions.map((question) => ({
      ...question,
      id: assignUuidIfNeeded(question.id),
      choices: question.choices.map((choice) => ({
        ...choice,
        id: assignUuidIfNeeded(choice.id),
      })),
    })),
  }));

  if (isSupabaseSessionActive()) {
    try {
      for (const survey of safeSurveys) {
        const { error: surveyError } = await supabase!.from('surveys').upsert({
          id: survey.id,
          title: survey.title,
          description: survey.description,
          status: survey.status,
          public_slug: survey.slug || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (surveyError) {
          throw surveyError;
        }

        const { data: existingQuestions, error: questionLookupError } = await supabase!
          .from('questions')
          .select('id')
          .eq('survey_id', survey.id);

        if (questionLookupError) {
          throw questionLookupError;
        }

        if ((existingQuestions ?? []).length > 0) {
          const questionIds = (existingQuestions ?? []).map((question) => question.id);
          const { error: choiceDeleteError } = await supabase!
            .from('choices')
            .delete()
            .in('question_id', questionIds);

          if (choiceDeleteError) {
            throw choiceDeleteError;
          }

          const { error: questionDeleteError } = await supabase!
            .from('questions')
            .delete()
            .in('id', questionIds);

          if (questionDeleteError) {
            throw questionDeleteError;
          }
        }

        for (const question of survey.questions) {
          const { error: questionError } = await supabase!.from('questions').upsert({
            id: question.id,
            survey_id: survey.id,
            question_text: question.text,
            question_type: question.type,
            position: question.position,
          }, { onConflict: 'id' });

          if (questionError) {
            throw questionError;
          }

          for (const choice of question.choices) {
            const { error: choiceError } = await supabase!.from('choices').upsert({
              id: choice.id,
              question_id: question.id,
              choice_text: choice.text,
              position: choice.position,
            }, { onConflict: 'id' });

            if (choiceError) {
              throw choiceError;
            }
          }
        }
      }

      localStorage.setItem(SURVEYS_KEY, JSON.stringify(safeSurveys));
      return;
    } catch (error) {
      console.error('Supabase survey save failed:', error);
    }
  }

  localStorage.setItem(SURVEYS_KEY, JSON.stringify(safeSurveys));
}

export function createSurveyRecord(title: string, description: string): Survey {
  const now = new Date().toISOString();
  return normalizeSurvey({
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `survey-${Math.random().toString(36).slice(2, 10)}`,
    title: title.trim() || 'Untitled Survey',
    description: description.trim(),
    status: 'draft',
    slug: `draft-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    questions: [createDefaultQuestion(1)],
  });
}

export function setSurveyStatus(surveys: Survey[], surveyId: string, status: SurveyStatus): Survey[] {
  if (status === 'active') {
    return surveys.map((survey) => ({
      ...survey,
      status: survey.id === surveyId ? 'active' : survey.status === 'active' ? 'closed' : survey.status,
      updatedAt: new Date().toISOString(),
    }));
  }

  return surveys.map((survey) =>
    survey.id === surveyId
      ? { ...survey, status, updatedAt: new Date().toISOString() }
      : survey,
  );
}

export function ensureSurveySlug(survey: Survey): Survey {
  const existingSlugs = getSurveys().filter((entry) => entry.id !== survey.id).map((entry) => entry.slug);
  const nextSlug = survey.slug && survey.slug.trim() ? survey.slug : generateUniquePublicSlug(survey.title || 'survey', existingSlugs);
  return { ...survey, slug: nextSlug, updatedAt: new Date().toISOString() };
}

export function getSurveyById(surveyId: string): Survey | undefined {
  return getSurveys().find((survey) => survey.id === surveyId);
}

export function getSurveyBySlug(slug: string): Survey | undefined {
  return getSurveys().find((survey) => survey.slug === slug && survey.status === 'active');
}

export function getSubmissionsForSurvey(surveyId: string): SurveySubmission[] {
  const raw = localStorage.getItem(SUBMISSIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SurveySubmission[];
    return parsed.filter((entry) => entry.surveyId === surveyId);
  } catch {
    return [];
  }
}

function buildSummaryFromSubmissions(survey: Survey | undefined, submissions: SurveySubmission[]): SurveyResultsSummary {
  const safeSurvey = survey ?? {
    id: 'unknown',
    title: 'Unknown Survey',
    description: '',
    status: 'draft',
    slug: 'unknown',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [],
  };

  const questions = safeSurvey.questions.map((question) => {
    const counts: Record<string, number> = {};
    question.choices.forEach((choice) => {
      counts[choice.id] = 0;
    });

    submissions.forEach((submission) => {
      const answer = submission.answers.find((entry) => entry.questionId === question.id);
      if (!answer || (!answer.choiceId && (!answer.textAnswer || answer.textAnswer.trim() === ''))) {
        return;
      }

      if (answer.choiceId) {
        counts[answer.choiceId] = (counts[answer.choiceId] ?? 0) + 1;
      }
    });

    const choiceResults: SurveyChoiceResult[] = question.choices.map((choice) => {
      const count = counts[choice.id] ?? 0;
      const percentage = submissions.length === 0 ? 0 : (count / submissions.length) * 100;
      return {
        choiceId: choice.id,
        choiceText: choice.text,
        count,
        percentage,
      };
    });

    const unanswered = submissions.filter((submission) => {
      const answer = submission.answers.find((entry) => entry.questionId === question.id);
      return !answer || (!answer.choiceId && (!answer.textAnswer || answer.textAnswer.trim() === ''));
    }).length;

    return {
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      totalResponses: submissions.length,
      unanswered,
      choices: choiceResults,
    } as SurveyQuestionResult;
  });

  return {
    surveyId: safeSurvey.id,
    surveyTitle: safeSurvey.title,
    surveyStatus: safeSurvey.status,
    publicSlug: safeSurvey.slug,
    totalResponses: submissions.length,
    questions,
    submissions,
  };
}

export function saveSubmission(submission: SurveySubmission) {
  const existing = localStorage.getItem(SUBMISSIONS_KEY);
  const items: SurveySubmission[] = existing ? JSON.parse(existing) : [];
  items.push(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items));
}

export async function getInstructorSurveyHistory(): Promise<Survey[]> {
  if (supabase && localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
    try {
      const { data, error } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((entry) => ({
          id: entry.id,
          title: entry.title,
          description: entry.description || '',
          status: entry.status,
          slug: entry.public_slug || '',
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          questions: [],
        }));
      }
    } catch (error) {
      console.error('Supabase survey history request failed:', error);
    }
  }

  return getSurveys();
}

export async function getSurveyResultsSummary(surveyId: string): Promise<SurveyResultsSummary> {
  const survey = getSurveyById(surveyId);
  const localSubmissions = getSubmissionsForSurvey(surveyId);

  if (supabase && localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
    try {
      const { data: surveyData, error: surveyError } = await supabase.from('surveys').select('*').eq('id', surveyId).maybeSingle();
      if (surveyError) {
        throw new Error(surveyError.message || 'Unable to load survey metadata.');
      }

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*, choices(*)')
        .eq('survey_id', surveyId)
        .order('position', { ascending: true });

      if (questionError) {
        throw new Error(questionError.message || 'Unable to load question results.');
      }

      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false });

      if (responseError) {
        throw new Error(responseError.message || 'Unable to load responses.');
      }

      const responseIds = (responseData ?? []).map((entry) => entry.id);
      const { data: answerData, error: answerError } = responseIds.length > 0
        ? await supabase.from('answers').select('*').in('response_id', responseIds)
        : { data: [], error: null };

      if (answerError) {
        throw new Error(answerError.message || 'Unable to load individual answers.');
      }

      const questions = (questionData ?? []).map((question: {
        id: string;
        question_text: string;
        question_type: 'multiple_choice' | 'true_false';
        position: number;
        choices?: Array<{ id: string; choice_text: string; position: number }>;
      }) => ({
        id: question.id,
        text: question.question_text,
        type: question.question_type,
        position: question.position,
        choices: (question.choices ?? []).map((choice: { id: string; choice_text: string; position: number }) => ({
          id: choice.id,
          text: choice.choice_text,
          position: choice.position,
        })),
      }));

      const submissions: SurveySubmission[] = (responseData ?? []).map((response) => ({
        id: response.id,
        surveyId: response.survey_id,
        token: response.anonymous_token || 'anonymous',
        submittedAt: response.submitted_at,
        answers: (answerData ?? []).filter((answer) => answer.response_id === response.id).map((answer) => ({
          questionId: answer.question_id,
          choiceId: answer.choice_id ?? undefined,
          textAnswer: answer.text_answer ?? undefined,
        })),
      }));

      const normalizedSurvey: Survey = {
        id: surveyData?.id ?? surveyId,
        title: surveyData?.title ?? survey?.title ?? 'Unknown Survey',
        description: surveyData?.description ?? survey?.description ?? '',
        status: (surveyData?.status as SurveyStatus) ?? survey?.status ?? 'draft',
        slug: surveyData?.public_slug ?? survey?.slug ?? '',
        createdAt: surveyData?.created_at ?? survey?.createdAt ?? new Date().toISOString(),
        updatedAt: surveyData?.updated_at ?? survey?.updatedAt ?? new Date().toISOString(),
        questions,
      };

      return buildSummaryFromSubmissions(normalizedSurvey, submissions);
    } catch (error) {
      console.error('Supabase result aggregation failed, falling back to local storage:', error);
    }
  }

  return buildSummaryFromSubmissions(survey, localSubmissions);
}

export function hasSubmittedSurvey(surveyId: string, token: string): boolean {
  return getSubmissionsForSurvey(surveyId).some((entry) => entry.token === token);
}

export async function deleteSurvey(surveyId: string): Promise<void> {
  if (isSupabaseSessionActive()) {
    try {
      const { error } = await supabase!.from('surveys').delete().eq('id', surveyId);
      if (error) {
        throw error;
      }
      const nextSurveys = getSurveys().filter((survey) => survey.id !== surveyId);
      localStorage.setItem(SURVEYS_KEY, JSON.stringify(nextSurveys));
      return;
    } catch (error) {
      console.error('Supabase survey delete failed:', error);
    }
  }

  const nextSurveys = getSurveys().filter((survey) => survey.id !== surveyId);
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(nextSurveys));
}

export async function submitSurveyResponse(surveyId: string, token: string, answers: Array<{ question_id: string; choice_id?: string; text_answer?: string }>): Promise<{ response_id: string }> {
  const survey = getSurveyById(surveyId);
  if (!survey) {
    throw new Error('Survey not found.');
  }

  if (survey.status !== 'active') {
    throw new Error('This survey is closed or unavailable.');
  }

  if (hasSubmittedSurvey(survey.id, token)) {
    throw new Error('You have already submitted a response for this survey.');
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('submit_survey_response', {
        p_survey_id: surveyId,
        p_anonymous_token: token,
        p_answers: answers,
      });

      if (error) {
        throw new Error(error.message || 'Unable to submit survey responses.');
      }

      return { response_id: data ?? crypto.randomUUID() };
    } catch (error) {
      console.error('Supabase submit_survey_response failed; using local fallback:', error);
    }
  }

  const missingAnswer = survey.questions.some((question) => {
    const selected = answers.find((answer) => answer.question_id === question.id);
    return !selected || (!selected.choice_id && !selected.text_answer?.trim());
  });

  if (missingAnswer) {
    throw new Error('Please answer every question before submitting.');
  }

  const submission: SurveySubmission = {
    id: `submission-${Math.random().toString(36).slice(2, 10)}`,
    surveyId: survey.id,
    token,
    submittedAt: new Date().toISOString(),
    answers: answers.map((answer) => ({
      questionId: answer.question_id,
      choiceId: answer.choice_id,
      textAnswer: answer.text_answer,
    })),
  };

  saveSubmission(submission);
  return { response_id: submission.id };
}

export function duplicateSurvey(survey: Survey): Survey {
  const clonedQuestions: Question[] = survey.questions.map((question) => ({
    ...question,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `question-${Math.random().toString(36).slice(2, 8)}`,
    choices: question.choices.map((choice) => ({
      ...choice,
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `choice-${Math.random().toString(36).slice(2, 8)}`,
    })),
  }));

  const now = new Date().toISOString();
  return normalizeSurvey({
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `survey-${Math.random().toString(36).slice(2, 10)}`,
    title: `Copy of ${survey.title}`,
    description: survey.description,
    status: 'draft',
    slug: `draft-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    questions: clonedQuestions,
  });
}

export async function activateSurvey(surveyId: string): Promise<Survey> {
  const activeSurvey = getSurveyById(surveyId);
  if (!activeSurvey) {
    throw new Error('Survey not found.');
  }

  const generatedSlug = generateUniquePublicSlug(activeSurvey.title || 'survey', getSurveys().filter((survey) => survey.id !== surveyId).map((survey) => survey.slug));
  const nextSurvey: Survey = {
    ...activeSurvey,
    slug: generatedSlug,
    status: 'active',
    updatedAt: new Date().toISOString(),
  };

  if (supabase && localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
    try {
      const { data, error } = await supabase.rpc('activate_survey', {
        p_survey_id: surveyId,
        p_public_slug: generatedSlug,
      });

      if (error) {
        throw new Error(error.message || 'Unable to activate the survey.');
      }

      const updatedSurveys = getSurveys().map((survey) => {
        if (survey.id === surveyId) {
          return normalizeSurvey({ ...survey, status: 'active', slug: data?.public_slug || generatedSlug } as Survey);
        }

        if (survey.status === 'active') {
          return { ...survey, status: 'closed', updatedAt: new Date().toISOString() } as Survey;
        }

        return survey;
      });

      saveSurveys(updatedSurveys);
      return normalizeSurvey({ ...nextSurvey, slug: data?.public_slug || generatedSlug } as Survey);
    } catch (error) {
      console.error('Activate survey in Supabase failed, falling back locally:', error);
    }
  }

  const nextSurveys = setSurveyStatus(getSurveys(), surveyId, 'active').map((survey) =>
    survey.id === surveyId ? { ...survey, slug: generatedSlug } : survey,
  );
  saveSurveys(nextSurveys);
  const activated = nextSurveys.find((survey) => survey.id === surveyId);

  if (!activated) {
    throw new Error('Survey could not be activated.');
  }

  return activated;
}

export async function closeSurvey(surveyId: string): Promise<Survey> {
  const current = getSurveyById(surveyId);
  if (!current) {
    throw new Error('Survey not found.');
  }

  if (supabase && localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
    try {
      const { data, error } = await supabase.rpc('close_survey', { p_survey_id: surveyId });
      if (error) {
        throw new Error(error.message || 'Unable to close the survey.');
      }

      const updated = getSurveys().map((survey) =>
        survey.id === surveyId ? normalizeSurvey({ ...survey, status: 'closed', slug: data?.public_slug || survey.slug } as Survey) : survey,
      );
      saveSurveys(updated);
      return normalizeSurvey({ ...current, status: 'closed', slug: data?.public_slug || current.slug } as Survey);
    } catch (error) {
      console.error('Close survey in Supabase failed, falling back locally:', error);
    }
  }

  const nextSurveys = setSurveyStatus(getSurveys(), surveyId, 'closed');
  saveSurveys(nextSurveys);
  const closed = nextSurveys.find((survey) => survey.id === surveyId);

  if (!closed) {
    throw new Error('Survey could not be closed.');
  }

  return closed;
}
