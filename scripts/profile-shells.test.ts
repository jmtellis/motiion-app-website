import assert from "node:assert/strict";
import { test } from "node:test";

import { getActiveShell, getShellMenuAction } from "../src/lib/auth/profile.ts";

test("talent without an industry shell can add one", () => {
  const action = getShellMenuAction({
    accountType: "talent",
    enabledShells: ["talent"],
    activeShell: "talent",
  });
  assert.deepEqual(action, {
    kind: "passcode",
    label: "Add profile",
    href: "/talent-buyers/onboarding?addShell=industry",
  });
});

test("industry without a talent shell can add one", () => {
  const action = getShellMenuAction({
    accountType: "lookingForTalent",
    enabledShells: ["lookingForTalent"],
    activeShell: "lookingForTalent",
  });
  assert.deepEqual(action, {
    kind: "link",
    label: "Add talent profile",
    href: "/onboarding?addShell=talent",
  });
});

test("members with both shells switch to the other workspace", () => {
  assert.equal(
    getShellMenuAction({
      accountType: "talent",
      enabledShells: ["talent", "lookingForTalent"],
      activeShell: "talent",
    })?.kind,
    "switch",
  );
  assert.equal(
    getShellMenuAction({
      accountType: "talent",
      enabledShells: ["talent", "lookingForTalent"],
      activeShell: "lookingForTalent",
    })?.label,
    "Switch to talent",
  );
});

test("community accounts only keep their current shell", () => {
  assert.equal(
    getShellMenuAction({
      accountType: "community",
      enabledShells: ["community"],
      activeShell: "community",
    }),
    null,
  );
  assert.equal(getActiveShell({ accountType: "talent", activeShell: "lookingForTalent", enabledShells: ["talent"] }), "talent");
});
