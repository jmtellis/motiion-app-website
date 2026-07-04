import { Search } from "lucide-react";

import { styleOptions, talentSubtypeOptions } from "@/lib/mock-data";
import type { SearchFilters } from "@/types/search";

function SelectField({
  label,
  name,
  value,
  placeholder,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="field min-w-0 flex-1">
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ""}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function HeroSearchBar({
  filters,
  action = "/search",
  embedded = false,
}: {
  filters?: SearchFilters;
  action?: string;
  /** Render without outer panel chrome when nested in ui-command-panel. */
  embedded?: boolean;
}) {
  return (
    <form
      action={action}
      className={
        embedded
          ? "w-full lg:flex lg:items-end lg:gap-3"
          : "ui-panel w-full max-w-5xl p-3.5 lg:flex lg:items-end lg:gap-3"
      }
    >
      <input type="hidden" name="page" value="1" />

      <label className="field min-w-0 lg:min-w-[180px] lg:flex-1">
        <span>Location</span>
        <input
          name="location"
          defaultValue={filters?.location ?? ""}
          placeholder="Los Angeles, CA"
        />
      </label>

      <SelectField
        name="subtype"
        label="Talent type"
        value={filters?.subtype}
        placeholder="Dancer or choreographer"
        options={talentSubtypeOptions}
      />

      <SelectField
        name="style"
        label="Style"
        value={filters?.style}
        placeholder="Any style"
        options={styleOptions.map((style) => ({ label: style, value: style }))}
      />

      <label className="field min-w-0 lg:min-w-[220px] lg:flex-[1.2]">
        <span>Keyword</span>
        <input
          name="keyword"
          defaultValue={filters?.keyword ?? ""}
          placeholder="Credits, skills, tags"
        />
      </label>

      <button
        type="submit"
        className="btn-primary mt-2 inline-flex shrink-0 items-center gap-2 lg:mt-0 lg:self-end"
        aria-label="Search talent"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
