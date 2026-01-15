const PdfPrinter = require('pdfmake');
const fs = require('fs');

// Fuentes para PDFMake
const fonts = {
  Roboto: {
    normal: 'node_modules/pdfmake/fonts/Roboto-Regular.ttf',
    bold: 'node_modules/pdfmake/fonts/Roboto-Medium.ttf',
    italics: 'node_modules/pdfmake/fonts/Roboto-Italic.ttf',
    bolditalics: 'node_modules/pdfmake/fonts/Roboto-MediumItalic.ttf',
  }
};

const printer = new PdfPrinter(fonts);

function generateInvoicePDF(invoiceData) {
  const docDefinition = {
    content: [
      { text: 'Factura', style: 'header' },
      `Cliente: ${invoiceData.customerName}`,
      `Fecha: ${invoiceData.issueDate}`,
      `Total: $${invoiceData.total}`,
      `Estado: ${invoiceData.status}`,
      // Puedes agregar una tabla de productos, más detalles, etc.
    ],
    styles: {
      header: { fontSize: 18, bold: true },
    }
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  let chunks = [];
  return new Promise((resolve, reject) => {
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const result = Buffer.concat(chunks);
      resolve(result);
    });
    pdfDoc.end();
  });
}

module.exports = { generateInvoicePDF };