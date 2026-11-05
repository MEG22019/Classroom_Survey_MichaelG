import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuestionEditor } from '../components/QuestionEditor';
import { createSurveyRecord, getSurveys, saveSurveys, setSurveyStatus } from '../lib/storage';
import type { Question, Survey } from '../lib/types';
import { createDefaultChoice, createDefaultQuestion, makeId } from '../lib/utils';

export default function SurveyEditorPage() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const surveys = getSurveys();
  const existingSurvey = surveys.find((survey) => survey.id === surveyId);
  const [survey, setSurvey] = useState<Survey>(() => {
    if (existingSurvey) return existingSurvey;
    return createSurveyRecord('New Survey', '');
  });

  const handleSave = (nextStatus: Survey['status'] = 'draft') => {
    const nextSurveys = existingSurvey ? surveys.map((item) => (item.id === survey.id ? survey : item)) : [survey, ...surveys];
    const finalSurvey: Survey = {
      ...survey,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      questions: survey.questions.map((question, index) => ({ ...question, position: index + 1, choices: question.choices.map((choice, choiceIndex) => ({ ...choice, position: choiceIndex + 1 })) })),
    };
    const finalSurveys = existingSurvey
      ? nextSurveys.map((item) => (item.id === finalSurvey.id ? finalSurvey : item))
      : [finalSurvey, ...surveys];
    saveSurveys(finalSurveys);
    if (nextStatus === 'active') {
      const activated = setSurveyStatus(finalSurveys, finalSurvey.id, 'active');
      saveSurveys(activated);
      navigate(`/surveys/${finalSurvey.id}/present`);
      return;
    }
    navigate('/dashboard');
  };

  const updateQuestion = (questionId: string, updatedQuestion: Question) => {
    const nextQuestions = survey.questions.map((question) =>
      question.id === questionId ? { ...updatedQuestion, position: question.position } : question,
    );
    setSurvey({ ...survey, questions: nextQuestions, updatedAt: new Date().toISOString() });
  };

  const addQuestion = () => {
    const newQuestion = createDefaultQuestion(survey.questions.length + 1);
    setSurvey({ ...survey, questions: [...survey.questions, newQuestion] });
  };

  const removeQuestion = (questionId: string) => {
    setSurvey({
      ...survey,
      questions: survey.questions.filter((question) => question.id !== questionId).map((question, index) => ({ ...question, position: index + 1 })),
    });
  };

  const addChoice = (questionId: string) => {
    const nextQuestions = survey.questions.map((question) => {
      if (question.id !== questionId) return question;
      return {
        ...question,
        choices: [...question.choices, createDefaultChoice(question.choices.length + 1)],
      };
    });
    setSurvey({ ...survey, questions: nextQuestions });
  };

  const removeChoice = (questionId: string, choiceId: string) => {
    const nextQuestions = survey.questions.map((question) => {
      if (question.id !== questionId) return question;
      return {
        ...question,
        choices: question.choices.filter((choice) => choice.id !== choiceId).map((choice, index) => ({ ...choice, position: index + 1 })),
      };
    });
    setSurvey({ ...survey, questions: nextQuestions });
  };

  const moveChoice = (questionId: string, choiceId: string, direction: 'up' | 'down') => {
    const nextQuestions = survey.questions.map((question) => {
      if (question.id !== questionId) return question;
      const index = question.choices.findIndex((choice) => choice.id === choiceId);
      if (index < 0) return question;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= question.choices.length) return question;
      const nextChoices = [...question.choices];
      [nextChoices[index], nextChoices[targetIndex]] = [nextChoices[targetIndex], nextChoices[index]];
      return { ...question, choices: nextChoices.map((choice, choiceIndex) => ({ ...choice, position: choiceIndex + 1 })) };
    });
    setSurvey({ ...survey, questions: nextQuestions });
  };

  const isActiveLocked = survey.status === 'active';

  if (!existingSurvey && surveyId !== 'new') {
    return <div className="p-8 text-center text-slate-500">Survey not found.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Survey Editor</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{survey.title || 'Untitled Survey'}</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSave('draft')} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100">
            Save Draft
          </button>
          <button type="button" onClick={() => handleSave('active')} className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500">
            Activate
          </button>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Survey title</label>
          <input
            value={survey.title}
            onChange={(event) => setSurvey({ ...survey, title: event.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500"
            placeholder="Survey Title"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={survey.description}
            onChange={(event) => setSurvey({ ...survey, description: event.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500"
            placeholder="Optional description"
          />
        </div>

        <div className="space-y-4">
          {survey.questions.map((question) => (
            <QuestionEditor
              key={question.id}
              question={question}
              onChange={(updated) => updateQuestion(question.id, updated)}
              onDelete={() => removeQuestion(question.id)}
              onAddChoice={() => addChoice(question.id)}
              onRemoveChoice={(choiceId) => removeChoice(question.id, choiceId)}
              onMoveChoice={(choiceId, direction) => moveChoice(question.id, choiceId, direction)}
            />
          ))}
        </div>

        <button type="button" onClick={addQuestion} className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-700 hover:bg-slate-100">
          + Add Question
        </button>
      </div>
    </div>
  );
}
