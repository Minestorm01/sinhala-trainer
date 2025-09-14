import { useEffect, useMemo, useState } from "react";
import type { MatchPairs as T } from "../../engine/schema";
import { shuffle } from "../../lib/shuffle";

type Card = { id: string; label: string; side: "si" | "en" };

export default function MatchPairs({ data, onCorrect, onNext }: {
  data: T; onCorrect: () => void; onNext: () => void;
}) {
  const cards = useMemo<Card[]>(() => {
    const left: Card[] = data.pairs.map((p, i) => ({ id: `L${i}`, label: p.si, side: "si" }));
    const right: Card[] = data.pairs.map((p, i) => ({ id: `R${i}`, label: p.en, side: "en" }));
    return shuffle([...left, ...right]);
  }, [data.pairs]);

  const [open, setOpen] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const isPair = (a: string, b: string) => {
    const ai = parseInt(a.slice(1), 10);
    const bi = parseInt(b.slice(1), 10);
    return ai === bi && a[0] !== b[0];
  };

  const click = (id: string) => {
    if (done || matched.has(id) || open === id) return;
    if (!open) { setOpen(id); return; }
    if (isPair(open, id)) setMatched(prev => new Set([...prev, open!, id]));
    setOpen(null);
  };

  useEffect(() => {
    if (matched.size === cards.length && cards.length > 0) {
      setDone(true);
      onCorrect();
    }
  }, [matched, cards.length, onCorrect]);

  return (
    <div>
      {data.prompt && <p className="mb-3">{data.prompt}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cards.map(c => {
          const active = open === c.id;
          const isMatched = matched.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => click(c.id)}
              className={`p-3 border rounded text-left
                ${isMatched ? "bg-green-100 border-green-300" :
                active ? "bg-blue-50 border-blue-300" : "bg-white"}`}
              disabled={isMatched || done}
            >
              <span className="block text-sm opacity-60">{c.side === "si" ? "සිංහල" : "EN"}</span>
              <span className="block text-lg">{c.label}</span>
            </button>
          );
        })}
      </div>
      {done && (
        <div className="mt-4">
          <button onClick={onNext} className="px-4 py-2 rounded bg-green-600 text-white">
            Correct — Next
          </button>
        </div>
      )}
    </div>
  );
}
