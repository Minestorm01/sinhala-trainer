import { useEffect, useMemo, useRef, useState } from "react";
import type { Speak as T } from "../../engine/schema";

declare global {
  interface Window { webkitSpeechRecognition?: any; SpeechRecognition?: any; }
}

export default function Speak({ data, onCorrect, onNext }: {
  data: T; onCorrect: () => void; onNext: () => void;
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string>("");
  const [done, setDone] = useState<null | boolean>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  const target = useMemo(() => normalize(data.phrase), [data.phrase]);
  const threshold = data.tolerance ?? 0.8;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "si-LK";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const txt = (e.results?.[0]?.[0]?.transcript ?? "").toString();
      setHeard(txt);
      const score = similarity(normalize(txt), target);
      const ok = score >= threshold;
      setDone(ok);
      if (ok) onCorrect();
      setListening(false);
      setError(null);
    };
    rec.onerror = (event: any) => {
      setListening(false);
      const type = event?.error;
      if (type === "not-allowed") setError("Microphone permission was denied. Please allow access and try again.");
      else if (type === "no-speech") setError("No speech was detected. Please try speaking again.");
      else if (type === "audio-capture") setError("No microphone was found. Check your audio input device.");
      else setError("Speech recognition encountered an error. Please try again.");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, [target, threshold, onCorrect]);

  const start = () => {
    if (!recRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setDone(null); setHeard(""); setError(null); setListening(true);
    try {
      recRef.current.start();
    } catch (err: any) {
      setListening(false);
      setError(err?.message ?? "Unable to start speech recognition.");
    }
  };

  return (
    <div>
      <p className="mb-2">Say this in Sinhala:</p>
      <p className="mb-4 text-lg font-semibold">{data.phrase}</p>
      <button onClick={start} className={`px-4 py-2 rounded border ${listening ? "bg-red-50 border-red-300" : ""}`} disabled={listening}>
        {listening ? "Listening…" : "Start"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {heard && <div className="mt-3 text-sm"><span className="opacity-60">Heard: </span><span>{heard}</span></div>}
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

function normalize(s: string) { return s.toLowerCase().trim().replace(/\s+/g, " "); }

function similarity(a: string, b: string) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = lev(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - d / maxLen;
}
function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
  }
  return dp[m][n];
}
