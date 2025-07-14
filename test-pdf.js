const PDFDocument = require('pdfkit');
require('pdfkit-table');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));

doc.text('Hello PDF');
const table = {
  title: 'Test Table',
  headers: ['A', 'B'],
  rows: [['1', '2'], ['3', '4']]
};
doc.table(table, { width: 300 });

doc.end();