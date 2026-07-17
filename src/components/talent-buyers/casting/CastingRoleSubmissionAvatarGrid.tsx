"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, User } from "lucide-react";

import { computeCastingRoleAvatarGridLayout } from "@/lib/talent-buyers/casting/casting-role-avatar-grid-layout";
import {
  buildCastingRoleAvatarSlots,
  type CastingRoleAvatarGridConfig,
} from "@/lib/talent-buyers/casting/casting-role-preview";
import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";

export function CastingRoleSubmissionAvatarGrid({
  candidates,
  role,
  grid,
  bleed = false,
}: {
  candidates: CastingCandidate[];
  role: CastingRole;
  grid: CastingRoleAvatarGridConfig;
  bleed?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [regionSize, setRegionSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setRegionSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (regionSize.width <= 0 || regionSize.height <= 0) return null;
    return computeCastingRoleAvatarGridLayout(
      regionSize.width,
      regionSize.height,
      grid.rows,
      grid.columns,
      { bleed },
    );
  }, [bleed, grid.columns, grid.rows, regionSize.height, regionSize.width]);

  const { slots, showsPlaceholders } = useMemo(() => {
    if (!layout) {
      return buildCastingRoleAvatarSlots(candidates, role, grid);
    }

    return buildCastingRoleAvatarSlots(candidates, role, grid, {
      columnCount: layout.columnCount,
      fillOrder: layout.fillOrder,
    });
  }, [candidates, grid, layout, role]);

  return (
    <div ref={containerRef} className="casting-role-avatar-grid" aria-hidden>
      {layout
        ? slots.map((slot, index) => {
            const position = layout.positions[index];
            if (!position) return null;

            const diameter = layout.avatarDiameter;
            const style = {
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${diameter}px`,
              height: `${diameter}px`,
            } satisfies CSSProperties;

            return (
              <div key={index} className="casting-role-avatar-grid__cell" style={style}>
                {slot.kind === "face" ? (
                  <div className="casting-role-avatar-grid__face">
                    {slot.face.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slot.face.imageUrl} alt="" className="casting-role-avatar-grid__image" />
                    ) : (
                      <span className="casting-role-avatar-grid__initials">{slot.face.initials}</span>
                    )}
                    {slot.face.isSelected ? (
                      <span className="casting-role-avatar-grid__selected" aria-hidden>
                        <CheckCircle2 className="size-full" />
                      </span>
                    ) : null}
                  </div>
                ) : slot.kind === "overflow" ? (
                  <div className="casting-role-avatar-grid__overflow">+{slot.count}</div>
                ) : showsPlaceholders ? (
                  <div className="casting-role-avatar-grid__placeholder">
                    <User className="casting-role-avatar-grid__placeholder-icon" aria-hidden />
                  </div>
                ) : null}
              </div>
            );
          })
        : null}
    </div>
  );
}
