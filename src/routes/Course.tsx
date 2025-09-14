import { useEffect, useState } from "react";

type LessonRef = { id: string; title: string };
type UnitRef = { id: string; title: string; lessons: LessonRef[] };
type SectionRef = { id: string; title: string; units: UnitRef[] };
type Manifest = { id: string; title: string; sections: SectionRef[] };

async function tryFetch(path: string) {
  const res = await fetch(path).catch(() => null);
  if (res && res.ok) return res.json();
  return null;
}

export default function Course() {
  const [manifest, setManifest] = useState<Manifest | null>(null);

  useEffect(() => {
    (async () => {
      const p1 = "/src/content/sinhala/manifest.json";
      const p2 = "/content/sinhala/manifest.json";
      const json = (await tryFetch(p1)) ?? (await tryFetch(p2));
      setManifest(json);
    })();
  }, []);

  if (!manifest) return <div className="p-6">Loading course…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{manifest.title}</h1>
      {manifest.sections.map(sec => (
        <div key={sec.id} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{sec.title}</h2>
          {sec.units.map(u => (
            <div key={u.id} className="mb-3 border rounded p-3">
              <div className="font-medium mb-2">{u.title}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {u.lessons.map(l => (
                  <a
                    key={l.id}
                    className="px-3 py-2 rounded border hover:bg-gray-50"
                    href={`/course/sinhala/${sec.id}/${u.id}/${l.id}`}
                  >
                    {l.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
