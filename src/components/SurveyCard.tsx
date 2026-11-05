import type { Survey } from '../lib/types';
import { formatDate } from '../lib/utils';

interface SurveyCardProps {
  survey: Survey;
  onEdit: () => void;
  onActivate: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onResults: () => void;
  onDelete: () => void;
  onPresent: () => void;
  onClose: () => void;
}

const statusClasses: Record<Survey['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-amber-100 text-amber-700',
  archived: 'bg-violet-100 text-violet-700',
};

export function SurveyCard({
  survey,
  onEdit,
  onActivate,
  onDuplicate,
  onArchive,
  onResults,
  onDelete,
  onPresent,
  onClose,
}: SurveyCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{survey.title}</h3>
          <p className="mt-1 text-sm text-slate-500">Created {formatDate(survey.createdAt)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[survey.status]}`}>
          {survey.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {survey.status !== 'active' && (
          <button type="button" onClick={onActivate} className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500">
            Activate
          </button>
        )}
        {survey.status === 'active' && (
          <button type="button" onClick={onPresent} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500">
            Present
          </button>
        )}
        {survey.status === 'active' && (
          <button type="button" onClick={onClose} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100">
            Close
          </button>
        )}
        <button type="button" onClick={onEdit} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
          Edit
        </button>
        <button type="button" onClick={onDuplicate} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
          Duplicate
        </button>
        <button type="button" onClick={onResults} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
          Results
        </button>
        <button type="button" onClick={onArchive} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
          Archive
        </button>
        <button type="button" onClick={onDelete} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">
          Delete
        </button>
      </div>
    </div>
  );
}
