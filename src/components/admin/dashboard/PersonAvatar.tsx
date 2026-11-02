"use client";
import { useEffect, useRef, useState } from "react";

export function PersonAvatar({ urls, name, large = false }: { urls: string[]; name: string; large?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const url = urls.find(candidate => !failed.includes(candidate));
  useEffect(() => {
    let active = true;
    if (url && imageRef.current) void imageRef.current.decode().catch(() => {
      if (active) setFailed(previous => previous.includes(url) ? previous : [...previous, url]);
    });
    return () => { active = false; };
  }, [url]);
  const initials = name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase() || "?";
  return <span className={large ? "launch-person-avatar-large" : "launch-person-icon"} role="img" aria-label={`${name} profile image`}>
    {url ? /* eslint-disable-next-line @next/next/no-img-element -- Stored profile URLs include signed media; preserve them without proxy rewriting. */
      <img key={url} ref={imageRef} src={url} alt="" loading={large ? "eager" : "lazy"} onError={() => setFailed(previous => [...previous, url])} />
      : initials}
  </span>;
}
