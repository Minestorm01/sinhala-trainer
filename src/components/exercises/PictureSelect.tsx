import { useState } from "react";
import type { PictureSelect as T } from "../../engine/schema";

export default function PictureSelect({ data, onCorrect, onNext }: {
  data: T; onCorrect: () => void; onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState<null | boolean>(null);

  const choose = (i: number) => {
    if (done !== null) return;
    setPicked(i);
    const ok = Boolean(data.options[i]?.correct);
    setDone(ok);
    if (ok) onCorrect();
  };

  return (
    <div>
      <p className="mb-3">Select the image for: <span className="font-semibold">{data.word}</span></p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.options.map((o, i) => {
          const selected = picked === i;
          const border =
            done === null ? "border-gray-200" :
            (selected && data.options[i].correct) ? "border-green-500" :
            (selected && !data.options[i].correct) ? "border-red-500" : "border-gray-200";

          return (
            <button key={i} onClick={() => choose(i)} className={`rounded overflow-hidden border ${selected ? "ring-2 ring-blue-400" : ""}`}>
              <img src={o.img} alt={o.label} className="w-full h-28 object-cover" />
              <div className={`p-2 border-t ${border}`}><span className="text-sm">{o.label}</span></div>
            </button>
          );
        })}
      </div>
      {done !== null && (
        <div className="mt-4">
          <button onClick={onNext} className="px-4 py-2 rounded bg-green-600 text-white">
            {done ? "Correct — Next" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
