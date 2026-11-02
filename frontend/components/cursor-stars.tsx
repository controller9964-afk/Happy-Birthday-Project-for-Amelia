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

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame = 0;
    let visible = false;
    let previousX = 0;
    let previousY = 0;
    let hasPreviousPointer = false;
    let lastSparkAt = 0;
    let sparkIndex = 0;
    const sparks = new Map<HTMLElement, number>();
    const maxSparks = 24;
    const wand = cluster.querySelector<HTMLElement>(".cursor-wand");

    const scheduleAnimation = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(followPointer);
    };

    const followPointer = () => {
      animationFrame = 0;
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      if (wand) wand.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) scheduleAnimation();
    };

    const removeSpark = (spark: HTMLElement) => {
      const timeout = sparks.get(spark);
      if (timeout !== undefined) window.clearTimeout(timeout);
      sparks.delete(spark);
      spark.remove();
      cluster.dataset.trailCount = String(sparks.size);
    };

    const onMouseMove = (event: MouseEvent) => {
      const distance = Math.hypot(event.clientX - previousX, event.clientY - previousY);
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        currentX = targetX;
        currentY = targetY;
        visible = true;
        cluster.style.opacity = "1";
      }
      scheduleAnimation();

      if (hasPreviousPointer && distance >= 5 && event.timeStamp - lastSparkAt >= 24) {
        const spark = document.createElement("span");
        spark.className = "wand-trail-spark";
        spark.textContent = ["✦", "✧", "·"][sparkIndex++ % 3];
        spark.style.left = `${event.clientX}px`;
        spark.style.top = `${event.clientY}px`;
        spark.style.setProperty("--spark-drift-x", `${Math.round(Math.random() * 28 - 14)}px`);
        spark.style.setProperty("--spark-drift-y", `${Math.round(Math.random() * 28 - 14)}px`);
        cluster.append(spark);
        sparks.set(spark, window.setTimeout(() => removeSpark(spark), 750));
        if (sparks.size > maxSparks) {
          const oldest = sparks.keys().next().value;
          if (oldest) removeSpark(oldest);
        }
        cluster.dataset.trailCount = String(sparks.size);
        lastSparkAt = event.timeStamp;
      }

      previousX = event.clientX;
      previousY = event.clientY;
      hasPreviousPointer = true;
    };

    const onPointerLeave = () => {
      visible = false;
      cluster.style.opacity = "0";
      for (const spark of sparks.keys()) removeSpark(spark);
      hasPreviousPointer = false;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    cluster.dataset.ready = "true";

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.cancelAnimationFrame(animationFrame);
      for (const spark of sparks.keys()) removeSpark(spark);
      delete cluster.dataset.ready;
    };
  }, []);

  return (
    <div ref={clusterRef} className="cursor-stars" aria-hidden="true" data-testid="cursor-stars" data-trail-count="0">
      <span className="cursor-wand">
        <span className="cursor-wand-star">✦</span>
        <span className="cursor-wand-glint">✧</span>
      </span>
    </div>
  );
}
