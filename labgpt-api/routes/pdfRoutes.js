// const express = require('express');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const puppeteer = require('puppeteer'); // Changed from html-pdf
// const { marked } = require('marked');

// const router = express.Router();

// // LOGGING SETUP
// const log = {
//   info: (message, data = null) => {
//     const timestamp = new Date().toISOString();
//     console.log(`[${timestamp}] INFO: ${message}`);
//     if (data) console.log('Data:', JSON.stringify(data, null, 2));
//   },
//   error: (message, error = null) => {
//     const timestamp = new Date().toISOString();
//     console.error(`[${timestamp}] ERROR: ${message}`);
//     if (error) {
//       console.error('Error details:', error.message);
//       console.error('Stack trace:', error.stack);
//     }
//   },
//   warn: (message, data = null) => {
//     const timestamp = new Date().toISOString();
//     console.warn(`[${timestamp}] WARN: ${message}`);
//     if (data) console.warn('Data:', data);
//   },
//   debug: (message, data = null) => {
//     const timestamp = new Date().toISOString();
//     console.log(`[${timestamp}] DEBUG: ${message}`);
//     if (data) console.log('Debug data:', JSON.stringify(data, null, 2));
//   }
// };

// // EMAIL SETUP
// const emailConfig = {
//   host: 'labmate.docspace.co.ke',
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.RESULTS_USER,
//     pass: process.env.RESULTS_PASS
//   }
// };

// // DECRYPT FUNCTION
// function decrypt(encryptedData, clientId) {
//   try {
//     log.debug('🔓 Starting decryption process', { 
//       encryptedDataLength: encryptedData.length,
//       clientIdLength: clientId.length 
//     });

//     const data = Buffer.from(encryptedData, 'base64');
//     log.debug('📊 Decoded base64 data', { dataLength: data.length });
    
//     if (data.length < 64) {
//       throw new Error(`Data too short: ${data.length} bytes (minimum 64 required)`);
//     }
    
//     const salt = data.slice(0, 16);
//     const iv = data.slice(16, 32);
//     const authTag = data.slice(32, 64);
//     const encrypted = data.slice(64);
    
//     log.debug('🔧 Extracted components', {
//       saltLength: salt.length,
//       ivLength: iv.length,
//       authTagLength: authTag.length,
//       encryptedLength: encrypted.length
//     });
    
//     const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
//     log.debug('✅ Keys derived successfully');
    
//     const hmacInput = Buffer.concat([salt, iv, encrypted]);
//     const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    
//     if (!authTag.equals(expectedTag)) {
//       throw new Error('HMAC verification failed - data may be corrupted or tampered with');
//     }
//     log.debug('✅ HMAC verification passed');
    
//     const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
//     let decrypted = decipher.update(encrypted, null, 'utf8');
//     decrypted += decipher.final('utf8');
    
//     log.info('✅ Decryption successful', { 
//       decryptedLength: decrypted.length,
//       preview: decrypted.substring(0, 100) + '...' 
//     });
    
//     return decrypted;
    
//   } catch (error) {
//     log.error('❌ Decryption failed', error);
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// // EXTRACT TEST TYPE AND FORMAT FROM AI RESPONSE
// function extractTestInfo(markdownText) {
//   try {
//     const jsonMatch = markdownText.match(/```json\s*({[\s\S]*?})\s*```/);
//     if (jsonMatch) {
//       try {
//         const parsedJson = JSON.parse(jsonMatch[1]);
//         return {
//           testType: parsedJson.testType || 'Medical Report',
//           format: parsedJson.format || 'narrative',
//           isValidTest: !!parsedJson.isValidTest
//         };
//       } catch (err) {
//         log.warn('Failed to parse JSON from AI response, using defaults');
//       }
//     }
//     const hasTable = markdownText.includes('|') && markdownText.includes('---');
//     const hasStructuredData = /\d+\.?\d*\s*(mg\/dL|g\/dL|mmol\/L|IU\/L|ng\/mL)/i.test(markdownText);
//     return {
//       testType: 'Medical Report',
//       format: (hasTable || hasStructuredData) ? 'structured' : 'narrative',
//       isValidTest: true
//     };
//   } catch (error) {
//     log.warn('Could not extract test info, using defaults');
//     return {
//       testType: 'Medical Report',
//       format: 'narrative',
//       isValidTest: true
//     };
//   }
// }

