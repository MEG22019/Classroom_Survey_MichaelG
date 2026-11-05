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

export function getSurveys(): Survey[] {
  const raw = localStorage.getItem(SURVEYS_KEY);
  if (!raw) {
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(seedSurveys));
    return [...seedSurveys];
  }

  try {
    const parsed = JSON.parse(raw) as Survey[];
    return Array.isArray(parsed) && parsed.length ? parsed : [...seedSurveys];
  } catch {
    return [...seedSurveys];
  }
}

export function saveSurveys(surveys: Survey[]) {
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
}

export function createSurveyRecord(title: string, description: string): Survey {
  const now = new Date().toISOString();
  return {
    id: `survey-${Math.random().toString(36).slice(2, 10)}`,
    title: title.trim() || 'Untitled Survey',
    description: description.trim(),
    status: 'draft',
    slug: `draft-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    questions: [createDefaultQuestion(1)],
  };
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
  return {
    id: `survey-${Math.random().toString(36).slice(2, 10)}`,
    title: `Copy of ${survey.title}`,
    description: survey.description,
    status: 'draft',
    slug: `draft-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    questions: clonedQuestions,
  };
}
