import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CastingPanelHeader } from "../src/components/talent-buyers/casting/CastingPanelHeader";

test("client review renders an actionable link-creation button alongside role controls", () => {
  const html = renderToStaticMarkup(createElement(CastingPanelHeader, {
    center: createElement("select", { "aria-label": "Role" }, createElement("option", {}, "All roles")),
    primaryAction: { label: "Create client link", actionId: "create-client-link" },
    onPrimaryAction: () => {},
  }));
  assert.match(html, /<select[^>]*aria-label="Role"/);
  assert.match(html, /<button[^>]*>Create client link<\/button>/);
  assert.doesNotMatch(html, /disabled/);
});

test("casting toolbar retains actions without a filter and disables unavailable mutations", () => {
  const html = renderToStaticMarkup(createElement(CastingPanelHeader, {
    primaryAction: { label: "Close", actionId: "close-casting", disabled: true },
    onPrimaryAction: () => {},
    overflowActions: createElement("button", { type: "button" }, "Create job"),
  }));
  assert.match(html, /<button[^>]*disabled=""[^>]*>Close<\/button>/);
  assert.match(html, /<button[^>]*>Create job<\/button>/);
});
