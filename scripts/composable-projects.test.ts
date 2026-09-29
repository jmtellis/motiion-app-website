import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseComposableProjectShell } from "../src/lib/talent-buyers/composable-project-schema";
import {
  buildComposableConfig,
  deriveLegacyAbilities,
  isComposableProject,
  parseComposableConfig,
  primaryAbilityForNextStep,
  projectShellStatus,
  projectShellSubtitle,
  resolveProjectAbilities,
  resolveSmartPrimaryAction,
  resolveWorkspaceProjectType,
  shouldShowWhatDoYouNeed,
  shouldShowZeroAbilityBanner,
} from "../src/lib/talent-buyers/project-abilities";
import { preserveComposableColumns } from "../src/lib/talent-buyers/project-payload";
import {
  classSessionCreatePath,
  isProjectWorkspacePath,
  projectAbilityFirstStepPath,
  projectAbilityPath,
  projectHomePath,
} from "../src/lib/talent-buyers/project-routes";
import { createIntentPath } from "../src/lib/talent-buyers/create-intent";

const composableConfig = { composable: { version: 1, paused: [] } };
const noCounts = { castingRoleCount: 0, castingCount: 0, rosterCount: 0, classSessionCount: 0 };

describe("composable project marker", () => {
  it("only treats rows with project_configuration.composable v1+ as composable", () => {
    assert.equal(isComposableProject({ project_configuration: composableConfig }), true);
    assert.equal(isComposableProject({ project_configuration: { attachments: [] } }), false);
    assert.equal(isComposableProject({ project_configuration: { composable: { version: 0 } } }), false);
    assert.equal(isComposableProject(null), false);
  });

  it("drops unknown paused ids and keeps scan order", () => {
    const parsed = parseComposableConfig({
      composable: { version: 1, paused: ["classes", "bogus", "casting"] },
    });
    assert.deepEqual(parsed?.paused, ["casting", "classes"]);
  });

  it("merges config patches without losing existing fields", () => {
    const base = buildComposableConfig(null, { created_via: "web_thin_create" });
    const dismissed = buildComposableConfig(base, { prompt_dismissed_at: "2026-09-01T00:00:00Z" });
    assert.equal(dismissed.created_via, "web_thin_create");
    assert.equal(dismissed.prompt_dismissed_at, "2026-09-01T00:00:00Z");
    assert.equal(buildComposableConfig(dismissed, { prompt_dismissed_at: null }).prompt_dismissed_at, null);
  });
});

describe("abilities", () => {
  it("resolves enabled abilities in fixed order with paused status", () => {
    const abilities = resolveProjectAbilities({
      enabled_modules: { classes: true, casting: true, activities: true },
      project_configuration: { composable: { version: 1, paused: ["classes"] } },
    });
    assert.deepEqual(abilities, [
      { id: "casting", status: "active" },
      { id: "classes", status: "paused" },
    ]);
  });

  it("zero abilities is a valid project", () => {
    assert.deepEqual(resolveProjectAbilities({ enabled_modules: null, project_configuration: composableConfig }), []);
  });

  it("uses the casting workflow only when a composable project has Casting on", () => {
    assert.equal(
      resolveWorkspaceProjectType({
        project_type: "production",
        enabled_modules: { casting: true },
        project_configuration: composableConfig,
      }),
      "casting",
    );
    assert.equal(
      resolveWorkspaceProjectType({
        project_type: "production",
        enabled_modules: { roster: true },
        project_configuration: composableConfig,
      }),
      "production",
    );
    assert.equal(
      resolveWorkspaceProjectType({ project_type: "production", enabled_modules: { casting: true } }),
      "production",
    );
  });

  it("combined next step prioritises Casting > Roster > Classes", () => {
    assert.equal(primaryAbilityForNextStep(["classes", "roster"]), "roster");
    assert.equal(primaryAbilityForNextStep(["classes", "casting", "roster"]), "casting");
    assert.equal(primaryAbilityForNextStep([]), null);
  });

  it("derives legacy icons from attached work", () => {
    assert.deepEqual(
      deriveLegacyAbilities({ projectType: "production", castingCount: 0, roleCount: 2, rosterCount: 3, classSessionCount: 0 }).map(
        (ability) => ability.id,
      ),
      ["casting", "roster"],
    );
    assert.deepEqual(
      deriveLegacyAbilities({ projectType: "event", castingCount: 0, roleCount: 0, rosterCount: 0, classSessionCount: 0 }),
      [],
    );
  });
});

describe("smart primary CTA", () => {
  it("asks for an ability when none are on", () => {
    assert.deepEqual(resolveSmartPrimaryAction([], noCounts), { kind: "add-ability", label: "Ability" });
  });

  it("points at the first empty active ability", () => {
    const abilities = [
      { id: "casting" as const, status: "active" as const },
      { id: "roster" as const, status: "active" as const },
    ];
    assert.equal(resolveSmartPrimaryAction(abilities, noCounts).label, "Add first role");
    assert.equal(
      resolveSmartPrimaryAction(abilities, { ...noCounts, castingRoleCount: 1 }).label,
      "Invite dancers",
    );
  });

  it("skips paused abilities", () => {
    const action = resolveSmartPrimaryAction(
      [
        { id: "casting", status: "paused" },
        { id: "classes", status: "active" },
      ],
      noCounts,
    );
    assert.deepEqual(action, { kind: "ability-step", ability: "classes", label: "Add first session" });
  });
});

