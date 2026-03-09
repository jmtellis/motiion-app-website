import { Client } from "@notionhq/client";
import { isNotionClientError } from "@notionhq/client";
import { NextResponse } from "next/server";

type BetaSignupPayload = {
  fullName?: string;
  email?: string;
  role?: string;
  notes?: string;
};

const ROLE_LABELS: Record<string, string> = {
  dancer: "Dancer",
  choreographer: "Choreographer",
  "creative-director": "Creative Director",
  "casting-team": "Casting Team",
  "agency-or-manager": "Agency / Manager",
  other: "Other",
};

function toNonEmptyString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey || !notionDatabaseId) {
    return NextResponse.json(
      {
        message:
          "Missing Notion configuration. Add NOTION_API_KEY and NOTION_DATABASE_ID to your environment.",
      },
      { status: 500 },
    );
  }

  let payload: BetaSignupPayload;
  try {
    payload = (await request.json()) as BetaSignupPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const fullName = toNonEmptyString(payload.fullName);
  const email = toNonEmptyString(payload.email);
  const roleKey = toNonEmptyString(payload.role);
  const notes = toNonEmptyString(payload.notes);

  if (!fullName || !email || !roleKey) {
    return NextResponse.json(
      { message: "Full name, email, and role are required." },
      { status: 400 },
    );
  }

  const roleLabel = ROLE_LABELS[roleKey] ?? "Other";
  const notion = new Client({ auth: notionApiKey });

  try {
    // Update property names below to exactly match your Notion database schema.
    await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties: {
        "Full Name": {
          title: [{ text: { content: fullName } }],
        },
        Email: {
          email,
        },
        Role: {
          multi_select: [
            {
            name: roleLabel,
            },
          ],
        },
        Notes: {
          rich_text: notes ? [{ text: { content: notes } }] : [],
        },
        "Submitted at": {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });

    return NextResponse.json({ message: "Beta signup captured successfully." });
  } catch (error: unknown) {
    if (isNotionClientError(error)) {
      return NextResponse.json(
        {
          message:
            "Notion rejected the submission. Confirm database permissions and property names match exactly.",
          code: error.code,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: "Unexpected server error while saving signup." },
      { status: 500 },
    );
  }
}