// // GENERATE CSS STYLES BASED ON REPORT FORMAT
// function generateCSS(format, testType) {
//   const baseCSS = `<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px;background:#fff}.header{text-align:center;border-bottom:3px solid #2c3e50;padding-bottom:20px;margin-bottom:30px}.header h1{color:#2c3e50;margin:0;font-size:28px;font-weight:600}.header .subtitle{color:#7f8c8d;font-size:14px;margin-top:5px}h2{color:#2c3e50;border-left:4px solid #3498db;padding-left:15px;margin-top:30px;margin-bottom:15px;font-size:20px}h3{color:#34495e;margin-top:25px;margin-bottom:12px;font-size:16px}p{margin-bottom:12px;text-align:justify}ul,ol{margin-bottom:15px;padding-left:25px}li{margin-bottom:8px}blockquote{background:#f8f9fa;border-left:4px solid #3498db;margin:20px 0;padding:15px 20px;font-style:italic;color:#555}code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:'Courier New',monospace;font-size:90%}pre{background:#f8f9fa;border:1px solid #e9ecef;border-radius:5px;padding:15px;overflow-x:auto;margin:15px 0}pre code{background:none;padding:0}.emoji-replacement{display:inline-block;background:#3498db;color:white;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:bold;margin-right:5px}.test-tube{background:#e74c3c}.doctor{background:#27ae60}.findings{background:#f39c12}.normal{background:#27ae60}.abnormal{background:#e74c3c}.warning{background:#f39c12}</style>`;
//   const structuredCSS = `<style>table{width:100%;border-collapse:collapse;margin:20px 0;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.1)}th{background:#34495e;color:white;padding:12px;text-align:left;font-weight:600;border-bottom:2px solid #2c3e50}td{padding:10px 12px;border-bottom:1px solid #ecf0f1;vertical-align:top}tr:nth-child(even){background:#f8f9fa}tr:hover{background:#e8f4f8}.value-normal{color:#27ae60;font-weight:600}.value-abnormal{color:#e74c3c;font-weight:600}.value-borderline{color:#f39c12;font-weight:600}.summary-box{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:10px;margin:20px 0;text-align:center}.summary-box h3{margin:0 0 10px 0;color:white}</style>`;
//   const narrativeCSS = `<style>.observation-item{background:#f8f9fa;border-left:4px solid #3498db;margin:15px 0;padding:15px 20px;border-radius:0 5px 5px 0}.observation-item strong{color:#2c3e50}.conclusion-box{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:25px;border-radius:10px;margin:25px 0;text-align:center}.conclusion-box h3{margin:0 0 15px 0;color:white}.key-findings{background:#fff;border:2px solid #3498db;border-radius:8px;padding:20px;margin:20px 0}</style>`;
//   return baseCSS + (format === 'structured' ? structuredCSS : narrativeCSS);
// }

// // CLEAN AND PROCESS MARKDOWN CONTENT
// function processMarkdownContent(markdownText, testInfo) {
//   try {
//     let cleanedText = markdownText.replace(/```json[\s\S]*?```\s*/, '').trim();
//     const emojiReplacements = {'🧪':'<span class="emoji-replacement test-tube">TEST</span>','🔍':'<span class="emoji-replacement findings">FINDINGS</span>','🧑‍⚕️':'<span class="emoji-replacement doctor">DOCTOR</span>','📝':'<span class="emoji-replacement">NOTE</span>','❌':'<span class="emoji-replacement abnormal">HIGH/LOW</span>','✅':'<span class="emoji-replacement normal">NORMAL</span>','⚠️':'<span class="emoji-replacement warning">WARNING</span>','📊':'<span class="emoji-replacement">DATA</span>','🩺':'<span class="emoji-replacement doctor">MEDICAL</span>','📄':'<span class="emoji-replacement">REPORT</span>','📌':'<span class="emoji-replacement">KEY</span>'};
//     Object.entries(emojiReplacements).forEach(([emoji, replacement]) => {
//       cleanedText = cleanedText.replace(new RegExp(emoji, 'g'), replacement);
//     });
//     let htmlContent = marked(cleanedText);
//     htmlContent = htmlContent
//       .replace(/<table>/g, '<table class="data-table">')
//       .replace(/>\s*✅\s*Normal\s*</g, '><span class="value-normal">✅ Normal</span><')
//       .replace(/>\s*❌\s*(High|Low|Abnormal)\s*</g, '><span class="value-abnormal">❌ $1</span><')
//       .replace(/>\s*⚠️\s*(Borderline|Review)\s*</g, '><span class="value-borderline">⚠️ $1</span><');
//     return htmlContent;
//   } catch (error) {
//     log.error('Error processing markdown content', error);
//     return `<p>Error processing content: ${error.message}</p>`;
//   }
// }

