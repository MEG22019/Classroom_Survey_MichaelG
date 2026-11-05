import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getInstructorSurveyHistory, getSurveyResultsSummary } from '../lib/storage';
import type { Survey, SurveyResultsSummary, SurveyStatus } from '../lib/types';
import { escapeCsvCell } from '../lib/utils';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(surveyId ?? '');
  const [summary, setSummary] = useState<SurveyResultsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SurveyStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getInstructorSurveyHistory();
        setSurveys(history);
        if (history.length === 0) {
          setSelectedSurveyId('');
          setSummary(null);
          return;
        }

        const nextSelected = surveyId && history.some((survey) => survey.id === surveyId) ? surveyId : history[0].id;
        setSelectedSurveyId(nextSelected);
      } catch {
        setError('Unable to load survey history.');
      }
    };

    void loadHistory();
  }, [surveyId]);

  useEffect(() => {
    if (!selectedSurveyId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadResults = async () => {
      setLoading(true);
      setError('');

      try {
        const nextSummary = await getSurveyResultsSummary(selectedSurveyId);
        if (!cancelled) {
          setSummary(nextSummary);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load results.');
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadResults();
    return () => { cancelled = true; };
  }, [selectedSurveyId]);

  const filteredSurveys = useMemo(() => {
    return statusFilter === 'all'
      ? surveys
      : surveys.filter((survey) => survey.status === statusFilter);
  }, [statusFilter, surveys]);

  const selectedSurvey = filteredSurveys.find((survey) => survey.id === selectedSurveyId)
    ?? surveys.find((survey) => survey.id === selectedSurveyId)
    ?? null;

  const handleExportCsv = () => {
    if (!summary) return;

    const headers = ['response_id', 'submitted_at', ...summary.questions.map((question) => question.questionText || 'Untitled question')];
    const dataRows = summary.submissions.map((submission) => [
      submission.id,
      submission.submittedAt,
      ...summary.questions.map((question) => {
        const answer = submission.answers.find((entry) => entry.questionId === question.questionId);
        const choiceText = question.choices.find((choice) => choice.choiceId === answer?.choiceId)?.choiceText ?? '';
        return choiceText || answer?.textAnswer || 'No answer';
      }),
    ]);

    const metadataRows = [
      ['survey_id', summary.surveyId],
      ['survey_title', summary.surveyTitle],
      ['survey_status', summary.surveyStatus],
      ['public_slug', summary.publicSlug],
      ['response_count', summary.totalResponses],
      [''],
    ];

    const csv = [...metadataRows, headers, ...dataRows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${summary.publicSlug || 'survey'}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    if (!selectedSurveyId) return;
    setLoading(true);
    try {
      const nextSummary = await getSurveyResultsSummary(selectedSurveyId);
      setSummary(nextSummary);
      setError('');
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh the results.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Results</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{selectedSurvey?.title ?? 'Survey results'}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleRefresh} disabled={loading || !selectedSurveyId} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Refreshing...' : 'Refresh Results'}
          </button>
          <button type="button" onClick={handleExportCsv} disabled={!summary || summary.totalResponses === 0} className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400">
            Export CSV
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100">
            Dashboard
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft md:flex-row md:items-center">
        <select
          value={selectedSurveyId}
          onChange={(event) => setSelectedSurveyId(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500"
        >
          {filteredSurveys.length === 0 ? <option value="">No surveys available</option> : filteredSurveys.map((survey) => (
            <option key={survey.id} value={survey.id}>{survey.title}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | SurveyStatus)}
          className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-soft">Loading survey results...</div>
      ) : summary ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Responses</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalResponses}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Status</p>
              <p className="mt-3 text-2xl font-bold capitalize text-slate-900">{summary.surveyStatus}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public URL</p>
              <p className="mt-3 text-sm break-all font-medium text-slate-700">{summary.publicSlug ? `/s/${summary.publicSlug}` : 'Not active'}</p>
            </div>
          </div>

          {summary.totalResponses === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-soft">
              No responses have been submitted for this survey yet.
            </div>
          ) : (
            <div className="space-y-8">
              {summary.questions.map((question) => (
                <div key={question.questionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">{question.questionText || 'Untitled question'}</h2>
                    {question.unanswered > 0 && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {question.unanswered} unanswered
                      </span>
                    )}
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={question.choices.map((choice) => ({ name: choice.choiceText, count: choice.count, percentage: Number(choice.percentage.toFixed(1)) }))} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value: number) => [`${value} responses`, 'Count']} />
                        <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 space-y-2">
                    {question.choices.map((choice) => (
                      <div key={choice.choiceId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-sm text-slate-700">{choice.choiceText}</span>
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <span>{choice.count}</span>
                          <span className="text-slate-500">({Number(choice.percentage).toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-soft">
          Select a survey to view its results.
        </div>
      )}
    </div>
  );
}
