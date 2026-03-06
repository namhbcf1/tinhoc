// Script để đọc cấu trúc file PTIT.xlsx
const XLSX = require('xlsx');

const wb = XLSX.readFile('C:/Users/ADMIN/Desktop/thongtin/EXCEL/PTIT.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];

console.log('====== PTIT.xlsx STRUCTURE ======');
console.log('Sheet Name:', wb.SheetNames[0]);
console.log('Range:', ws['!ref']);
console.log('');
console.log('====== MERGED CELLS ======');
console.log(JSON.stringify(ws['!merges'], null, 2));
console.log('');
console.log('====== CELL CONTENTS (First 20 rows) ======');

for (let r = 0; r < 20; r++) {
    let rowContent = [];
    for (let c = 0; c < 12; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) {
            rowContent.push(`${addr}:"${String(ws[addr].v).substring(0, 30)}"`);
        }
    }
    if (rowContent.length > 0) {
        console.log(`Row ${r + 1}:`, rowContent.join(', '));
    }
}