// // GENERATE COMPLETE HTML DOCUMENT
// function generateHTML(markdownText, testInfo, filename) {
//   const processedContent = processMarkdownContent(markdownText, testInfo);
//   const css = generateCSS(testInfo.format, testInfo.testType);
//   const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
//   return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${testInfo.testType} - ${filename}</title>${css}</head><body><div class="header"><h1>${testInfo.testType}</h1><div class="subtitle">Generated on ${currentDate} | Format: ${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</div></div><div class="content">${processedContent}</div><div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;"><p>This report was generated by DocSpace AI Medical Interpretation Service</p><p><strong>Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p></div></body></html>`;
// }


// // SIMPLIFIED MARKDOWN TO PDF CONVERTER FOR PUPPETEER DOCKER IMAGE
// // CLEAN MARKDOWN TO PDF CONVERTER FOR OFFICIAL PUPPETEER DOCKER IMAGE
// async function markdownToPDF(markdownText, filename = 'document.pdf') {
//   log.debug('📝 Starting markdown to PDF conversion using Puppeteer');

//   let browser;
//   try {
//     const testInfo = extractTestInfo(markdownText);
//     log.debug('🔍 Extracted test info', testInfo);
    
//     const htmlContent = generateHTML(markdownText, testInfo, filename);
//     log.debug('📄 Generated HTML content', { htmlLength: htmlContent.length });

//     // Launch browser with minimal configuration for official Puppeteer image
//     browser = await puppeteer.launch({
//       headless: true,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage'
//       ]
//     });

//     const page = await browser.newPage();
//     await page.setViewport({ width: 1200, height: 800 });
    
//     await page.setContent(htmlContent, { 
//       waitUntil: 'networkidle0',
//       timeout: 30000
//     });

//     const pdfBuffer = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: {
//         top: '20mm',
//         right: '15mm',
//         bottom: '20mm',
//         left: '15mm'
//       },
//       displayHeaderFooter: true,
//       headerTemplate: `<div style="width: 100%; font-size: 9px; padding: 0 15mm; color: #666; text-align: center;"></div>`,
//       footerTemplate: `<div style="width: 100%; font-size: 10px; padding: 0 15mm; color: #666; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span> - Generated by DocSpace PDF Service</div>`
//     });

//     log.info('✅ PDF generated successfully with Puppeteer', { 
//       pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
//     });

//     return pdfBuffer;

//   } catch (error) {
//     log.error('❌ Puppeteer PDF conversion failed', error);
//     throw new Error(`PDF generation failed: ${error.message}`);
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// }

// // PDF GENERATION ROUTE
// router.post('/generate', async (req, res) => {
//   const startTime = Date.now();
//   const requestId = Math.random().toString(36).substring(7);
  
//   log.info(`🚀 New PDF generation request [${requestId}]`, { ip: req.ip, userAgent: req.get('User-Agent') });

//   try {
//     const { encryptedContent, clientId, emailAddress, filename } = req.body;
    
//     if (!encryptedContent || !clientId || !emailAddress) {
//       const missingFields = ['encryptedContent', 'clientId', 'emailAddress'].filter(f => !req.body[f]);
//       log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });
//       return res.status(400).json({ error: 'Missing required fields', missing: missingFields, requestId });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(emailAddress)) {
//       log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });
//       return res.status(400).json({ error: 'Invalid email format', requestId });
//     }

//     log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
//     const aiInterpretation = decrypt(encryptedContent, clientId);
    
//     log.info(`📄 Step 2: Generating PDF from AI interpretation [${requestId}]`);
//     const pdfBuffer = await markdownToPDF(aiInterpretation, filename);
    
