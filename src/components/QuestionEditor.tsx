import type { Question } from '../lib/types';
import { createDefaultChoice } from '../lib/utils';

interface QuestionEditorProps {
  question: Question;
  disabled?: boolean;
  onChange: (updatedQuestion: Question) => void;
  onDelete: () => void;
  onAddChoice: () => void;
  onRemoveChoice: (choiceId: string) => void;
  onMoveChoice: (choiceId: string, direction: 'up' | 'down') => void;
}

export function QuestionEditor({
  question,
  disabled = false,
  onChange,
  onDelete,
  onAddChoice,
  onRemoveChoice,
  onMoveChoice,
}: QuestionEditorProps) {
  const updateQuestion = (partial: Partial<Question>) => {
    onChange({ ...question, ...partial });
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as Question['type'];
    const choices = nextType === 'true_false'
      ? [
          { id: `choice-${Math.random().toString(36).slice(2, 9)}`, text: 'True', position: 1 },
          { id: `choice-${Math.random().toString(36).slice(2, 9)}`, text: 'False', position: 2 },
        ]
      : question.choices.length
        ? question.choices
        : [createDefaultChoice(1), createDefaultChoice(2)];

    onChange({ ...question, type: nextType, choices });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">Question {question.position}</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete Question
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Question text</span>
        <textarea
          value={question.text}
          onChange={(event) => updateQuestion({ text: event.target.value })}
          rows={3}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 shadow-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Type your question here"
        />
      </label>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700">Question type</label>
        <select
          value={question.type}
          onChange={handleTypeChange}
          disabled={disabled}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 shadow-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True / False</option>
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Choices</p>
        <div className="space-y-2">
          {question.choices.map((choice, index) => (
            <div key={choice.id} className="flex items-center gap-2">
              <input
                value={choice.text}
                onChange={(event) => {
                  const updatedChoices = question.choices.map((item) =>
                    item.id === choice.id ? { ...item, text: event.target.value } : item,
                  );
                  onChange({ ...question, choices: updatedChoices });
                }}
                disabled={disabled}
                className="flex-1 rounded-lg border border-slate-300 bg-white p-3 text-slate-900 shadow-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder={`Choice ${index + 1}`}
              />
              <button type="button" disabled={disabled || index === 0} onClick={() => onMoveChoice(choice.id, 'up')} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                ↑
              </button>
              <button type="button" disabled={disabled || index === question.choices.length - 1} onClick={() => onMoveChoice(choice.id, 'down')} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                ↓
              </button>
              <button type="button" disabled={disabled || question.choices.length <= 2} onClick={() => onRemoveChoice(choice.id)} className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                Remove
              </button>
            </div>
          ))}
        </div>

        <button type="button" disabled={disabled} onClick={onAddChoice} className="mt-3 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500">
          + Add Choice
        </button>
      </div>
    </div>
  );
}
