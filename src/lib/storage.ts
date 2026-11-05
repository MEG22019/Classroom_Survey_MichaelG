import { AUTH_STORAGE_KEY } from './auth';
import { supabase } from './supabase';
import type { Question, Survey, SurveyStatus, SurveySubmission } from './types';
import { createDefaultQuestion, slugify } from './utils';

const SURVEYS_KEY = 'classroom-survey-surveys-v1';
const SUBMISSIONS_KEY = 'classroom-survey-submissions-v1';

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

export function saveSurveys(surveys: Survey[]) {
  const safeSurveys = surveys.map((survey) => normalizeSurvey(survey));
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(safeSurveys));
}

export function createSurveyRecord(title: string, description: string): Survey {
  const now = new Date().toISOString();
  return normalizeSurvey({
    id: `survey-${Math.random().toString(36).slice(2, 10)}`,
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
  const safeTitle = slugify(survey.title || 'survey');
  const slug = survey.slug && survey.slug.trim() ? survey.slug : `${safeTitle}-${Math.random().toString(36).slice(2, 6)}`;
  return { ...survey, slug, updatedAt: new Date().toISOString() };
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

export function saveSubmission(submission: SurveySubmission) {
  const existing = localStorage.getItem(SUBMISSIONS_KEY);
  const items: SurveySubmission[] = existing ? JSON.parse(existing) : [];
  items.push(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items));
}

export function hasSubmittedSurvey(surveyId: string, token: string): boolean {
  return getSubmissionsForSurvey(surveyId).some((entry) => entry.token === token);
}

export function duplicateSurvey(survey: Survey): Survey {
  const clonedQuestions: Question[] = survey.questions.map((question) => ({
    ...question,
    id: `question-${Math.random().toString(36).slice(2, 8)}`,
    choices: question.choices.map((choice) => ({
      ...choice,
      id: `choice-${Math.random().toString(36).slice(2, 8)}`,
    })),
  }));

  const now = new Date().toISOString();
  return normalizeSurvey({
    id: `survey-${Math.random().toString(36).slice(2, 10)}`,
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

  if (supabase && localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
    try {
      const { data, error } = await supabase.rpc('activate_survey', {
        p_survey_id: surveyId,
        p_public_slug: activeSurvey.slug || null,
      });

      if (error) {
        throw new Error(error.message || 'Unable to activate the survey.');
      }

      const updatedSurveys = getSurveys().map((survey) => {
        if (survey.id === surveyId) {
          return normalizeSurvey({ ...survey, status: 'active', slug: data?.public_slug || survey.slug } as Survey);
        }

        if (survey.status === 'active') {
          return { ...survey, status: 'closed', updatedAt: new Date().toISOString() } as Survey;
        }

        return survey;
      });

      saveSurveys(updatedSurveys);
      return normalizeSurvey({ ...activeSurvey, status: 'active', slug: data?.public_slug || activeSurvey.slug } as Survey);
    } catch (error) {
      console.error('Activate survey in Supabase failed, falling back locally:', error);
    }
  }

  const nextSurveys = setSurveyStatus(getSurveys(), surveyId, 'active');
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
