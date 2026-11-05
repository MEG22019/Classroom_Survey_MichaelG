import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuestionEditor } from '../components/QuestionEditor';
import { activateSurvey, createSurveyRecord, getSurveys, normalizeSurvey, saveSurveys } from '../lib/storage';
import type { Question, Survey } from '../lib/types';
import { createDefaultChoice, createDefaultQuestion } from '../lib/utils';

export default function SurveyEditorPage() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const allSurveys = getSurveys();

    if (surveyId && surveyId !== 'new') {
      const existing = allSurveys.find((entry) => entry.id === surveyId) ?? null;
      setSurvey(existing ? normalizeSurvey(existing) : null);
      return;
    }

    setSurvey(createSurveyRecord('New Survey', ''));
  }, [surveyId]);

  if (!survey) {
    return <div className="p-8 text-center text-slate-500">Survey not found.</div>;
  }

  const isLocked = survey.status === 'active';

  const validateSurvey = (draft: Survey): string[] => {
    if (!draft.title.trim()) {
      return ['Survey title is required.'];
    }

    if (draft.questions.length === 0) {
      return ['Add at least one question before saving.'];
    }

    return draft.questions.flatMap((question) => {
      const messages: string[] = [];
      if (!question.text.trim()) {
        messages.push(`Question ${question.position} requires text.`);
      }

      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        if (question.choices.length < 2) {
          messages.push(`Question ${question.position} needs at least two choices.`);
        }

        question.choices.forEach((choice, index) => {
          if (!choice.text.trim()) {
            messages.push(`Choice ${index + 1} for question ${question.position} is blank.`);
          }
        });
      }

      return messages;
    });
  };

  const updateQuestion = (questionId: string, updatedQuestion: Question) => {
    if (isLocked) {
      setError('This survey is active. Close it before making changes.');
      return;
    }

    const nextQuestions = survey.questions.map((question) =>
      question.id === questionId ? { ...updatedQuestion, position: question.position } : question,
    );
    setSurvey({ ...survey, questions: nextQuestions, updatedAt: new Date().toISOString() });
    setError('');
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    if (isLocked) return;
    const index = survey.questions.findIndex((question) => question.id === questionId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= survey.questions.length) return;

    const nextQuestions = [...survey.questions];
    [nextQuestions[index], nextQuestions[targetIndex]] = [nextQuestions[targetIndex], nextQuestions[index]];
    setSurvey({
      ...survey,
      questions: nextQuestions.map((question, questionIndex) => ({ ...question, position: questionIndex + 1 })),
      updatedAt: new Date().toISOString(),
    });
  };

  const addQuestion = () => {
    if (isLocked) {
      setError('This survey is active and cannot be edited.');
      return;
    }

    const newQuestion = createDefaultQuestion(survey.questions.length + 1);
    setSurvey({ ...survey, questions: [...survey.questions, newQuestion] });
  };

  const removeQuestion = (questionId: string) => {
    if (isLocked) {
      setError('This survey is active and cannot be edited.');
      return;
    }

    const confirmed = window.confirm('Remove this question?');
    if (!confirmed) return;

    setSurvey({
      ...survey,
      questions: survey.questions.filter((question) => question.id !== questionId).map((question, index) => ({ ...question, position: index + 1 })),
    });
  };

  const addChoice = (questionId: string) => {
    if (isLocked) return;
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
    if (isLocked) return;
    const question = survey.questions.find((entry) => entry.id === questionId);
    if (!question || question.choices.length <= 2) {
      setError('Each question must keep at least two answer choices.');
      return;
    }

    const nextQuestions = survey.questions.map((entry) => {
      if (entry.id !== questionId) return entry;
      return {
        ...entry,
        choices: entry.choices.filter((choice) => choice.id !== choiceId).map((choice, index) => ({ ...choice, position: index + 1 })),
      };
    });

    setSurvey({ ...survey, questions: nextQuestions });
  };

  const moveChoice = (questionId: string, choiceId: string, direction: 'up' | 'down') => {
    if (isLocked) return;
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

  const handleSave = async (nextStatus: Survey['status'] = 'draft') => {
    if (isLocked && nextStatus !== 'closed') {
      setError('This survey is active and locked. Close it before editing.');
      return;
    }

    const validationErrors = validateSurvey(survey);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const normalized = normalizeSurvey({ ...survey, status: nextStatus, updatedAt: new Date().toISOString() });
      const allSurveys = getSurveys();
      const nextSurveys = allSurveys.some((item) => item.id === normalized.id)
        ? allSurveys.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...allSurveys];

      saveSurveys(nextSurveys);

      if (nextStatus === 'active') {
        const activated = await activateSurvey(normalized.id);
        setSurvey(activated);
        navigate(`/surveys/${activated.id}/present`);
        return;
      }

      navigate('/dashboard');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save survey.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Survey Editor</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{survey.title || 'Untitled Survey'}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave('draft')}
            disabled={isSaving || isLocked}
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave('active')}
            disabled={isSaving || isLocked}
            className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            Activate
          </button>
        </div>
      </div>

      {isLocked && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This survey is active. Close it before editing or save a new draft.
        </div>
      )}

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Survey title</label>
          <input
            value={survey.title}
            onChange={(event) => setSurvey({ ...survey, title: event.target.value })}
            disabled={isLocked}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="Survey Title"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={survey.description}
            onChange={(event) => setSurvey({ ...survey, description: event.target.value })}
            rows={3}
            disabled={isLocked}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="Optional description"
          />
        </div>

        <div className="space-y-4">
          {survey.questions.map((question, index) => (
            <div key={question.id} className="space-y-2">
              <div className="flex justify-end gap-2">
                <button type="button" disabled={isLocked || index === 0} onClick={() => moveQuestion(question.id, 'up')} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">↑</button>
                <button type="button" disabled={isLocked || index === survey.questions.length - 1} onClick={() => moveQuestion(question.id, 'down')} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">↓</button>
              </div>
              <QuestionEditor
                question={question}
                disabled={isLocked}
                onChange={(updated) => updateQuestion(question.id, updated)}
                onDelete={() => removeQuestion(question.id)}
                onAddChoice={() => addChoice(question.id)}
                onRemoveChoice={(choiceId) => removeChoice(question.id, choiceId)}
                onMoveChoice={(choiceId, direction) => moveChoice(question.id, choiceId, direction)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          disabled={isLocked}
          className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Add Question
        </button>
      </div>
    </div>
  );
}
