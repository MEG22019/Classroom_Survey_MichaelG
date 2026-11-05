import type { Choice, Question } from './types';

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildCsv(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] ?? '';
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'survey';
}

export function generateUniquePublicSlug(title: string, existingSlugs: string[] = []): string {
  const base = slugify(title || 'survey');
  const suffix = Math.random().toString(36).slice(2, 8);
  const candidate = `${base}-${suffix}`;

  if (!existingSlugs.includes(candidate)) {
    return candidate;
  }

  return generateUniquePublicSlug(`${title}-${Math.random().toString(36).slice(2, 4)}`, existingSlugs);
}

export function makeId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultQuestion(position: number): Question {
  return {
    id: makeId('question'),
    text: '',
    type: 'multiple_choice',
    position,
    choices: [
      { id: makeId('choice'), text: '', position: 1 },
      { id: makeId('choice'), text: '', position: 2 },
    ],
  };
}

export function createDefaultChoice(position: number): Choice {
  return { id: makeId('choice'), text: '', position };
}

export function getPublicSurveyUrl(slug: string): string {
  const base = import.meta.env.VITE_APP_URL || window.location.origin || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/s/${slug}`;
}

export function toQuestionData(question: Question): Record<string, string> {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    choices: question.choices.map((choice) => choice.text).join(' | '),
  };
}

export function getAnonymousToken(): string {
  const existing = localStorage.getItem('classroom-survey-token');
  if (existing) return existing;
  const token = Math.random().toString(36).slice(2, 12);
  localStorage.setItem('classroom-survey-token', token);
  return token;
}
