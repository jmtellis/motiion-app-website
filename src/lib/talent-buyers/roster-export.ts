import ExcelJS from "exceljs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { RosterDetail } from "./rosters";

export async function rosterWorkbook(roster: RosterDetail) {
  const book = new ExcelJS.Workbook();
  book.creator = "Motiion";
  const sheet = book.addWorksheet("Talent roster");
  sheet.columns = [{ header: "Name", key: "name", width: 30 }, { header: "Location", key: "location", width: 28 }, { header: "Styles", key: "styles", width: 45 }, { header: "Profile", key: "profile", width: 60 }];
  for (const person of roster.members) sheet.addRow({ name: person.name, location: person.location ?? "", styles: person.styles.join(", "), profile: person.slug ? `/talent/${person.slug}` : "" });
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF202828" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = "A1:D1";
  sheet.eachRow(row => { row.alignment = { vertical: "top", wrapText: true }; });
  return book.xlsx.writeBuffer();
}

export async function rosterPdf(roster: RosterDetail, fontBytes: Uint8Array) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const ink = rgb(.13,.16,.17), muted = rgb(.4,.44,.45);
  let page = pdf.addPage([595,842]), y = 750;
  function text(value: string, x: number, lineY: number, size = 11, color = ink) { page.drawText(value, { x, y: lineY, size, font, color }); }
  function lines(value: string, width: number, size: number) {
    const result: string[] = []; let line = "";
    for (const char of value.replace(/[\r\n]+/g," ")) {
      if (font.widthOfTextAtSize(line + char,size) > width && line) { result.push(line); line = ""; }
      line += char;
    }
    if (line) result.push(line);
    return result;
  }
  function header() { text("MOTIION / TALENT ROSTER",42,800,10,muted); }
  header();
  for (const line of lines(roster.name,510,24)) { text(line,42,y,24); y -= 30; }
  text(`${roster.members.length} talent`,42,y-4,10,muted); y -= 36;
  for (const person of roster.members) {
    const detail = [person.location, person.styles.join(" · ")].filter(Boolean).join("  /  ");
    const nameLines = lines(person.name,510,13), detailLines = lines(detail,510,10);
    const height = 24 + nameLines.length * 17 + detailLines.length * 14;
    if (y-height < 55) { page = pdf.addPage([595,842]); header(); y=756; }
    for (const line of nameLines) { text(line,42,y,13); y-=17; }
    for (const line of detailLines) { text(line,42,y,10,muted); y-=14; }
    y-=12; page.drawLine({start:{x:42,y},end:{x:553,y},color:rgb(.89,.9,.9),thickness:.5}); y-=18;
  }
  const pages = pdf.getPages();
  pages.forEach((p,i)=>p.drawText(`${i+1} / ${pages.length}`,{x:510,y:28,font,size:9,color:muted}));
  return pdf.save();
}
