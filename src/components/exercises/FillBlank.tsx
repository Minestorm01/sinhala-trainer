import { useState } from "react";
import type { FillBlank as T } from "../../engine/schema";

export default function FillBlank({ data, onCorrect, onNext }: {
  data: T; onCorrect: () => void; onNext: () => void;
}) {
  const [val, setVal] = useState("");
  const [done, setDone] = useState<null | boolean>(null);

  const check = () => {
    const ok = normalize(val) === normalize(data.solution);
    setDone(ok);
    if (ok) onCorrect();
  };

  return (
    <div>
      {data.prompt && <p className="mb-2">{data.prompt}</p>}
      <p className="mb-3 text-lg">{data.sentence.replace("___", "_____")}</p>
      {data.options && data.options.length ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {data.options.map(o => (
            <button key={o} onClick={() => setVal(o)} className={`px-3 py-2 rounded border ${val === o ? "bg-blue-50" : "bg-white"}`} disabled={done !== null}>{o}</button>
          ))}
        </div>
      ) : (
        <input value={val} onChange={e => setVal(e.target.value)} className="w-full border rounded p-2 mb-3" placeholder="Type the missing word…" />
      )}
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

function normalize(s: string) { return s.toLowerCase().trim().replace(/\s+/g, " "); }
