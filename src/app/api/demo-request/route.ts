import { Client, isNotionClientError } from "@notionhq/client";
import type { CreatePageParameters } from "@notionhq/client";
import { NextResponse } from "next/server";

type DemoRequestPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  audienceType?: string;
  company?: string;
  roleTitle?: string;
  message?: string;
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
          "Demo requests are not configured yet. Email hello@motiion.com and we will follow up.",
      },
      { status: 500 },
    );
  }

  let payload: DemoRequestPayload;
  try {
    payload = (await request.json()) as DemoRequestPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const fullName = toNonEmptyString(payload.fullName);
  const email = toNonEmptyString(payload.email);
  const phone = toNonEmptyString(payload.phone);
  const audienceType = toNonEmptyString(payload.audienceType);
  const company = toNonEmptyString(payload.company);
  const roleTitle = toNonEmptyString(payload.roleTitle);
  const message = toNonEmptyString(payload.message);

  if (!fullName || !email || !audienceType) {
    return NextResponse.json(
      { message: "Full name, email, and whether you are talent or a client are required." },
      { status: 400 },
    );
  }

  const audienceLabel = audienceType === "client" ? "Demo — Client" : "Demo — Talent";
  const notesParts = [
    message,
    phone ? `Phone: ${phone}` : "",
    company ? `Company: ${company}` : "",
    roleTitle ? `Role: ${roleTitle}` : "",
    "Source: Request a Demo (website)",
  ].filter(Boolean);

  const notion = new Client({ auth: notionApiKey });

  try {
    const properties: NonNullable<CreatePageParameters["properties"]> = {
      "Full Name": {
        title: [{ text: { content: fullName } }],
      },
      Email: {
        email,
      },
      Role: {
        multi_select: [{ name: audienceLabel }],
      },
      Notes: {
        rich_text: [{ text: { content: notesParts.join("\n") } }],
      },
      "Submitted at": {
        date: {
          start: new Date().toISOString(),
        },
      },
    };

    await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties,
    });

    return NextResponse.json({ message: "Demo request captured successfully." });
  } catch (error: unknown) {
    if (isNotionClientError(error)) {
      return NextResponse.json(
        {
          message:
            "We could not save your request. Please email hello@motiion.com and we will follow up.",
          code: error.code,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: "Unexpected server error." }, { status: 500 });
  }
}
