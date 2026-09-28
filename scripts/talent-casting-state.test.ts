import assert from "node:assert/strict";
import { test } from "node:test";

import {
  castingNotificationHref,
  classifyCastingRole,
  isPendingCastingInviteNotification,
  resolveTalentCastingOutcome,
  roleSubmitState,
  submissionIsClosed,
} from "../src/lib/app/talent-casting-state";

test("talent outcomes stay submitted until the casting is finalized", () => {
  assert.equal(
    resolveTalentCastingOutcome({
      isCastingFinalized: false,
      isActive: true,
      deadlinePassed: false,
      submissionId: "sub-1",
      finalSelectIds: ["sub-1"],
    }),
    "submitted",
  );
  assert.equal(
    resolveTalentCastingOutcome({
      isCastingFinalized: true,
      isActive: true,
      deadlinePassed: false,
      submissionId: "sub-1",
      finalSelectIds: ["sub-1"],
    }),
    "selected",
  );
  assert.equal(
    resolveTalentCastingOutcome({
      isCastingFinalized: true,
      isActive: false,
      deadlinePassed: true,
      submissionId: "sub-2",
      finalSelectIds: ["sub-1"],
    }),
    "not_selected",
  );
  assert.equal(
    resolveTalentCastingOutcome({
      isCastingFinalized: false,
      isActive: false,
      deadlinePassed: true,
      submissionId: "sub-1",
      finalSelectIds: [],
    }),
    "casting_closed",
  );
});

test("roles group into open calls, invites, submissions, or hidden passes", () => {
  assert.equal(classifyCastingRole({ submitted: true, invitedPending: true, passed: false, publicOpen: true }), "submitted");
  assert.equal(classifyCastingRole({ submitted: false, invitedPending: true, passed: false, publicOpen: true }), "invited");
  assert.equal(classifyCastingRole({ submitted: false, invitedPending: false, passed: true, publicOpen: true }), "hidden");
  assert.equal(classifyCastingRole({ submitted: false, invitedPending: false, passed: false, publicOpen: true }), "open");
  assert.equal(classifyCastingRole({ submitted: false, invitedPending: false, passed: false, publicOpen: false }), "hidden");
  assert.equal(submissionIsClosed(true), true);
  assert.equal(submissionIsClosed(false), false);
});

test("submit stays blocked after a submission and for closed or invite-only roles", () => {
  const open = {
    alreadySubmitted: false,
    isActive: true,
    isCastingFinalized: false,
    deadlinePassed: false,
    externalSubmissionUrl: null,
    invited: false,
    hasAgency: false,
    agencyRequired: false,
    submitterPolicy: null,
    visibilityPresentation: "public_listing",
  };
  assert.equal(roleSubmitState(open).kind, "submit");
  assert.equal(roleSubmitState({ ...open, alreadySubmitted: true }).kind, "submitted");
  assert.equal(roleSubmitState({ ...open, deadlinePassed: true }).kind, "closed");
  assert.equal(roleSubmitState({ ...open, visibilityPresentation: "invite_only" }).kind, "invite_only");
  assert.equal(roleSubmitState({ ...open, visibilityPresentation: "invite_only", invited: true }).kind, "submit");
  assert.equal(roleSubmitState({ ...open, agencyRequired: true }).kind, "agency_only");
});

test("pending casting invites stay out of the bell and other casting alerts open the role", () => {
  assert.equal(
    isPendingCastingInviteNotification({
      type: "casting_update",
      data: { role_id: "role-1", casting_invite_pending: true },
    }),
    true,
  );
  assert.equal(
    castingNotificationHref({
      type: "casting_update",
      data: { role_id: "role-1", casting_invite_pending: "true" },
    }),
    null,
  );
  assert.equal(
    castingNotificationHref({ type: "casting_match", data: { role_id: "role-9" } }),
    "/opportunities?casting=role-9",
  );
  assert.equal(castingNotificationHref({ type: "message", data: { role_id: "role-9" } }), null);
});
