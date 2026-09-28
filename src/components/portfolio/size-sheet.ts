"use client";

import { parseSizingSummary, getSizingFieldsForTab, type SizingFieldKey } from "@/lib/onboarding/sizing-options";

import { loadImage } from "./media";

export type SizeSheetData = {
  name: string;
  headshotUrl: string | null;
  location: string | null;
  representation: string | null;
  height: string;
  sizing: string;
  profileUrl: string;
};

const DISPLAY_LABELS: Partial<Record<SizingFieldKey, string>> = Object.fromEntries(
  (["general", "men", "women"] as const).flatMap((tab) =>
    getSizingFieldsForTab(tab).map((field) => [
      field.key,
      tab === "general" ? field.label : `${field.label} (${tab === "men" ? "M" : "W"})`,
    ]),
  ),
);

/** Rows in the same order as the iOS size sheet: height first, then the sizing summary order. */
export function sizeSheetRows(height: string, sizing: string) {
  const values = parseSizingSummary(sizing);
  const rows: [string, string][] = height ? [["Height", height]] : [];
  const keys = Object.keys(SUMMARY_KEYS) as SizingFieldKey[];
  for (const segment of sizing.split(", ")) {
    const label = segment.slice(0, segment.indexOf(":")).trim();
    const key = keys.find((candidate) => SUMMARY_KEYS[candidate] === label);
    if (key && values[key]) rows.push([DISPLAY_LABELS[key] ?? label, values[key]]);
  }
  return rows;
}

const SUMMARY_KEYS: Record<SizingFieldKey, string> = {
  waist: "Waist",
  inseam: "Inseam",
  glove: "Glove",
  hat: "Hat",
  menTshirt: "T-shirt",
  menShoe: "Shoe",
  menCoat: "Coat",
  menChest: "Chest",
  menNeck: "Neck",
  menSleeve: "Sleeve",
  menShoeWidth: "Shoe Width",
  womenDress: "Dress",
  womenBust: "Bust",
  womenUnderBust: "Under Bust",
  womenCup: "Cup",
  womenHip: "Hip",
  womenTshirt: "T-Shirt(W)",
  womenPants: "Pants",
  womenShoe: "Shoe(W)",
  womenShoeWidth: "Shoe Width(W)",
};

const PDF_IMAGE_MAX_EDGE = 900;

/** Downscaled to print resolution so a one-page sheet stays small enough to share. */
async function headshotBytes(url: string) {
  const original = new Uint8Array(await (await fetch(url)).arrayBuffer());
  try {
    const image = await loadImage(url);
    const scale = PDF_IMAGE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight);
    if (scale >= 1) return original;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : original;
  } catch {
    return original;
  }
}

export function sizeSheetFileName(name: string) {
  return `${name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "Motiion"}-Size-Sheet.pdf`;
}

/** US Letter PDF matching the iOS `SizingSheetPDFService` layout. */
export async function buildSizeSheetPdf(data: SizeSheetData) {
  const { PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.42, 0.42, 0.42);
  const pad = 36;
  const top = 792 - pad;

  page.drawText(fit(data.name, bold, 34, 380), { x: pad, y: top - 30, size: 34, font: bold, color: ink });
  const label = "Size Sheet";
  page.drawText(label, { x: 612 - pad - bold.widthOfTextAtSize(label, 18), y: top - 26, size: 18, font: bold, color: ink });

  const bodyTop = top - 64;
  const leftWidth = (612 - pad * 2 - 24) / 3;
  const imageHeight = leftWidth * (234 / 177);
  let embedded = false;
  if (data.headshotUrl) {
    try {
      const bytes = await headshotBytes(data.headshotUrl);
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
      const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const scale = Math.max(leftWidth / image.width, imageHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.pushOperators(pushGraphicsState(), rectangle(pad, bodyTop - imageHeight, leftWidth, imageHeight), clip(), endPath());
      page.drawImage(image, { x: pad - (width - leftWidth) / 2, y: bodyTop - imageHeight - (height - imageHeight) * 0.3, width, height });
      page.pushOperators(popGraphicsState());
      embedded = true;
    } catch {
      embedded = false;
    }
  }
  if (!embedded) page.drawRectangle({ x: pad, y: bodyTop - imageHeight, width: leftWidth, height: imageHeight, color: rgb(0.9, 0.9, 0.9) });

  let metaY = bodyTop - imageHeight - 24;
  for (const line of [data.location, data.representation].filter((value): value is string => Boolean(value))) {
    page.drawText(fit(line, regular, 13, leftWidth), { x: pad, y: metaY, size: 13, font: regular, color: ink });
    metaY -= 24;
  }

  const tableX = pad + leftWidth + 24;
  const tableWidth = 612 - pad - tableX;
  const rowHeight = 28;
  let rowY = bodyTop - rowHeight;
  page.drawRectangle({ x: tableX, y: rowY, width: tableWidth, height: rowHeight, color: rgb(0.14, 0.14, 0.14) });
  page.drawText("Measurement", { x: tableX + 12, y: rowY + 10, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Value", { x: tableX + tableWidth / 2 + 12, y: rowY + 10, size: 12, font: bold, color: rgb(1, 1, 1) });
  const footerTop = pad + 64;
  sizeSheetRows(data.height, data.sizing).forEach(([name, value], index) => {
    rowY -= rowHeight;
    if (rowY < footerTop) return;
    if (index % 2 === 0) page.drawRectangle({ x: tableX, y: rowY, width: tableWidth, height: rowHeight, color: rgb(0.96, 0.96, 0.96) });
    page.drawText(name, { x: tableX + 12, y: rowY + 10, size: 12, font: regular, color: ink });
    page.drawText(value, { x: tableX + tableWidth / 2 + 12, y: rowY + 10, size: 12, font: bold, color: ink });
  });

  page.drawText("motiion", { x: pad, y: pad + 18, size: 16, font: bold, color: ink });
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  page.drawText(date, { x: pad, y: pad, size: 10, font: regular, color: muted });
  const link = data.profileUrl.replace(/^https?:\/\//, "");
  page.drawText(link, { x: 612 - pad - regular.widthOfTextAtSize(link, 10), y: pad, size: 10, font: regular, color: muted });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

function fit(value: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, width: number) {
  let output = value;
  while (output.length > 1 && font.widthOfTextAtSize(output, size) > width) output = `${output.slice(0, -2)}…`;
  return output;
}
