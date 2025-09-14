export function playAudio(src: string, ref?: { current: HTMLAudioElement | null }) {
  if (ref?.current) {
    try {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    } catch {}
    return;
  }
  try {
    const a = new Audio(src);
    a.play().catch(() => {});
  } catch {}
}