describe("post-create prompt", () => {
  it("shows What do you need? until dismissed or an ability is on", () => {
    assert.equal(shouldShowWhatDoYouNeed({ abilities: [], promptDismissedAt: null }), true);
    assert.equal(shouldShowWhatDoYouNeed({ abilities: [], promptDismissedAt: "2026-09-01T00:00:00Z" }), false);
    assert.equal(
      shouldShowWhatDoYouNeed({ abilities: [{ id: "roster", status: "active" }], promptDismissedAt: null }),
      false,
    );
  });

  it("brings back a soft banner 24h after create for zero-ability projects", () => {
    const createdAt = "2026-09-01T00:00:00Z";
    const dismissed = "2026-09-01T00:05:00Z";
    assert.equal(
      shouldShowZeroAbilityBanner({
        abilities: [],
        promptDismissedAt: dismissed,
        createdAt,
        now: new Date("2026-09-01T12:00:00Z"),
      }),
      false,
    );
    assert.equal(
      shouldShowZeroAbilityBanner({
        abilities: [],
        promptDismissedAt: dismissed,
        createdAt,
        now: new Date("2026-09-02T01:00:00Z"),
      }),
      true,
    );
  });
});

describe("shell fields", () => {
  it("requires only a name", () => {
    const parsed = parseComposableProjectShell({ name: "  Summer Showcase  " });
    assert.equal(parsed.success, true);
    assert.equal(parsed.success && parsed.data.name, "Summer Showcase");
    assert.equal(parseComposableProjectShell({ name: "   " }).success, false);
  });

  it("rejects an end date before the start date", () => {
    const parsed = parseComposableProjectShell({ name: "Tour", startDate: "2026-10-10", endDate: "2026-10-01" });
    assert.equal(parsed.success, false);
    assert.equal(!parsed.success && parsed.error.issues[0]?.path[0], "endDate");
  });

  it("formats subtitle and status", () => {
    assert.equal(projectShellSubtitle({ location: "Los Angeles", startDate: null, endDate: null }), "Los Angeles");
    assert.equal(projectShellSubtitle({ location: "", startDate: null, endDate: null }), "");
    assert.equal(projectShellStatus("2026-01-01", new Date("2026-02-01T00:00:00Z")), "ended");
    assert.equal(projectShellStatus(null), "active");
  });
});

describe("routes", () => {
  it("maps abilities to destinations", () => {
    assert.equal(projectHomePath("p1"), "/projects/p1/overview");
    assert.equal(projectAbilityPath("p1", "casting"), "/projects/p1/workspace/breakdown");
    assert.equal(projectAbilityPath("p1", "roster"), "/projects/p1/roster");
    assert.equal(projectAbilityFirstStepPath("p1", "roster"), "/projects/p1/roster?invite=1");
    assert.equal(projectAbilityFirstStepPath("p1", "classes"), classSessionCreatePath("p1"));
    assert.equal(classSessionCreatePath("p1"), "/calendar/new?type=class&projectId=p1");
  });

  it("keeps roster/classes inside the project workspace shell", () => {
    assert.equal(isProjectWorkspacePath("/projects/p1/roster"), true);
    assert.equal(isProjectWorkspacePath("/projects/p1/classes"), true);
  });

  it("routes Casting creation through the thin project create", () => {
    assert.equal(createIntentPath("casting"), "/projects?create=1&intent=casting");
    assert.equal(createIntentPath("class", "p1"), "/calendar/new?type=class&projectId=p1");
  });
});

describe("legacy editors on composable rows", () => {
  it("keeps abilities, the composable marker, and visibility", () => {
    const row = preserveComposableColumns(
      {
        title: "Renamed",
        enabled_modules: { casting: false, activities: false },
        project_configuration: { attachments: [], composer_draft: true },
        visibility: "private",
        is_active: false,
      },
      {
        enabled_modules: { casting: true, roster: true, activities: false },
        project_configuration: { composable: { version: 1, paused: ["roster"] }, attachments: [] },
      },
    );
    assert.equal(row.title, "Renamed");
    assert.deepEqual(row.enabled_modules, { casting: true, activities: false, roster: true, classes: false });
    assert.deepEqual((row.project_configuration as Record<string, unknown>).composable, {
      version: 1,
      paused: ["roster"],
    });
    assert.equal((row.project_configuration as Record<string, unknown>).composer_draft, false);
    assert.equal(row.is_active, true);
    assert.equal("visibility" in row, false);
  });

  it("leaves type-first rows untouched", () => {
    const input = { visibility: "private", enabled_modules: { casting: false } };
    assert.equal(preserveComposableColumns(input, { project_configuration: { attachments: [] } }), input);
  });
});