//     log.info(`📧 Step 3: Sending email [${requestId}]`, { to: emailAddress });
    
//     // Debug email configuration
//     log.debug(`📧 Email config check [${requestId}]`, {
//       host: emailConfig.host,
//       port: emailConfig.port,
//       secure: emailConfig.secure,
//       hasUser: !!emailConfig.auth.user,
//       hasPass: !!emailConfig.auth.pass,
//       userLength: emailConfig.auth.user ? emailConfig.auth.user.length : 0
//     });
    
//     const transporter = nodemailer.createTransport(emailConfig);
//     const testInfo = extractTestInfo(aiInterpretation);
    
//     const mailOptions = {
//       from: emailConfig.auth.user,
//       to: emailAddress,
//       subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,
//       html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7f6;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;"><h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready!</h2></div><div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;"><p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p><div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;"><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${filename || 'medical-report.pdf'}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📊 Format:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📅 Generated:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${new Date().toLocaleString()}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📦 Size:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td></tr><tr><td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td><td style="padding: 8px 0;">${requestId}</td></tr></table></div><div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="margin: 0;"><strong>⚠️ Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice. Please consult with your healthcare provider for proper medical interpretation and treatment recommendations.</p></div><p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 30px;">Generated by DocSpace AI Medical Interpretation Service<br>Powered by Advanced AI Technology</p></div></div>`,
//       attachments: [{
//         filename: filename || 'medical-report.pdf',
//         content: pdfBuffer,
//         contentType: 'application/pdf'
//       }]
//     };
    
//     try {
//       await transporter.sendMail(mailOptions);
//       log.info(`📧 Email sent successfully [${requestId}]`, { to: emailAddress });
//     } catch (emailError) {
//       log.error(`📧 Email sending failed [${requestId}]`, emailError);
//       throw new Error(`Email sending failed: ${emailError.message}`);
//     }
    
//     const duration = Date.now() - startTime;
//     log.info(`🎉 Request completed successfully [${requestId}]`, { duration: `${duration}ms`, to: emailAddress });
    
//     res.json({ 
//       success: true, 
//       message: 'Medical report PDF generated and sent successfully!',
//       requestId,
//       duration,
//       details: {
//         emailAddress,
//         filename: filename || 'medical-report.pdf',
//         testType: testInfo.testType,
//         format: testInfo.format,
//         isValidTest: testInfo.isValidTest,
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
//       }
//     });
    
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     log.error(`💥 Request failed [${requestId}]`, { 
//       error: error.message, 
//       duration: `${duration}ms`,
//       stack: error.stack 
//     });
    
//     let statusCode = 500;
//     let errorType = 'INTERNAL_ERROR';
//     if (error.message.includes('Decryption failed')) {
//       statusCode = 400;
//       errorType = 'DECRYPTION_ERROR';
//     } else if (error.message.includes('Email sending failed')) {
//       statusCode = 503;
//       errorType = 'EMAIL_ERROR';
//     } else if (error.message.includes('PDF generation failed')) {
//       statusCode = 500;
//       errorType = 'PDF_ERROR';
//     }
    
//     res.status(statusCode).json({ 
//       error: error.message, 
//       errorType, 
//       requestId, 
//       duration,
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// });

// // Health check for PDF service
// router.get('/health', (req, res) => {
//   log.info('🏥 PDF service health check requested');
//   res.json({
//     status: 'OK',
//     service: 'PDF Generation Service (Puppeteer)', // Updated service name
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     supportedFormats: ['structured', 'narrative', 'invalid']
//   });
// });

// // Add this debug route to your router
// router.get('/debug-chrome', async (req, res) => {
//   try {
//     const fs = require('fs');
//     const { execSync } = require('child_process');
    
//     const chromePaths = [
//       '/usr/bin/google-chrome-stable',
//       '/usr/bin/google-chrome',
//       '/usr/bin/chromium-browser',
//       '/usr/bin/chromium'
//     ];
    
//     const debugInfo = {
//       environment: {
//         PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
//         PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
//         NODE_ENV: process.env.NODE_ENV
//       },
//       chromePaths: {},
//       chromeVersion: null,
//       puppeteerVersion: null
//     };
    
//     // Check each Chrome path
//     for (const path of chromePaths) {
//       debugInfo.chromePaths[path] = fs.existsSync(path);
//     }
    
//     // Try to get Chrome version
//     try {
//       const version = execSync('/usr/bin/google-chrome-stable --version', { encoding: 'utf8' });
//       debugInfo.chromeVersion = version.trim();
//     } catch (err) {
//       debugInfo.chromeVersion = `Error: ${err.message}`;
//     }
    
//     // Get Puppeteer version
//     try {
//       const puppeteerPackage = require('puppeteer/package.json');
//       debugInfo.puppeteerVersion = puppeteerPackage.version;
//     } catch (err) {
//       debugInfo.puppeteerVersion = `Error: ${err.message}`;
//     }
    
//     // Try to launch browser
//     try {
//       const browser = await puppeteer.launch({
//         headless: true,
//         args: ['--no-sandbox', '--disable-setuid-sandbox']
//       });
//       await browser.close();
//       debugInfo.browserLaunch = 'Success';
//     } catch (err) {
//       debugInfo.browserLaunch = `Error: ${err.message}`;
//     }
    
//     res.json(debugInfo);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer'); // Changed from html-pdf
const { marked } = require('marked');
const fs = require('fs'); // <-- ADDED: For file system access
const path = require('path'); // <-- ADDED: For handling file paths

const router = express.Router();

// LOGGING SETUP (No changes here)
const log = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
    if (data) console.log('Data:', JSON.stringify(data, null, 2));
  },
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  },
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`);
    if (data) console.warn('Data:', data);
  },
  debug: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`);
    if (data) console.log('Debug data:', JSON.stringify(data, null, 2));
  }
};

