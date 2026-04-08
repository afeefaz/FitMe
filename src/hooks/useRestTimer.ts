"use client";

import { useState, useEffect, useRef } from "react";

export function useRestTimer(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(0);
  };

  return { remaining, finished: remaining === 0, skip };
}
