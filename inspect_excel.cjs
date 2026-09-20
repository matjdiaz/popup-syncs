const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('..', 'Release Notes HTML Export', 'Items (7).xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: '' });

if (data.length > 0) {
    console.log("HEADERS_START");
    console.log(JSON.stringify(data[0]));
    console.log("HEADERS_END");
    if (data.length > 1) {
        console.log("ROW_START");
        console.log(JSON.stringify(data[1]));
        console.log("ROW_END");
    }
}
