import { ReactNode } from "react";

export default function ExerciseFrame({
  title, step, total, tips, children
}: { title: string; step: number; total: number; tips?: string[]; children: ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">Question {step} of {total}</p>
      </div>
      {tips && tips.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded p-3 mb-4 text-sm">
          {tips[0]}
        </div>
      )}
      {children}
    </div>
  );
}
