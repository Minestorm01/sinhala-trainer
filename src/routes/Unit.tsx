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

// URL: /course/sinhala/section-01/unit-01
export default function Unit() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const sectionId = parts[2];
  const unitId = parts[3];
  const [unit, setUnit] = useState<UnitRef | null>(null);

  useEffect(() => {
    (async () => {
      const p1 = "/src/content/sinhala/manifest.json";
      const p2 = "/content/sinhala/manifest.json";
      const manifest: Manifest | null = (await tryFetch(p1)) ?? (await tryFetch(p2));
      if (!manifest) return;
      const sec = manifest.sections.find(s => s.id === sectionId);
      const u = sec?.units.find(u => u.id === unitId) ?? null;
      setUnit(u ?? null);
    })();
  }, [sectionId, unitId]);

  if (!unit) return <div className="p-6">Loading unit…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{unit.title}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {unit.lessons.map(l => (
          <a key={l.id} className="px-3 py-2 rounded border hover:bg-gray-50" href={`/course/sinhala/section-01/${unitId}/${l.id}`}>
            {l.title}
          </a>
        ))}
      </div>
    </div>
  );
}
