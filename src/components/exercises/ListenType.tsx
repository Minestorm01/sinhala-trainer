import { useEffect, useRef, useState } from "react";
import type { TypeHear as T } from "../../engine/schema";
import { playAudio } from "../../engine/audio";

export default function ListenType({ data, onCorrect, onNext }: {
  data: T; onCorrect: () => void; onNext: () => void;
}) {
  const [val, setVal] = useState("");
  const [done, setDone] = useState<null | boolean>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (data.audioSrc) playAudio(data.audioSrc, audioRef as any);
  }, [data.audioSrc]);

  const check = () => {
    const ok = normalize(val) === normalize(data.solution);
    setDone(ok);
    if (ok) onCorrect();
  };

  return (
    <div>
      {data.prompt && <p className="mb-2">{data.prompt}</p>}
      {data.audioSrc ? (
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => playAudio(data.audioSrc!, audioRef as any)} className="px-3 py-2 rounded border">▶︎ Play</button>
          <audio ref={audioRef as any} src={data.audioSrc} />
        </div>
      ) : <p className="mb-3 text-sm text-gray-600">No audio provided.</p>}

      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-full border rounded p-2 mb-3"
        placeholder="Type what you heard…"
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

function normalize(s: string) { return s.toLowerCase().trim().replace(/\s+/g, " "); }
