import { useMemo, useState } from "react";
import type { TapTiles as T } from "../../engine/schema";
import { shuffle } from "../../lib/shuffle";

export default function TapTiles({ data, onCorrect, onNext }: {
  data: T; onCorrect: () => void; onNext: () => void;
}) {
  const bank = useMemo(() => {
    if (data.tiles && data.tiles.length) return shuffle(data.tiles.slice());
    const tiles = data.solution.split(/\s+/);
    const extra = data.distractors ?? [];
    return shuffle([...tiles, ...extra]);
  }, [data]);

  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState<null | boolean>(null);

  const pick = (t: string) => {
    if (done !== null) return;
    if (picked.includes(t)) return;
    setPicked(p => [...p, t]);
  };

  const check = () => {
    const candidate = picked.join(" ").trim();
    const ok = candidate === data.solution.trim();
    setDone(ok);
    if (ok) onCorrect();
  };

  return (
    <div>
      {data.translation && <p className="mb-2 text-sm text-gray-600">Hint: {data.translation}</p>}
      <div className="min-h-[56px] border rounded p-2 mb-3">
        {picked.map((t, i) => (
          <span key={i} className="inline-block px-2 py-1 m-1 rounded bg-blue-100">{t}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {bank.map((t, i) => (
          <button
            key={i}
            onClick={() => pick(t)}
            className="px-3 py-2 rounded border hover:bg-gray-50"
            disabled={picked.includes(t) || done !== null}
          >
            {t}
          </button>
        ))}
      </div>
      {done === null ? (
        <button onClick={check} className="px-4 py-2 rounded bg-black text-white">Check</button>
      ) : (
        <button onClick={onNext} className="px-4 py-2 rounded bg-green-600 text-white">
          {done ? "Correct — Next" : "Next"}
        </button>
      )}
    </div>
  );
}
