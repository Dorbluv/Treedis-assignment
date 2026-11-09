import { useState } from 'react';
import { CheckMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import type { RetrievalResult, SavedPlan } from '../domain/types';
import { saveFinding } from '../storage/plans';
import { outcomeOptions, time } from './format';

export function FindingScreen({ result, saved }: { result: RetrievalResult; saved: SavedPlan }) {
  const { asset } = result;
  const [outcome, setOutcome] = useState<string | null>(saved.finding?.outcome ?? null);
  const [note, setNote] = useState(saved.finding?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const options = outcomeOptions(result);
  const suggestions = options.find((option) => option.key === outcome)?.suggestions ?? [];

  function insert(suggestion: string) {
    setNote((current) => {
      const text = current.trim();
      if (text.includes(suggestion)) return current;
      return text ? `${text}. ${suggestion}` : suggestion;
    });
  }

  function handleSave() {
    if (!outcome) return;
    try {
      saveFinding(asset.id, {
        outcome,
        note: note.trim() || undefined,
        savedAt: new Date().toISOString(),
      });
      window.location.hash = `#/asset/${asset.id}/done`;
    } catch {
      setError('Could not save on this device. Check that browser storage is allowed.');
    }
  }

  return (
    <Screen action={<PrimaryAction label="Save finding" onClick={handleSave} disabled={!outcome} />}>
      <p className="confirm" role="status"><CheckMark /> <strong>Plan saved</strong> <span className="num">{time(saved.savedAt)}</span></p>
      <h1>Record finding</h1>
      <div className="outcomes" role="group" aria-label="Finding outcome">
        {options.map((option) => (
          <button
            type="button"
            key={option.key}
            className="outcome"
            aria-pressed={outcome === option.key}
            onClick={() => setOutcome(option.key)}
          >
            {outcome === option.key && <CheckMark />}
            {option.label}
          </button>
        ))}
      </div>
      <div className="note">
        <textarea
          rows={2}
          aria-label="Note (optional)"
          placeholder="Add a note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="chips" role="group" aria-label="Note suggestions">
            {suggestions.map((suggestion) => (
              <button type="button" className="chip" key={suggestion} onClick={() => insert(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </Screen>
  );
}