// --- NEW: LOAD AND ENCODE LOGO ---
let logoBase64 = '';
try {
  // Assumes this file is in a subdirectory (e.g., 'routes') of your app's root.
  // path.join constructs a correct path: .../app_root/assets/labmatelogo.png
  const logoPath = path.join(__dirname, '..', 'assets', 'labmatelogo.png');
  const logoBuffer = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  log.info('✅ Logo loaded and encoded successfully.');
} catch (error) {
  log.error('❌ Could not load logo file from assets/labmatelogo.png. The PDF will be generated without it.', error);
}
// --- END NEW SECTION ---


// EMAIL SETUP (No changes here)
const emailConfig = {
  host: 'labmate.docspace.co.ke',
  port: 465,
  secure: true,
  auth: {
    user: process.env.RESULTS_USER,
    pass: process.env.RESULTS_PASS
  }
};

// DECRYPT FUNCTION (No changes here)
function decrypt(encryptedData, clientId) {
  try {
    log.debug('🔓 Starting decryption process', { 
      encryptedDataLength: encryptedData.length,
      clientIdLength: clientId.length 
    });

    const data = Buffer.from(encryptedData, 'base64');
    log.debug('📊 Decoded base64 data', { dataLength: data.length });
    
    if (data.length < 64) {
      throw new Error(`Data too short: ${data.length} bytes (minimum 64 required)`);
    }
    
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 32);
    const authTag = data.slice(32, 64);
    const encrypted = data.slice(64);
    
    log.debug('🔧 Extracted components', {
      saltLength: salt.length,
      ivLength: iv.length,
      authTagLength: authTag.length,
      encryptedLength: encrypted.length
    });
    
    const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
    log.debug('✅ Keys derived successfully');
    
    const hmacInput = Buffer.concat([salt, iv, encrypted]);
    const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    
    if (!authTag.equals(expectedTag)) {
      throw new Error('HMAC verification failed - data may be corrupted or tampered with');
    }
    log.debug('✅ HMAC verification passed');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    log.info('✅ Decryption successful', { 
      decryptedLength: decrypted.length,
      preview: decrypted.substring(0, 100) + '...' 
    });
    
    return decrypted;
    
  } catch (error) {
    log.error('❌ Decryption failed', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// EXTRACT TEST TYPE AND FORMAT FROM AI RESPONSE (No changes here)
function extractTestInfo(markdownText) {
  try {
    const jsonMatch = markdownText.match(/```json\s*({[\s\S]*?})\s*```/);
    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1]);
        return {
          testType: parsedJson.testType || 'Medical Report',
          format: parsedJson.format || 'narrative',
          isValidTest: !!parsedJson.isValidTest
        };
      } catch (err) {
        log.warn('Failed to parse JSON from AI response, using defaults');
      }
    }
    const hasTable = markdownText.includes('|') && markdownText.includes('---');
    const hasStructuredData = /\d+\.?\d*\s*(mg\/dL|g\/dL|mmol\/L|IU\/L|ng\/mL)/i.test(markdownText);
    return {
      testType: 'Medical Report',
      format: (hasTable || hasStructuredData) ? 'structured' : 'narrative',
      isValidTest: true
    };
  } catch (error) {
    log.warn('Could not extract test info, using defaults');
    return {
      testType: 'Medical Report',
      format: 'narrative',
      isValidTest: true
    };
  }
}

