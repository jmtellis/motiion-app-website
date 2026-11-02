"use client";

import { useState, type ImgHTMLAttributes } from "react";

import { getProfileInitials } from "@/lib/auth/avatar";

const SIZE_CLASS = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
  xl: "size-20 text-base",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASS;

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height" | "name">;

/** Circular identity image with initials fallback — MotiionAvatar analogue for web. */
export function Avatar({ src, name, size = "md", className = "", ...imgProps }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = getProfileInitials(name) || "?";
  const sizeClass = SIZE_CLASS[size];

  if (src && src !== failedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        loading="lazy"
        decoding="async"
        alt=""
        className={`inline-block shrink-0 rounded-full object-cover ring-1 ring-[var(--ds-border-low)] ${sizeClass} ${className}`}
        {...imgProps}
        onError={(event) => { setFailedSrc(src); imgProps.onError?.(event); }}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-tint)] font-semibold text-[var(--ds-text-default)] ring-1 ring-[var(--ds-border-low)] ${sizeClass} ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
