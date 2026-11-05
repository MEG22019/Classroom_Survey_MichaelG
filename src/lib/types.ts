export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type QuestionType = 'multiple_choice' | 'true_false';

export interface Choice {
  id: string;
  text: string;
  position: number;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  position: number;
  choices: Choice[];
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  slug: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface SurveySubmission {
  id: string;
  surveyId: string;
  token: string;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    choiceId?: string;
    textAnswer?: string;
  }>;
}

export interface SurveyChoiceResult {
  choiceId: string;
  choiceText: string;
  count: number;
  percentage: number;
}

export interface SurveyQuestionResult {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  totalResponses: number;
  unanswered: number;
  choices: SurveyChoiceResult[];
}

export interface SurveyResultsSummary {
  surveyId: string;
  surveyTitle: string;
  surveyStatus: SurveyStatus;
  publicSlug: string;
  totalResponses: number;
  questions: SurveyQuestionResult[];
  submissions: SurveySubmission[];
}
