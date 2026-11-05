import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SurveyCard } from '../components/SurveyCard';
import { duplicateSurvey, getSurveys, saveSurveys, setSurveyStatus } from '../lib/storage';
import type { Survey } from '../lib/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>(() => getSurveys());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Survey['status']>('all');

  const filteredSurveys = useMemo(() => {
    return surveys.filter((survey) => {
      const matchesSearch = survey.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || survey.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, surveys]);

  const updateSurveyList = (nextSurveys: Survey[]) => {
    setSurveys(nextSurveys);
    saveSurveys(nextSurveys);
  };

  const handleNewSurvey = () => {
    const nextSurveys = [...surveys];
    const created: Survey = {
      id: `survey-${Math.random().toString(36).slice(2, 10)}`,
      title: 'New Survey',
      description: '',
      status: 'draft',
      slug: `draft-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [],
    };
    nextSurveys.unshift(created);
    updateSurveyList(nextSurveys);
    navigate(`/surveys/${created.id}/edit`);
  };

  const handleDelete = (surveyId: string) => {
    const confirmed = window.confirm('Delete this survey and all associated responses?');
    if (!confirmed) return;
    const next = surveys.filter((survey) => survey.id !== surveyId);
    updateSurveyList(next);
  };

  const handleArchive = (surveyId: string) => {
    const next = setSurveyStatus(surveys, surveyId, 'archived');
    updateSurveyList(next);
  };

  const handleActivate = (surveyId: string) => {
    const next = setSurveyStatus(surveys, surveyId, 'active');
    updateSurveyList(next);
  };

  const handleClose = (surveyId: string) => {
    const next = setSurveyStatus(surveys, surveyId, 'closed');
    updateSurveyList(next);
  };

  const handleDuplicate = (surveyId: string) => {
    const survey = surveys.find((entry) => entry.id === surveyId);
    if (!survey) return;
    const next = [duplicateSurvey(survey), ...surveys];
    updateSurveyList(next);
    navigate(`/surveys/${next[0].id}/edit`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Classroom Survey</h1>
        </div>
        <button type="button" onClick={handleNewSurvey} className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500">
          + New Survey
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-soft md:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search surveys"
          className="flex-1 rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | Survey['status'])}
          className="rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredSurveys.map((survey) => (
          <SurveyCard
            key={survey.id}
            survey={survey}
            onEdit={() => navigate(`/surveys/${survey.id}/edit`)}
            onActivate={() => handleActivate(survey.id)}
            onDuplicate={() => handleDuplicate(survey.id)}
            onArchive={() => handleArchive(survey.id)}
            onResults={() => navigate(`/surveys/${survey.id}/results`)}
            onDelete={() => handleDelete(survey.id)}
            onPresent={() => navigate(`/surveys/${survey.id}/present`)}
            onClose={() => handleClose(survey.id)}
          />
        ))}
      </div>

      {filteredSurveys.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-soft">
          No surveys match the current filter.
        </div>
      )}
    </div>
  );
}
