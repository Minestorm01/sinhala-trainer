export type ExerciseType =
  | "TAP_TILES"
  | "TRANSLATE_TO_EN"
  | "TRANSLATE_TO_SI"
  | "LISTEN_TAP"
  | "TYPE_HEAR"
  | "SPEAK"
  | "MATCH_PAIRS"
  | "FILL_BLANK"
  | "PICTURE_SELECT";

export interface ExerciseCommon {
  id: string;
  type: ExerciseType;
  prompt?: string;
  tips?: string[];
  xp?: number;
  audioSrc?: string;
}

export interface TapTiles extends ExerciseCommon {
  type: "TAP_TILES" | "LISTEN_TAP";
  solution: string;
  distractors?: string[];
  tiles?: string[];
  translation?: string;
}

export interface TranslateToEN extends ExerciseCommon {
  type: "TRANSLATE_TO_EN";
  source: string;
  solution: string;
}

export interface TranslateToSI extends ExerciseCommon {
  type: "TRANSLATE_TO_SI";
  source: string;
  solution: string;
  tiles?: string[];
}

export interface TypeHear extends ExerciseCommon {
  type: "TYPE_HEAR";
  solution: string;
}

export interface Speak extends ExerciseCommon {
  type: "SPEAK";
  phrase: string;
  tolerance?: number;
}

export interface MatchPairs extends ExerciseCommon {
  type: "MATCH_PAIRS";
  pairs: { si: string; en: string }[];
}

export interface FillBlank extends ExerciseCommon {
  type: "FILL_BLANK";
  sentence: string;
  solution: string;
  options?: string[];
}

export interface PictureOption { img: string; label: string; correct?: boolean; }

export interface PictureSelect extends ExerciseCommon {
  type: "PICTURE_SELECT";
  word: string;
  options: PictureOption[];
}

export type Exercise =
  | TapTiles
  | TranslateToEN
  | TranslateToSI
  | TypeHear
  | Speak
  | MatchPairs
  | FillBlank
  | PictureSelect;

export interface LessonFile {
  id: string;
  title: string;
  newVocab?: { si: string; en: string; audioSrc?: string }[];
  tips?: string[];
  exercises: Exercise[];
}
