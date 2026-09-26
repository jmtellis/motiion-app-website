"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export function TalentPortfolioVideo({
  src = "/marketing/videos/site-talent-1.mp4",
  poster = "/marketing/videos/site-talent-1-poster.jpg",
}: {
  src?: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hoverTarget = video.closest(".illustrated-benefits__card") ?? video;
    const desktopHover = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    let inView = false;
    let hovered = hoverTarget.matches(":hover");

    const updatePlayback = () => {
      const shouldPlay = reduceMotion === false && !document.hidden && inView
        && (!desktopHover.matches || hovered);
      if (!shouldPlay) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        // Keep the poster or current frame if autoplay is blocked.
      });
    };
    const onEnter = () => { hovered = true; updatePlayback(); };
    const onLeave = () => { hovered = false; updatePlayback(); };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      updatePlayback();
    }, { threshold: [0, 0.35] });

    observer.observe(video);
    hoverTarget.addEventListener("pointerenter", onEnter);
    hoverTarget.addEventListener("pointerleave", onLeave);
    desktopHover.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    updatePlayback();

    return () => {
      observer.disconnect();
      hoverTarget.removeEventListener("pointerenter", onEnter);
      hoverTarget.removeEventListener("pointerleave", onLeave);
      desktopHover.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
      video.pause();
    };
  }, [reduceMotion, src]);

  return (
    <video
      ref={videoRef}
      className="benefit-art benefit-art--video"
      src={src}
      poster={poster}
      width={1200}
      height={900}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}
