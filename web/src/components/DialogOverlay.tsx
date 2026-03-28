import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export default function DialogOverlay() {
  const dialog = useSimulationStore((s) => s.dialog);
  const dismissDialog = useSimulationStore((s) => s.dismissDialog);
  const [inputValue, setInputValue] = useState('');

  if (!dialog) return null;

  const handleSubmit = () => {
    if (dialog.type === 'query') {
      dismissDialog(inputValue);
      setInputValue('');
    } else if (dialog.type === 'confirm') {
      dismissDialog('ok');
    } else {
      dismissDialog();
    }
  };

  const handleCancel = () => {
    dismissDialog(undefined);
    setInputValue('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-96 shadow-xl">
        <pre className="text-white text-sm whitespace-pre-wrap mb-4 max-h-60 overflow-auto">
          {dialog.text}
        </pre>

        {dialog.type === 'query' && (
          <input
            type="text"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full mb-4 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            autoFocus={dialog.type !== 'query'}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium"
          >
            OK
          </button>
          {(dialog.type === 'query' || dialog.type === 'confirm') && (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
