const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

// Ensure QR code directory exists
const QR_CODE_DIR = path.join(__dirname, '../public/qr-codes');

const ensureQRDirectory = async () => {
  try {
    await fs.access(QR_CODE_DIR);
  } catch (error) {
    await fs.mkdir(QR_CODE_DIR, { recursive: true });
  }
};

// Generate QR code for a member
exports.generateQRCode = async (memberId) => {
  try {
    await ensureQRDirectory();
    
    const fileName = `${memberId}.png`;
    const filePath = path.join(QR_CODE_DIR, fileName);
    
    // Generate QR code with member ID
    await QRCode.toFile(filePath, memberId, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Return the URL path for the QR code
    return `/qr-codes/${fileName}`;
  } catch (error) {
    throw new Error(`Error generating QR code: ${error.message}`);
  }
};

// Validate QR code data
exports.validateQRCode = (qrData) => {
  // Add any validation logic here
  // For example, check if the QR code data matches expected format
  return typeof qrData === 'string' && qrData.length > 0;
}; 