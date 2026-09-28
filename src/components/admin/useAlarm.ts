"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Suono di notifica generato con Web Audio (nessun file audio necessario) */
export function useAlarm(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);

  const beep = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.18, 0.36].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.5, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.18);
    });
  }, []);

  const enable = useCallback(async () => {
    ctxRef.current ??= new AudioContext();
    await ctxRef.current.resume();
    setEnabled(true);
    beep();
  }, [beep]);

  useEffect(() => {
    if (!enabled || !active) return;
    beep();
    const t = setInterval(beep, 4000);
    return () => clearInterval(t);
  }, [enabled, active, beep]);

  return { enabled, enable, beep };
}
