import { useEffect, useMemo, useState } from "react";
import type { LessonFile, Exercise } from "./schema";
import { useProgress } from "./useProgress";
import { shuffle } from "../lib/shuffle";
import ExerciseFrame from "../components/exercises/ExerciseFrame";
import TapTiles from "../components/exercises/TapTiles";
import Translate from "../components/exercises/Translate";
import ListenType from "../components/exercises/ListenType";
import Speak from "../components/exercises/Speak";
import MatchPairs from "../components/exercises/MatchPairs";
import FillBlank from "../components/exercises/FillBlank";
import PictureSelect from "../components/exercises/PictureSelect";

type Props = {
  courseId: string;
  sectionId: string;
  unitId: string;
  lesson: LessonFile;
};

export default function LessonEngine({ courseId, sectionId, unitId, lesson }: Props) {
  const { state, setResult } = useProgress({ course: courseId, section: sectionId, unit: unitId, lesson: lesson.id });
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const order = useMemo(() => shuffle(lesson.exercises.slice()), [lesson.exercises]);
  const ex = order[idx];

  const onCorrect = () => setCorrectCount(c => c + 1);
  const onNext = () => setIdx(i => i + 1);

  useEffect(() => {
    if (idx >= order.length && order.length) {
      const score = Math.round((correctCount / order.length) * 100);
      setResult(score);
    }
  }, [idx, order.length, correctCount, setResult]);

  if (!ex) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <h2 className="text-xl font-semibold">Lesson complete</h2>
        <p>Best score: {state.bestScore}% {state.completed ? "✅" : ""}</p>
      </div>
    );
  }

  const renderExercise = (e: Exercise) => {
    switch (e.type) {
      case "TAP_TILES":
      case "LISTEN_TAP":
        return <TapTiles data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "TRANSLATE_TO_EN":
        return <Translate mode="to-en" data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "TRANSLATE_TO_SI":
        return <Translate mode="to-si" data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "TYPE_HEAR":
        return <ListenType data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "SPEAK":
        return <Speak data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "MATCH_PAIRS":
        return <MatchPairs data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "FILL_BLANK":
        return <FillBlank data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      case "PICTURE_SELECT":
        return <PictureSelect data={e as any} onCorrect={onCorrect} onNext={onNext} />;
      default:
        return <div>Unknown exercise</div>;
    }
  };

  return (
    <ExerciseFrame title={lesson.title} step={idx + 1} total={order.length} tips={ex.tips ?? lesson.tips}>
      {renderExercise(ex)}
    </ExerciseFrame>
  );
}
