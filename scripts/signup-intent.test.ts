import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSignupUserMetadata,
  parseOAuthSignupIntent,
  resolveSignupIntent,
  signupIntentFromUserMetadata,
  SIGNUP_META_ACCOUNT_TYPE,
  SIGNUP_META_FLOW,
} from "../src/lib/auth/oauth-shared";

describe("signup intent resolution", () => {
  it("defaults missing query account_type to talent", () => {
    const intent = parseOAuthSignupIntent(new URLSearchParams("flow=signup"));
    assert.equal(intent.flow, "signup");
    assert.equal(intent.accountType, "talent");
  });

  it("builds durable signup metadata for email confirm", () => {
    const meta = buildSignupUserMetadata("talent");
    assert.equal(meta[SIGNUP_META_ACCOUNT_TYPE], "talent");
    assert.equal(meta[SIGNUP_META_FLOW], "signup");
  });

  it("recovers talent signup when confirm link drops query params", () => {
    const user = {
      user_metadata: buildSignupUserMetadata("talent"),
    } as never;

    const intent = resolveSignupIntent(new URLSearchParams("code=abc"), user);
    assert.equal(intent.flow, "signup");
    assert.equal(intent.accountType, "talent");
  });

  it("recovers hiring signup from metadata when params are missing", () => {
    const user = {
      user_metadata: buildSignupUserMetadata("lookingForTalent"),
    } as never;

    const intent = resolveSignupIntent(new URLSearchParams(""), user);
    assert.equal(intent.flow, "signup");
    assert.equal(intent.accountType, "lookingForTalent");
  });

  it("keeps explicit query account_type over metadata", () => {
    const user = {
      user_metadata: buildSignupUserMetadata("lookingForTalent"),
    } as never;

    const intent = resolveSignupIntent(
      new URLSearchParams("flow=signup&account_type=talent"),
      user,
    );
    assert.equal(intent.accountType, "talent");
    assert.equal(intent.flow, "signup");
  });

  it("reads intent from user metadata helper", () => {
    const intent = signupIntentFromUserMetadata({
      user_metadata: buildSignupUserMetadata("talent"),
    } as never);
    assert.deepEqual(intent, { flow: "signup", accountType: "talent" });
  });
});
