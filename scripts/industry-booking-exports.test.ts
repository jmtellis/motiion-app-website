import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { rosterPdf, rosterWorkbook } from '../src/lib/talent-buyers/roster-export';
import { bookingSchema } from '../src/lib/talent-buyers/booking-schema';
import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
(async()=>{
 const roster={id:'test',name:'Production roster',kind:'roster',talentCount:40,createdAt:'2026-09-25',projectId:null,members:Array.from({length:40},(_,i)=>({id:String(i),profileId:String(i),name:i===0?'Élodie García':i===1?'=1+1':`Sample Talent ${i+1}`,slug:'sample',location:'Los Angeles, CA',styles:['Hip-hop','Contemporary'],avatarUrl:null,addedAt:'2026-09-25'}))};
 const xlsx=await rosterWorkbook(roster); const wb=new ExcelJS.Workbook();await wb.xlsx.load(xlsx);assert.equal(wb.worksheets[0].rowCount,41);assert.equal(wb.worksheets[0].getCell('A3').value,'=1+1');assert.equal(wb.worksheets[0].getCell('A3').type,3);
 const pdf=await rosterPdf(roster,await readFile('public/fonts/Geist-Regular.ttf'));await writeFile('/tmp/roster-preview.pdf',pdf);assert((await PDFDocument.load(pdf)).getPageCount()>1);
 const base={project_id:'00000000-0000-4000-8000-000000000001',talent_name:'Sample',role:'Dancer',status:'draft',fee_cents:50000,currency:'USD',start_date:'2026-10-01',end_date:'2026-10-02',payer_name:'',payer_email:'',terms:'',negotiation_notes:''};assert(bookingSchema.safeParse(base).success);assert(!bookingSchema.safeParse({...base,fee_cents:-1}).success);assert(!bookingSchema.safeParse({...base,status:'paid'}).success);assert(!bookingSchema.safeParse({...base,end_date:'2026-09-01'}).success);assert(!bookingSchema.safeParse({...base,payer_email:'invalid'}).success);
 console.log('Export round-trip, spreadsheet formula safety, PDF pagination, and booking validation passed.');
})();
