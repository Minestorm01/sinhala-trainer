import { useState } from "react";
import type { TranslateToEN, TranslateToSI } from "../../engine/schema";

export default function Translate({
  mode, data, onCorrect, onNext
}: {
  mode: "to-en" | "to-si";
  data: TranslateToEN | TranslateToSI;
  onCorrect: () => void; onNext: () => void;
}) {
  const [val, setVal] = useState("");
  const [done, setDone] = useState<null | boolean>(null);
  const solution = (data as any).solution.trim();

  const check = () => {
    const ok = normalize(val) === normalize(solution);
    setDone(ok);
    if (ok) onCorrect();
  };

  return (
    <div>
      <p className="mb-2 text-lg font-medium">{(data as any).source}</p>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-full border rounded p-2 mb-3"
        placeholder={mode === "to-en" ? "Type in English…" : "සිංහලෙන් ලියන්න…"}
      />
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

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}
