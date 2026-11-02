"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Moon, Sparkles } from "lucide-react";

const introDuration = 1800;

export function LoadingIntro() {
  const [progress, setProgress] = useState(1);
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setProgress(100);
      const timeout = window.setTimeout(() => setVisible(false), 350);
      return () => window.clearTimeout(timeout);
    }

    const startedAt = performance.now();
    let frame = 0;
    const updateProgress = (now: number) => {
      const next = Math.min(100, 1 + Math.floor(((now - startedAt) / introDuration) * 99));
      setProgress(next);
      if (next < 100) {
        frame = window.requestAnimationFrame(updateProgress);
      } else {
        window.setTimeout(() => setVisible(false), 260);
      }
    };

    frame = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loading-intro"
          role="status"
          aria-label={`Welcoming you to Amelia's birthday, ${progress}%`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.025 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeInOut" }}
        >
          <div className="loading-intro-stars" aria-hidden="true">
            <span>✦</span><span>✧</span><span>·</span><span>✦</span><span>✧</span>
          </div>
          <motion.div
            className="loading-moon"
            animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <Moon size={42} strokeWidth={1.2} />
            <Sparkles className="loading-moon-sparkle" size={17} />
          </motion.div>

          <p className="eyebrow">A little birthday magic</p>
          <p className="loading-title">
            A Little Place
            <span className="handwritten">for Amelia</span>
          </p>
          <p className="loading-copy">Warming up the welcome and gathering a few stars…</p>

          <div
            className="loading-progress"
            role="progressbar"
            aria-label="Loading the birthday experience"
            aria-valuemin={1}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress}%`}
          >
            <div className="loading-progress-track">
              <motion.div
                className="loading-progress-fill"
                initial={{ width: "1%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.12, ease: "linear" }}
              />
            </div>
            <div className="loading-progress-labels">
              <span>1%</span>
              <span className="loading-progress-current">{progress}%</span>
              <span>100%</span>
            </div>
          </div>
          <button className="loading-skip" type="button" onClick={() => setVisible(false)}>
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
