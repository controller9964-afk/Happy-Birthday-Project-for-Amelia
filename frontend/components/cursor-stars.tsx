"use client";

import { useEffect, useRef } from "react";

export function CursorStars() {
  const clusterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let previousX = 0;
    let previousY = 0;
    let hasPreviousPointer = false;
    let sparkIndex = 0;
    const sparks = new Map<HTMLElement, number>();
    const maxSparks = 36;

    const removeSpark = (spark: HTMLElement) => {
      const timeout = sparks.get(spark);
      if (timeout !== undefined) window.clearTimeout(timeout);
      sparks.delete(spark);
      spark.remove();
      cluster.dataset.trailCount = String(sparks.size);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (hasPreviousPointer) {
        const deltaX = event.clientX - previousX;
        const deltaY = event.clientY - previousY;
        const distance = Math.hypot(deltaX, deltaY);
        const count = Math.min(12, Math.floor(distance / 8));

        for (let index = 1; index <= count; index += 1) {
          const progress = index / count;
          const spark = document.createElement("span");
          spark.className = "wand-trail-spark";
          spark.textContent = ["✦", "✧", "·"][sparkIndex++ % 3];
          spark.style.left = `${previousX + deltaX * progress}px`;
          spark.style.top = `${previousY + deltaY * progress}px`;
          spark.style.setProperty("--spark-drift-x", `${Math.round(Math.random() * 28 - 14)}px`);
          spark.style.setProperty("--spark-drift-y", `${Math.round(Math.random() * 28 - 14)}px`);
          cluster.append(spark);
          sparks.set(spark, window.setTimeout(() => removeSpark(spark), 750));
          if (sparks.size > maxSparks) {
            const oldest = sparks.keys().next().value;
            if (oldest) removeSpark(oldest);
          }
          cluster.dataset.trailCount = String(sparks.size);
        }
      }

      previousX = event.clientX;
      previousY = event.clientY;
      hasPreviousPointer = true;
    };

    const onPointerLeave = () => {
      hasPreviousPointer = false;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    cluster.dataset.ready = "true";

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      for (const spark of sparks.keys()) removeSpark(spark);
      delete cluster.dataset.ready;
    };
  }, []);

  return (
    <div ref={clusterRef} className="cursor-stars" aria-hidden="true" data-testid="cursor-stars" data-trail-count="0" />
  );
}
