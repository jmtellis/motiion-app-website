import { Client } from "@notionhq/client";
import { isNotionClientError } from "@notionhq/client";
import type { CreatePageParameters } from "@notionhq/client";
import { NextResponse } from "next/server";

type BetaSignupPayload = {
  fullName?: string;
  email?: string;
  role?: string;
  instagram?: string;
  references?: string[];
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

const REFERENCE_LABELS: Record<string, string> = {
  website: "Website",
  instagram: "Instagram",
  "friend-family": "Friend / Family",
  "motiion-founders": "Motiion founders",
};

function toNonEmptyString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
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
  const instagram = toNonEmptyString(payload.instagram);
  const referenceKeys = toStringArray(payload.references);
  const notes = toNonEmptyString(payload.notes);

  if (!fullName || !email || !roleKey) {
    return NextResponse.json(
      { message: "Full name, email, and role are required." },
      { status: 400 },
    );
  }

  const roleLabel = ROLE_LABELS[roleKey] ?? "Other";
  const referenceLabels = referenceKeys
    .map((key) => REFERENCE_LABELS[key])
    .filter(Boolean);
  const notion = new Client({ auth: notionApiKey });

  try {
    const database = await notion.databases.retrieve({
      database_id: notionDatabaseId,
    });

    const properties: NonNullable<CreatePageParameters["properties"]> = {
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
    };

    const databaseProperties =
      "properties" in database &&
      typeof database.properties === "object" &&
      database.properties !== null
        ? (database.properties as Record<string, { type?: string } | undefined>)
        : {};

    const instagramPropertyType = databaseProperties.Instagram?.type;
    if (instagram) {
      if (instagramPropertyType === "rich_text" || !instagramPropertyType) {
        properties.Instagram = {
          rich_text: [{ text: { content: instagram } }],
        };
      } else if (instagramPropertyType === "url") {
        properties.Instagram = {
          url: instagram,
        };
      } else if (instagramPropertyType === "email") {
        properties.Instagram = {
          email: instagram,
        };
      } else if (instagramPropertyType === "phone_number") {
        properties.Instagram = {
          phone_number: instagram,
        };
      } else if (instagramPropertyType === "title") {
        properties.Instagram = {
          title: [{ text: { content: instagram } }],
        };
      }
    }

    // Reference in Notion is multi-select (select all that apply). Option `name` values
    // must match the database options exactly.
    const referencePropertyType = databaseProperties.Reference?.type;
    if (referenceLabels.length > 0) {
      if (referencePropertyType === "select") {
        properties.Reference = {
          select: { name: referenceLabels[0] },
        };
        if (referenceLabels.length > 1) {
          const existingNotes = notes.length > 0 ? `${notes}\n\n` : "";
          properties.Notes = {
            rich_text: [
              {
                text: {
                  content: `${existingNotes}Reference (all selected): ${referenceLabels.join(", ")}`,
                },
              },
            ],
          };
        }
      } else {
        // multi_select (current schema) or unknown/missing type — use multi_select
        properties.Reference = {
          multi_select: referenceLabels.map((name) => ({ name })),
        };
      }
    }

    await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties,
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