// GENERATE CSS STYLES BASED ON REPORT FORMAT
function generateCSS(format, testType) {
  // --- MODIFIED: Added styles for the logo image ---
  const baseCSS = `<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px;background:#fff}.header{text-align:center;border-bottom:3px solid #2c3e50;padding-bottom:20px;margin-bottom:30px}.header img{max-height:70px;margin-bottom:15px}.header h1{color:#2c3e50;margin:0;font-size:28px;font-weight:600}.header .subtitle{color:#7f8c8d;font-size:14px;margin-top:5px}h2{color:#2c3e50;border-left:4px solid #3498db;padding-left:15px;margin-top:30px;margin-bottom:15px;font-size:20px}h3{color:#34495e;margin-top:25px;margin-bottom:12px;font-size:16px}p{margin-bottom:12px;text-align:justify}ul,ol{margin-bottom:15px;padding-left:25px}li{margin-bottom:8px}blockquote{background:#f8f9fa;border-left:4px solid #3498db;margin:20px 0;padding:15px 20px;font-style:italic;color:#555}code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:'Courier New',monospace;font-size:90%}pre{background:#f8f9fa;border:1px solid #e9ecef;border-radius:5px;padding:15px;overflow-x:auto;margin:15px 0}pre code{background:none;padding:0}.emoji-replacement{display:inline-block;background:#3498db;color:white;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:bold;margin-right:5px}.test-tube{background:#e74c3c}.doctor{background:#27ae60}.findings{background:#f39c12}.normal{background:#27ae60}.abnormal{background:#e74c3c}.warning{background:#f39c12}</style>`;
  const structuredCSS = `<style>table{width:100%;border-collapse:collapse;margin:20px 0;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.1)}th{background:#34495e;color:white;padding:12px;text-align:left;font-weight:600;border-bottom:2px solid #2c3e50}td{padding:10px 12px;border-bottom:1px solid #ecf0f1;vertical-align:top}tr:nth-child(even){background:#f8f9fa}tr:hover{background:#e8f4f8}.value-normal{color:#27ae60;font-weight:600}.value-abnormal{color:#e74c3c;font-weight:600}.value-borderline{color:#f39c12;font-weight:600}.summary-box{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:10px;margin:20px 0;text-align:center}.summary-box h3{margin:0 0 10px 0;color:white}</style>`;
  const narrativeCSS = `<style>.observation-item{background:#f8f9fa;border-left:4px solid #3498db;margin:15px 0;padding:15px 20px;border-radius:0 5px 5px 0}.observation-item strong{color:#2c3e50}.conclusion-box{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:25px;border-radius:10px;margin:25px 0;text-align:center}.conclusion-box h3{margin:0 0 15px 0;color:white}.key-findings{background:#fff;border:2px solid #3498db;border-radius:8px;padding:20px;margin:20px 0}</style>`;
  return baseCSS + (format === 'structured' ? structuredCSS : narrativeCSS);
}

