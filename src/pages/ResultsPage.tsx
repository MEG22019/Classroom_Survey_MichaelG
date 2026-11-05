import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { getSurveyById, getSubmissionsForSurvey } from '../lib/storage';
import type { Survey } from '../lib/types';
import { buildCsv } from '../lib/utils';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const survey = getSurveyById(surveyId ?? '');

  if (!survey) return <div className="p-8 text-center text-slate-500">Survey not found.</div>;

  const allSubmissions = getSubmissionsForSurvey(survey.id);
  const questionSummaries = survey.questions.map((question) => {
    const counts = question.choices.map((choice) => {
      const count = allSubmissions.filter((submission) =>
        submission.answers.some((answer) => answer.questionId === question.id && answer.choiceId === choice.id),
      ).length;
      return {
        name: choice.text,
        count,
      };
    });

    return { question, counts };
  });

  const handleExportCsv = () => {
    const rows = allSubmissions.flatMap((submission) => {
      const row: Record<string, string> = {
        submittedAt: submission.submittedAt,
        anonymousToken: submission.token,
      };

      survey.questions.forEach((question) => {
        const answer = submission.answers.find((entry) => entry.questionId === question.id);
        const choiceText = question.choices.find((choice) => choice.id === answer?.choiceId)?.text ?? '';
        row[question.text] = choiceText || answer?.textAnswer || 'No answer';
      });

      return [row];
    });

    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey.slug || 'survey'}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Results</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{survey.title}</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleExportCsv} className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500">
            Export CSV
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100">
            Dashboard
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-2xl font-bold text-slate-900">{allSubmissions.length}</p>
        <p className="text-sm text-slate-500">Total responses</p>
      </div>

      <div className="space-y-8">
        {questionSummaries.map(({ question, counts }) => (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">{question.text || 'Untitled question'}</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counts} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
