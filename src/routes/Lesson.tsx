import { useEffect, useState } from "react";
import LessonEngine from "../engine/LessonEngine";
import type { LessonFile } from "../engine/schema";

async function tryFetch(path: string) {
  const res = await fetch(path).catch(() => null);
  if (res && res.ok) return res.json();
  return null;
}

// URL: /course/sinhala/section-01/unit-01/lesson-01
export default function Lesson() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const courseId = parts[1];
  const sectionId = parts[2];
  const unitId = parts[3];
  const lessonId = parts[4];

  const [lesson, setLesson] = useState<LessonFile | null>(null);

  useEffect(() => {
    (async () => {
      const p1 = `/src/content/${courseId}/${sectionId}/${unitId}/${lessonId}.json`;
      const p2 = `/content/${courseId}/${sectionId}/${unitId}/${lessonId}.json`;
      const json = (await tryFetch(p1)) ?? (await tryFetch(p2));
      setLesson(json);
    })();
  }, [courseId, sectionId, unitId, lessonId]);

  if (!lesson) return <div className="p-6">Loading lesson…</div>;

  return (
    <LessonEngine courseId={courseId} sectionId={sectionId} unitId={unitId} lesson={lesson} />
  );
}
