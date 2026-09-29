import {
  MAX_VISIBLE_ABILITY_ICONS,
  PROJECT_ABILITIES,
  type AbilityIconDisplay,
  type ProjectAbilityState,
} from "@/lib/talent-buyers/project-abilities";

import "./composable-project.css";

/** Fixed-order ability icons: max four, then "+N". Paused abilities are dimmed. */
export function AbilityIconRow({
  abilities,
  size = "sm",
  className = "",
}: {
  abilities: ReadonlyArray<ProjectAbilityState | AbilityIconDisplay>;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!abilities.length) return null;
  const visible = abilities.slice(0, MAX_VISIBLE_ABILITY_ICONS);
  const overflow = abilities.length - visible.length;
  const label = abilities
    .map((ability) =>
      `${PROJECT_ABILITIES[ability.id].label}${ability.status === "paused" ? " (paused)" : ""}`,
    )
    .join(", ");

  return (
    <span
      className={`ability-icon-row ability-icon-row--${size} ${className}`}
      role="img"
      aria-label={`Abilities: ${label}`}
    >
      {visible.map((ability) => {
        const Icon = PROJECT_ABILITIES[ability.id].icon;
        const attention = "attention" in ability && ability.attention;
        return (
          <span
            key={ability.id}
            className={`ability-icon${ability.status === "paused" ? " ability-icon--paused" : ""}`}
            title={
              attention && "attentionLabel" in ability && ability.attentionLabel
                ? `${PROJECT_ABILITIES[ability.id].label} · ${ability.attentionLabel}`
                : PROJECT_ABILITIES[ability.id].label
            }
            aria-hidden
          >
            <Icon />
            {attention ? <span className="ability-icon__dot" /> : null}
          </span>
        );
      })}
      {overflow > 0 ? (
        <span className="ability-icon ability-icon--more" aria-hidden>
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
