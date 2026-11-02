import assert from "node:assert/strict";
import { test } from "node:test";
import { publicWebUrl } from "../src/lib/links/external-url";

test("public profile links accept ordinary HTTPS links and bare domains", () => {
  assert.equal(publicWebUrl(" instagram.com/dancer "), "https://instagram.com/dancer");
  assert.equal(publicWebUrl("https://storage.example.com/resume.pdf?token=abc"), "https://storage.example.com/resume.pdf?token=abc");
});
test("public profile links do not expose executable or credential-bearing destinations", () => {
  for (const value of [null, "", "javascript:alert(1)", "data:text/html,hi", "https://name:password@example.com", "https://exa mple.com", "/local/path"]) assert.equal(publicWebUrl(value), null, String(value));
});