// CLEAN AND PROCESS MARKDOWN CONTENT (No changes here)
function processMarkdownContent(markdownText, testInfo) {
  try {
    let cleanedText = markdownText.replace(/```json[\s\S]*?```\s*/, '').trim();
    const emojiReplacements = {'🧪':'<span class="emoji-replacement test-tube">TEST</span>','🔍':'<span class="emoji-replacement findings">FINDINGS</span>','🧑‍⚕️':'<span class="emoji-replacement doctor">DOCTOR</span>','📝':'<span class="emoji-replacement">NOTE</span>','❌':'<span class="emoji-replacement abnormal">HIGH/LOW</span>','✅':'<span class="emoji-replacement normal">NORMAL</span>','⚠️':'<span class="emoji-replacement warning">WARNING</span>','📊':'<span class="emoji-replacement">DATA</span>','🩺':'<span class="emoji-replacement doctor">MEDICAL</span>','📄':'<span class="emoji-replacement">REPORT</span>','📌':'<span class="emoji-replacement">KEY</span>'};
    Object.entries(emojiReplacements).forEach(([emoji, replacement]) => {
      cleanedText = cleanedText.replace(new RegExp(emoji, 'g'), replacement);
    });
    let htmlContent = marked(cleanedText);
    htmlContent = htmlContent
      .replace(/<table>/g, '<table class="data-table">')
      .replace(/>\s*✅\s*Normal\s*</g, '><span class="value-normal">✅ Normal</span><')
      .replace(/>\s*❌\s*(High|Low|Abnormal)\s*</g, '><span class="value-abnormal">❌ $1</span><')
      .replace(/>\s*⚠️\s*(Borderline|Review)\s*</g, '><span class="value-borderline">⚠️ $1</span><');
    return htmlContent;
  } catch (error) {
    log.error('Error processing markdown content', error);
    return `<p>Error processing content: ${error.message}</p>`;
  }
}

