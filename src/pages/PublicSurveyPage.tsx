import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSurveyBySlug, submitSurveyResponse } from '../lib/storage';
import { getAnonymousToken } from '../lib/utils';
import type { Survey } from '../lib/types';

export default function PublicSurveyPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSurvey = async () => {
      if (!slug) {
        setSurvey(undefined);
        return;
      }

      const nextSurvey = await fetchSurveyBySlug(slug);
      if (active) {
        setSurvey(nextSurvey);
      }
    };

    void loadSurvey();
    return () => { active = false; };
  }, [slug]);

  if (!survey) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-500">Survey not found or no longer available.</div>;
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-soft">
          <h1 className="text-3xl font-bold text-emerald-800">Thanks for submitting!</h1>
          <p className="mt-3 text-slate-600">Your response has been recorded.</p>
          <button type="button" onClick={() => navigate('/')} className="mt-6 rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-500">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const missing = survey.questions.some((question) => !answers[question.id]);
    if (missing) {
      setError('Please answer every question before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getAnonymousToken();
      const payload = survey.questions.map((question) => {
        const selectedChoice = question.choices.find((choice) => choice.text === answers[question.id]);

        return {
          question_id: question.id,
          choice_id: selectedChoice?.id,
          text_answer: selectedChoice ? undefined : answers[question.id],
        };
      });

      await submitSurveyResponse(survey.id, token, payload);
      setSubmitted(true);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Something went wrong while saving your submission.';
      if (message.toLowerCase().includes('already submitted')) {
        setError('You have already submitted a response for this survey.');
      } else if (message.toLowerCase().includes('survey not found')) {
        setError('Survey not found.');
      } else if (message.toLowerCase().includes('not active') || message.toLowerCase().includes('closed') || message.toLowerCase().includes('unavailable')) {
        setError('This survey is closed and no longer accepting responses.');
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-bold text-slate-900">{survey.title}</h1>
        {survey.description && <p className="mt-2 text-slate-600">{survey.description}</p>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {survey.questions.map((question, index) => (
            <div key={question.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-4 text-lg font-semibold text-slate-800">{index + 1}. {question.text}</p>

              <div className="space-y-3">
                {question.choices.map((choice) => (
                  <label key={choice.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-700 hover:bg-slate-100">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === choice.text}
                      onChange={() => setAnswer(question.id, choice.text)}
                      className="h-5 w-5 text-indigo-600"
                    />
                    <span className="text-base">{choice.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-base font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400">
            {isSubmitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>
      </div>
    </div>
  );
}
