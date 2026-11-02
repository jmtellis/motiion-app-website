import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field } from "../src/components/ui/Field";

test("field names stay concise while live validation remains a separate description", () => {
  const html = renderToStaticMarkup(createElement(Field, { label: "Username" } as Parameters<typeof Field>[0], [
    createElement("input", { key: "input", "aria-describedby": "username-help" }),
    createElement("span", { key: "hint", id: "username-help", role: "status" }, "This username is available."),
  ]));
  const labelId = html.match(/<span id="([^"]+)"[^>]*>Username<\/span>/)?.[1];
  assert.ok(labelId);
  assert.ok(html.includes(`aria-labelledby="${labelId}"`));
  assert.match(html, /<input[^>]*aria-describedby="username-help"/);
  assert.match(html, /<span id="username-help" role="status">This username is available\.<\/span>/);
});

test("an explicitly named control keeps its name and receives error description", () => {
  const html = renderToStaticMarkup(createElement(Field, { label: "Search", error: "Try another query." } as Parameters<typeof Field>[0], createElement("input", { "aria-label": "Search artists" })));
  const input = html.match(/<input[^>]*>/)?.[0] ?? "";
  assert.match(input, /aria-label="Search artists"/);
  assert.doesNotMatch(input, /aria-labelledby/);
  assert.match(input, /aria-invalid="true"/);
  const errorId = input.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(errorId && html.includes(`id="${errorId}"`));
});