// GENERATE COMPLETE HTML DOCUMENT
function generateHTML(markdownText, testInfo, filename) {
  const processedContent = processMarkdownContent(markdownText, testInfo);
  const css = generateCSS(testInfo.format, testInfo.testType);
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  
  // --- MODIFIED: Add logo element if it exists ---
  const logoElement = logoBase64 
    ? `<img src="${logoBase64}" alt="LabMate Logo">` 
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${testInfo.testType} - ${filename}</title>${css}</head><body><div class="header">${logoElement}<h1>${testInfo.testType}</h1><div class="subtitle">Generated on ${currentDate} | Format: ${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</div></div><div class="content">${processedContent}</div><div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;"><p>This report was generated by DocSpace AI Medical Interpretation Service</p><p><strong>Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p></div></body></html>`;
}


// CLEAN MARKDOWN TO PDF CONVERTER FOR OFFICIAL PUPPETEER DOCKER IMAGE (No changes here)
async function markdownToPDF(markdownText, filename = 'document.pdf') {
  log.debug('📝 Starting markdown to PDF conversion using Puppeteer');

  let browser;
  try {
    const testInfo = extractTestInfo(markdownText);
    log.debug('🔍 Extracted test info', testInfo);
    
    const htmlContent = generateHTML(markdownText, testInfo, filename);
    log.debug('📄 Generated HTML content', { htmlLength: htmlContent.length });

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `<div style="width: 100%; font-size: 9px; padding: 0 15mm; color: #666; text-align: center;"></div>`,
      footerTemplate: `<div style="width: 100%; font-size: 10px; padding: 0 15mm; color: #666; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span> - Generated by DocSpace PDF Service</div>`
    });

    log.info('✅ PDF generated successfully with Puppeteer', { 
      pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
    });

    return pdfBuffer;

  } catch (error) {
    log.error('❌ Puppeteer PDF conversion failed', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// PDF GENERATION ROUTE (No changes from this point onwards)
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  log.info(`🚀 New PDF generation request [${requestId}]`, { ip: req.ip, userAgent: req.get('User-Agent') });

  try {
    const { encryptedContent, clientId, emailAddress, filename } = req.body;
    
    if (!encryptedContent || !clientId || !emailAddress) {
      const missingFields = ['encryptedContent', 'clientId', 'emailAddress'].filter(f => !req.body[f]);
      log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });
      return res.status(400).json({ error: 'Missing required fields', missing: missingFields, requestId });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });
      return res.status(400).json({ error: 'Invalid email format', requestId });
    }

    log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
    const aiInterpretation = decrypt(encryptedContent, clientId);
    
    log.info(`📄 Step 2: Generating PDF from AI interpretation [${requestId}]`);
    const pdfBuffer = await markdownToPDF(aiInterpretation, filename);
    
    log.info(`📧 Step 3: Sending email [${requestId}]`, { to: emailAddress });
    
    log.debug(`📧 Email config check [${requestId}]`, {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      hasUser: !!emailConfig.auth.user,
      hasPass: !!emailConfig.auth.pass,
      userLength: emailConfig.auth.user ? emailConfig.auth.user.length : 0
    });
    
    const transporter = nodemailer.createTransport(emailConfig);
    const testInfo = extractTestInfo(aiInterpretation);
    
    const mailOptions = {
      from: emailConfig.auth.user,
      to: emailAddress,
      subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7f6;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;"><h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready!</h2></div><div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;"><p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p><div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;"><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${filename || 'medical-report.pdf'}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📊 Format:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📅 Generated:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${new Date().toLocaleString()}</td></tr><tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📦 Size:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td></tr><tr><td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td><td style="padding: 8px 0;">${requestId}</td></tr></table></div><div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="margin: 0;"><strong>⚠️ Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice. Please consult with your healthcare provider for proper medical interpretation and treatment recommendations.</p></div><p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 30px;">Generated by DocSpace AI Medical Interpretation Service<br>Powered by Advanced AI Technology</p></div></div>`,
      attachments: [{
        filename: filename || 'medical-report.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
    
    try {
      await transporter.sendMail(mailOptions);
      log.info(`📧 Email sent successfully [${requestId}]`, { to: emailAddress });
    } catch (emailError) {
      log.error(`📧 Email sending failed [${requestId}]`, emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }
    
    const duration = Date.now() - startTime;
    log.info(`🎉 Request completed successfully [${requestId}]`, { duration: `${duration}ms`, to: emailAddress });
    
    res.json({ 
      success: true, 
      message: 'Medical report PDF generated and sent successfully!',
      requestId,
      duration,
      details: {
        emailAddress,
        filename: filename || 'medical-report.pdf',
        testType: testInfo.testType,
        format: testInfo.format,
        isValidTest: testInfo.isValidTest,
        pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`💥 Request failed [${requestId}]`, { 
      error: error.message, 
      duration: `${duration}ms`,
      stack: error.stack 
    });
    
    let statusCode = 500;
    let errorType = 'INTERNAL_ERROR';
    if (error.message.includes('Decryption failed')) {
      statusCode = 400;
      errorType = 'DECRYPTION_ERROR';
    } else if (error.message.includes('Email sending failed')) {
      statusCode = 503;
      errorType = 'EMAIL_ERROR';
    } else if (error.message.includes('PDF generation failed')) {
      statusCode = 500;
      errorType = 'PDF_ERROR';
    }
    
    res.status(statusCode).json({ 
      error: error.message, 
      errorType, 
      requestId, 
      duration,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check for PDF service
router.get('/health', (req, res) => {
  log.info('🏥 PDF service health check requested');
  res.json({
    status: 'OK',
    service: 'PDF Generation Service (Puppeteer)', // Updated service name
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    supportedFormats: ['structured', 'narrative', 'invalid']
  });
});

// Add this debug route to your router
router.get('/debug-chrome', async (req, res) => {
  try {
    const fs = require('fs');
    const { execSync } = require('child_process');
    
    const chromePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
    
    const debugInfo = {
      environment: {
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
        NODE_ENV: process.env.NODE_ENV
      },
      chromePaths: {},
      chromeVersion: null,
      puppeteerVersion: null
    };
    
    for (const path of chromePaths) {
      debugInfo.chromePaths[path] = fs.existsSync(path);
    }
    
    try {
      const version = execSync('/usr/bin/google-chrome-stable --version', { encoding: 'utf8' });
      debugInfo.chromeVersion = version.trim();
    } catch (err) {
      debugInfo.chromeVersion = `Error: ${err.message}`;
    }
    
    try {
      const puppeteerPackage = require('puppeteer/package.json');
      debugInfo.puppeteerVersion = puppeteerPackage.version;
    } catch (err) {
      debugInfo.puppeteerVersion = `Error: ${err.message}`;
    }
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      await browser.close();
      debugInfo.browserLaunch = 'Success';
    } catch (err) {
      debugInfo.browserLaunch = `Error: ${err.message}`;
    }
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;