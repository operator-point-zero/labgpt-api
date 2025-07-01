// // routes/pdfRoutes.js
// const express = require('express');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const PDFDocument = require('pdfkit');
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
//   host: 'mail.docspace.co.ke',
//   port: 465,
//   secure: true,
//   auth: {
//     user: 'mailtest@docspace.co.ke',
//     pass: '~iizVde!Ua^SP;MD'
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
    
//     // Extract parts
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
    
//     // Make keys
//     log.debug('🔑 Deriving encryption keys...');
//     const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
//     log.debug('✅ Keys derived successfully');
    
//     // Check if data is valid
//     log.debug('🔐 Verifying HMAC authentication...');
//     const hmacInput = Buffer.concat([salt, iv, encrypted]);
//     const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    
//     if (!authTag.equals(expectedTag)) {
//       throw new Error('HMAC verification failed - data may be corrupted or tampered with');
//     }
//     log.debug('✅ HMAC verification passed');
    
//     // Decrypt
//     log.debug('🔓 Performing AES decryption...');
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

// // CLEAN AND EXTRACT MARKDOWN CONTENT
// function extractMarkdownContent(text) {
//   try {
//     // If the text looks like JSON, try to extract the interpretation field
//     if (text.trim().startsWith('{') && text.includes('interpretation:')) {
//       const match = text.match(/interpretation:\s*(.+?)(?:,\s*testType:|$)/s);
//       if (match) {
//         return match[1].trim();
//       }
//     }
    
//     // Otherwise return the text as-is
//     return text;
//   } catch (error) {
//     log.warn('Could not extract markdown content, using original text');
//     return text;
//   }
// }

// // SAFE TEXT PROCESSING (removes problematic characters)
// function safeText(text) {
//   if (!text) return '';
  
//   // Remove or replace problematic characters
//   return text
//     .replace(/[^\x00-\x7F]/g, (char) => {
//       // Replace common emojis with text equivalents
//       const emojiMap = {
//         '🧪': '[Test]',
//         '🔍': '[Findings]',
//         '🧑‍⚕️': '[Doctor]',
//         '📝': '[Note]',
//         '❌': '[High/Low]',
//         '✅': '[Normal]',
//         '⚠️': '[Warning]',
//         '📊': '[Data]',
//         '🩺': '[Medical]'
//       };
//       return emojiMap[char] || '';
//     })
//     .replace(/\s+/g, ' ')
//     .trim();
// }

// // MARKDOWN TO PDF CONVERTER USING PDFKIT
// function markdownToPDF(markdownText) {
//   return new Promise((resolve, reject) => {
//     try {
//       log.debug('📝 Starting markdown to PDF conversion');
      
//       // Extract and clean the markdown content
//       const cleanedText = extractMarkdownContent(markdownText);
//       log.debug('🧹 Cleaned markdown text', { 
//         originalLength: markdownText.length,
//         cleanedLength: cleanedText.length 
//       });
      
//       // Parse markdown to get structured data
//       const tokens = marked.lexer(cleanedText);
//       log.debug('🔍 Parsed markdown tokens', { tokenCount: tokens.length });
      
//       // Create PDF document
//       const doc = new PDFDocument({
//         size: 'A4',
//         margins: {
//           top: 50,
//           bottom: 50,
//           left: 50,
//           right: 50
//         }
//       });
      
//       // Collect PDF data
//       const chunks = [];
//       doc.on('data', chunk => chunks.push(chunk));
//       doc.on('end', () => {
//         const pdfBuffer = Buffer.concat(chunks);
//         log.debug('✅ PDF generation completed', { 
//           pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
//         });
//         resolve(pdfBuffer);
//       });
      
//       doc.on('error', (error) => {
//         log.error('❌ PDF generation error', error);
//         reject(error);
//       });
      
//       // Process each token
//       let isFirstPage = true;
      
//       tokens.forEach((token, index) => {
//         try {
//           switch (token.type) {
//             case 'heading':
//               if (!isFirstPage && token.depth === 1) {
//                 doc.addPage();
//               }
              
//               const fontSize = token.depth === 1 ? 24 : 
//                              token.depth === 2 ? 20 : 
//                              token.depth === 3 ? 16 : 14;
              
//               const cleanHeading = safeText(token.text);
//               doc.fontSize(fontSize)
//                  .font('Helvetica-Bold')
//                  .fillColor('#2c3e50')
//                  .text(cleanHeading, { align: 'left' })
//                  .moveDown(0.5);
              
//               if (token.depth <= 2) {
//                 doc.strokeColor('#3498db')
//                    .lineWidth(token.depth === 1 ? 2 : 1)
//                    .moveTo(doc.x, doc.y)
//                    .lineTo(doc.x + 400, doc.y)
//                    .stroke()
//                    .moveDown(0.5);
//               }
//               break;
              
//             case 'paragraph':
//               const cleanParagraph = safeText(token.text);
//               if (cleanParagraph) {
//                 doc.fontSize(12)
//                    .font('Helvetica')
//                    .fillColor('#333333')
//                    .text(cleanParagraph, { 
//                      align: 'justify',
//                      lineGap: 2
//                    })
//                    .moveDown(0.8);
//               }
//               break;
              
//             case 'list':
//               token.items.forEach((item, itemIndex) => {
//                 const bullet = token.ordered ? `${itemIndex + 1}. ` : '• ';
//                 const cleanItem = safeText(item.text);
//                 if (cleanItem) {
//                   doc.fontSize(12)
//                      .font('Helvetica')
//                      .fillColor('#333333')
//                      .text(bullet + cleanItem, { 
//                        indent: 20,
//                        align: 'left'
//                      });
//                 }
//               });
//               doc.moveDown(0.8);
//               break;
              
//             case 'table':
//               // Handle tables manually since PDFKit doesn't have built-in table support
//               if (token.header && token.rows) {
//                 // Table header
//                 doc.fontSize(10)
//                    .font('Helvetica-Bold')
//                    .fillColor('#2c3e50');
                
//                 const colWidth = 120;
//                 let startX = doc.x;
//                 let startY = doc.y;
                
//                 // Draw header
//                 token.header.forEach((header, i) => {
//                   const cleanHeader = safeText(header);
//                   doc.text(cleanHeader, startX + (i * colWidth), startY, {
//                     width: colWidth - 10,
//                     height: 20
//                   });
//                 });
                
//                 doc.moveDown(1);
                
//                 // Draw horizontal line after header
//                 doc.strokeColor('#cccccc')
//                    .lineWidth(1)
//                    .moveTo(startX, doc.y)
//                    .lineTo(startX + (token.header.length * colWidth), doc.y)
//                    .stroke();
                
//                 doc.moveDown(0.5);
                
//                 // Draw rows
//                 token.rows.forEach((row, rowIndex) => {
//                   startY = doc.y;
//                   doc.fontSize(10)
//                      .font('Helvetica')
//                      .fillColor('#333333');
                  
//                   row.forEach((cell, colIndex) => {
//                     const cleanCell = safeText(cell);
//                     doc.text(cleanCell, startX + (colIndex * colWidth), startY, {
//                       width: colWidth - 10,
//                       height: 20
//                     });
//                   });
                  
//                   doc.moveDown(1);
//                 });
                
//                 doc.moveDown(0.5);
//               }
//               break;
              
//             case 'blockquote':
//               const cleanQuote = safeText(token.text);
//               if (cleanQuote) {
//                 doc.rect(doc.x, doc.y, 4, 20)
//                    .fillColor('#3498db')
//                    .fill();
                
//                 doc.fontSize(12)
//                    .font('Helvetica-Oblique')
//                    .fillColor('#555555')
//                    .text(cleanQuote, { 
//                      indent: 20,
//                      align: 'left'
//                    })
//                    .moveDown(0.8);
//               }
//               break;
              
//             case 'code':
//               const cleanCode = safeText(token.text);
//               if (cleanCode) {
//                 doc.rect(doc.x - 10, doc.y - 5, 420, 20)
//                    .fillColor('#f8f9fa')
//                    .fill();
                
//                 doc.fontSize(10)
//                    .font('Courier')
//                    .fillColor('#333333')
//                    .text(cleanCode, { 
//                      align: 'left'
//                    })
//                    .moveDown(0.8);
//               }
//               break;
              
//             case 'hr':
//               doc.strokeColor('#cccccc')
//                  .lineWidth(1)
//                  .moveTo(doc.x, doc.y)
//                  .lineTo(doc.x + 400, doc.y)
//                  .stroke()
//                  .moveDown(1);
//               break;
              
//             case 'space':
//               doc.moveDown(0.5);
//               break;
              
//             default:
//               // Handle any other token types as plain text
//               if (token.text) {
//                 const cleanText = safeText(token.text);
//                 if (cleanText) {
//                   doc.fontSize(12)
//                      .font('Helvetica')
//                      .fillColor('#333333')
//                      .text(cleanText)
//                      .moveDown(0.5);
//                 }
//               }
//               break;
//           }
          
//           isFirstPage = false;
          
//         } catch (tokenError) {
//           log.error(`❌ Error processing token ${index}`, tokenError);
//           // Continue processing other tokens
//         }
//       });
      
//       // Add footer to all pages
//       const pageCount = doc.bufferedPageRange().count;
//       for (let i = 0; i < pageCount; i++) {
//         doc.switchToPage(i);
//         doc.fontSize(8)
//            .fillColor('#999999')
//            .text(`Page ${i + 1} of ${pageCount}`, 
//                  50, 
//                  doc.page.height - 30, 
//                  { align: 'center' });
//       }
      
//       // Finalize the PDF
//       doc.end();
      
//     } catch (error) {
//       log.error('❌ Markdown to PDF conversion failed', error);
//       reject(error);
//     }
//   });
// }

// // PDF GENERATION ROUTE
// router.post('/generate', async (req, res) => {
//   const startTime = Date.now();
//   const requestId = Math.random().toString(36).substring(7);
  
//   log.info(`🚀 New PDF generation request [${requestId}]`, {
//     ip: req.ip,
//     userAgent: req.get('User-Agent'),
//     contentLength: req.get('Content-Length')
//   });

//   try {
//     // Validate request body
//     const { encryptedContent, clientId, emailAddress, filename } = req.body;
    
//     log.debug(`📝 Request validation [${requestId}]`, {
//       hasEncryptedContent: !!encryptedContent,
//       hasClientId: !!clientId,
//       hasEmailAddress: !!emailAddress,
//       filename: filename || 'not provided'
//     });

//     if (!encryptedContent || !clientId || !emailAddress) {
//       const missingFields = [];
//       if (!encryptedContent) missingFields.push('encryptedContent');
//       if (!clientId) missingFields.push('clientId');
//       if (!emailAddress) missingFields.push('emailAddress');
      
//       log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });
//       return res.status(400).json({ 
//         error: 'Missing required fields', 
//         missing: missingFields,
//         requestId 
//       });
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(emailAddress)) {
//       log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });
//       return res.status(400).json({ 
//         error: 'Invalid email format',
//         requestId 
//       });
//     }

//     log.info(`✅ Request validation passed [${requestId}]`);
    
//     // 1. Decrypt the text
//     log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
//     const originalText = decrypt(encryptedContent, clientId);
    
//     // 2. Generate PDF directly from markdown using PDFKit
//     log.info(`📄 Step 2: Generating PDF from markdown [${requestId}]`);
//     let pdfBuffer;
//     try {
//       pdfBuffer = await markdownToPDF(originalText);
//       log.info(`✅ PDF generated successfully [${requestId}]`, { 
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
//       });
//     } catch (pdfError) {
//       log.error(`❌ PDF generation failed [${requestId}]`, pdfError);
//       throw new Error(`PDF generation failed: ${pdfError.message}`);
//     }
    
//     // 3. Send email
//     log.info(`📧 Step 3: Sending email [${requestId}]`, { 
//       to: emailAddress,
//       filename: filename || 'document.pdf'
//     });
    
//     try {
//       const transporter = nodemailer.createTransport(emailConfig);
      
//       const mailOptions = {
//         from: emailConfig.auth.user,
//         to: emailAddress,
//         subject: `Your PDF Document: ${filename || 'document.pdf'}`,
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px;">
//             <h2 style="color: #2c3e50;">📄 Your PDF is Ready!</h2>
//             <p>Your document has been successfully generated and is attached to this email.</p>
//             <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
//               <p><strong>📁 Filename:</strong> ${filename || 'document.pdf'}</p>
//               <p><strong>📅 Generated:</strong> ${new Date().toLocaleString()}</p>
//               <p><strong>📊 Size:</strong> ${(pdfBuffer.length / 1024).toFixed(2)} KB</p>
//               <p><strong>🆔 Request ID:</strong> ${requestId}</p>
//             </div>
//             <p style="color: #7f8c8d; font-size: 12px;">Generated by PDF Service</p>
//           </div>
//         `,
//         attachments: [{
//           filename: filename || 'document.pdf',
//           content: pdfBuffer,
//           contentType: 'application/pdf'
//         }]
//       };
      
//       const emailResult = await transporter.sendMail(mailOptions);
//       log.info(`✅ Email sent successfully [${requestId}]`, { 
//         messageId: emailResult.messageId,
//         to: emailAddress
//       });
      
//     } catch (emailError) {
//       log.error(`❌ Email sending failed [${requestId}]`, emailError);
//       throw new Error(`Email sending failed: ${emailError.message}`);
//     }
    
//     const duration = Date.now() - startTime;
//     log.info(`🎉 Request completed successfully [${requestId}]`, { 
//       duration: `${duration}ms`,
//       to: emailAddress,
//       filename: filename || 'document.pdf'
//     });
    
//     res.json({ 
//       success: true, 
//       message: 'PDF generated and sent successfully!',
//       requestId,
//       duration,
//       details: {
//         emailAddress,
//         filename: filename || 'document.pdf',
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
//         processingTime: `${duration}ms`
//       }
//     });
    
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     log.error(`💥 Request failed [${requestId}]`, {
//       error: error.message,
//       duration: `${duration}ms`,
//       stack: error.stack
//     });
    
//     // Determine error type and appropriate response
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
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // Health check for PDF service
// router.get('/health', (req, res) => {
//   log.info('🏥 PDF service health check requested');
//   res.json({
//     status: 'OK',
//     service: 'PDF Generation Service (PDFKit)',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage()
//   });
// });

// module.exports = router;

// const express = require('express');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const pdf = require('html-pdf');
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

// // PDF OPTIONS FOR html-pdf
// const pdfOptions = {
//   format: 'A4',
//   orientation: 'portrait',
//   border: {
//     top: '20mm',
//     right: '15mm',
//     bottom: '20mm',
//     left: '15mm'
//   },
//   header: {
//     height: '10mm'
//   },
//   footer: {
//     height: '15mm',
//     contents: {
//       default: '<div style="text-align: center; font-size: 10px; color: #666;">Page {{page}} of {{pages}} - Generated by DocSpace PDF Service</div>'
//     }
//   },
//   type: 'pdf',
//   quality: '75',
//   dpi: 150,
//   timeout: 30000
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
    
//     // Extract parts
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
    
//     // Make keys
//     log.debug('🔑 Deriving encryption keys...');
//     const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
//     log.debug('✅ Keys derived successfully');
    
//     // Check if data is valid
//     log.debug('🔐 Verifying HMAC authentication...');
//     const hmacInput = Buffer.concat([salt, iv, encrypted]);
//     const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    
//     if (!authTag.equals(expectedTag)) {
//       throw new Error('HMAC verification failed - data may be corrupted or tampered with');
//     }
//     log.debug('✅ HMAC verification passed');
    
//     // Decrypt
//     log.debug('🔓 Performing AES decryption...');
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
//     // Look for JSON block in the response
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
    
//     // Fallback: try to detect format from content structure
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
//   const baseCSS = `
//     <style>
//       body {
//         font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//         line-height: 1.6;
//         color: #333;
//         max-width: 800px;
//         margin: 0 auto;
//         padding: 20px;
//         background: #fff;
//       }
      
//       .header {
//         text-align: center;
//         border-bottom: 3px solid #2c3e50;
//         padding-bottom: 20px;
//         margin-bottom: 30px;
//       }
      
//       .header h1 {
//         color: #2c3e50;
//         margin: 0;
//         font-size: 28px;
//         font-weight: 600;
//       }
      
//       .header .subtitle {
//         color: #7f8c8d;
//         font-size: 14px;
//         margin-top: 5px;
//       }
      
//       h2 {
//         color: #2c3e50;
//         border-left: 4px solid #3498db;
//         padding-left: 15px;
//         margin-top: 30px;
//         margin-bottom: 15px;
//         font-size: 20px;
//       }
      
//       h3 {
//         color: #34495e;
//         margin-top: 25px;
//         margin-bottom: 12px;
//         font-size: 16px;
//       }
      
//       p {
//         margin-bottom: 12px;
//         text-align: justify;
//       }
      
//       ul, ol {
//         margin-bottom: 15px;
//         padding-left: 25px;
//       }
      
//       li {
//         margin-bottom: 8px;
//       }
      
//       blockquote {
//         background: #f8f9fa;
//         border-left: 4px solid #3498db;
//         margin: 20px 0;
//         padding: 15px 20px;
//         font-style: italic;
//         color: #555;
//       }
      
//       code {
//         background: #f4f4f4;
//         padding: 2px 6px;
//         border-radius: 3px;
//         font-family: 'Courier New', monospace;
//         font-size: 90%;
//       }
      
//       pre {
//         background: #f8f9fa;
//         border: 1px solid #e9ecef;
//         border-radius: 5px;
//         padding: 15px;
//         overflow-x: auto;
//         margin: 15px 0;
//       }
      
//       pre code {
//         background: none;
//         padding: 0;
//       }
      
//       .emoji-replacement {
//         display: inline-block;
//         background: #3498db;
//         color: white;
//         padding: 2px 6px;
//         border-radius: 10px;
//         font-size: 11px;
//         font-weight: bold;
//         margin-right: 5px;
//       }
      
//       .test-tube { background: #e74c3c; }
//       .doctor { background: #27ae60; }
//       .findings { background: #f39c12; }
//       .normal { background: #27ae60; }
//       .abnormal { background: #e74c3c; }
//       .warning { background: #f39c12; }
//     </style>
//   `;
  
//   // Add format-specific styles
//   const structuredCSS = `
//     <style>
//       table {
//         width: 100%;
//         border-collapse: collapse;
//         margin: 20px 0;
//         background: white;
//         box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//       }
      
//       th {
//         background: #34495e;
//         color: white;
//         padding: 12px;
//         text-align: left;
//         font-weight: 600;
//         border-bottom: 2px solid #2c3e50;
//       }
      
//       td {
//         padding: 10px 12px;
//         border-bottom: 1px solid #ecf0f1;
//         vertical-align: top;
//       }
      
//       tr:nth-child(even) {
//         background: #f8f9fa;
//       }
      
//       tr:hover {
//         background: #e8f4f8;
//       }
      
//       .value-normal {
//         color: #27ae60;
//         font-weight: 600;
//       }
      
//       .value-abnormal {
//         color: #e74c3c;
//         font-weight: 600;
//       }
      
//       .value-borderline {
//         color: #f39c12;
//         font-weight: 600;
//       }
      
//       .summary-box {
//         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//         color: white;
//         padding: 20px;
//         border-radius: 10px;
//         margin: 20px 0;
//         text-align: center;
//       }
      
//       .summary-box h3 {
//         margin: 0 0 10px 0;
//         color: white;
//       }
//     </style>
//   `;
  
//   const narrativeCSS = `
//     <style>
//       .observation-item {
//         background: #f8f9fa;
//         border-left: 4px solid #3498db;
//         margin: 15px 0;
//         padding: 15px 20px;
//         border-radius: 0 5px 5px 0;
//       }
      
//       .observation-item strong {
//         color: #2c3e50;
//       }
      
//       .conclusion-box {
//         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//         color: white;
//         padding: 25px;
//         border-radius: 10px;
//         margin: 25px 0;
//         text-align: center;
//       }
      
//       .conclusion-box h3 {
//         margin: 0 0 15px 0;
//         color: white;
//       }
      
//       .key-findings {
//         background: #fff;
//         border: 2px solid #3498db;
//         border-radius: 8px;
//         padding: 20px;
//         margin: 20px 0;
//       }
//     </style>
//   `;
  
//   return baseCSS + (format === 'structured' ? structuredCSS : narrativeCSS);
// }

// // CLEAN AND PROCESS MARKDOWN CONTENT
// function processMarkdownContent(markdownText, testInfo) {
//   try {
//     // Remove JSON block if present
//     let cleanedText = markdownText.replace(/```json[\s\S]*?```\s*/, '').trim();
    
//     // Replace emojis with styled spans
//     const emojiReplacements = {
//       '🧪': '<span class="emoji-replacement test-tube">TEST</span>',
//       '🔍': '<span class="emoji-replacement findings">FINDINGS</span>',
//       '🧑‍⚕️': '<span class="emoji-replacement doctor">DOCTOR</span>',
//       '📝': '<span class="emoji-replacement">NOTE</span>',
//       '❌': '<span class="emoji-replacement abnormal">HIGH/LOW</span>',
//       '✅': '<span class="emoji-replacement normal">NORMAL</span>',
//       '⚠️': '<span class="emoji-replacement warning">WARNING</span>',
//       '📊': '<span class="emoji-replacement">DATA</span>',
//       '🩺': '<span class="emoji-replacement doctor">MEDICAL</span>',
//       '📄': '<span class="emoji-replacement">REPORT</span>',
//       '📌': '<span class="emoji-replacement">KEY</span>'
//     };
    
//     Object.entries(emojiReplacements).forEach(([emoji, replacement]) => {
//       cleanedText = cleanedText.replace(new RegExp(emoji, 'g'), replacement);
//     });
    
//     // Convert markdown to HTML
//     let htmlContent = marked(cleanedText);
    
//     // Post-process HTML for better PDF rendering
//     htmlContent = htmlContent
//       // Enhance table styling
//       .replace(/<table>/g, '<table class="data-table">')
//       // Add classes to value cells that look like normal/abnormal indicators
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
//   const currentDate = new Date().toLocaleDateString('en-US', { 
//     year: 'numeric', 
//     month: 'long', 
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit'
//   });
  
//   return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>${testInfo.testType} - ${filename}</title>
//       ${css}
//     </head>
//     <body>
//       <div class="header">
//         <h1>${testInfo.testType}</h1>
//         <div class="subtitle">
//           Generated on ${currentDate} | Format: ${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}
//         </div>
//       </div>
      
//       <div class="content">
//         ${processedContent}
//       </div>
      
//       <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
//         <p>This report was generated by DocSpace AI Medical Interpretation Service</p>
//         <p><strong>Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p>
//       </div>
//     </body>
//     </html>
//   `;
// }

// // MARKDOWN TO PDF CONVERTER USING html-pdf
// function markdownToPDF(markdownText, filename = 'document.pdf') {
//   return new Promise((resolve, reject) => {
//     try {
//       log.debug('📝 Starting markdown to PDF conversion using html-pdf');
      
//       // Extract test information from the AI response
//       const testInfo = extractTestInfo(markdownText);
//       log.debug('🔍 Extracted test info', testInfo);
      
//       // Generate complete HTML document
//       const htmlContent = generateHTML(markdownText, testInfo, filename);
//       log.debug('📄 Generated HTML content', { 
//         htmlLength: htmlContent.length,
//         testType: testInfo.testType,
//         format: testInfo.format
//       });
      
//       // Configure PDF options based on content type
//       const dynamicOptions = { ...pdfOptions };
      
//       if (testInfo.format === 'structured') {
//         // Structured reports might need more width for tables
//         dynamicOptions.border = {
//           top: '15mm',
//           right: '10mm',
//           bottom: '20mm',
//           left: '10mm'
//         };
//       }
      
//       // Generate PDF
//       pdf.create(htmlContent, dynamicOptions).toBuffer((err, buffer) => {
//         if (err) {
//           log.error('❌ PDF generation failed', err);
//           reject(new Error(`PDF generation failed: ${err.message}`));
//           return;
//         }
        
//         log.info('✅ PDF generated successfully', { 
//           pdfSize: `${(buffer.length / 1024).toFixed(2)} KB`,
//           testType: testInfo.testType,
//           format: testInfo.format
//         });
        
//         resolve(buffer);
//       });
      
//     } catch (error) {
//       log.error('❌ Markdown to PDF conversion failed', error);
//       reject(error);
//     }
//   });
// }

// // PDF GENERATION ROUTE
// router.post('/generate', async (req, res) => {
//   const startTime = Date.now();
//   const requestId = Math.random().toString(36).substring(7);
  
//   log.info(`🚀 New PDF generation request [${requestId}]`, {
//     ip: req.ip,
//     userAgent: req.get('User-Agent'),
//     contentLength: req.get('Content-Length')
//   });

//   try {
//     // Validate request body
//     const { encryptedContent, clientId, emailAddress, filename } = req.body;
    
//     log.debug(`📝 Request validation [${requestId}]`, {
//       hasEncryptedContent: !!encryptedContent,
//       hasClientId: !!clientId,
//       hasEmailAddress: !!emailAddress,
//       filename: filename || 'not provided'
//     });

//     if (!encryptedContent || !clientId || !emailAddress) {
//       const missingFields = [];
//       if (!encryptedContent) missingFields.push('encryptedContent');
//       if (!clientId) missingFields.push('clientId');
//       if (!emailAddress) missingFields.push('emailAddress');
      
//       log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });
//       return res.status(400).json({ 
//         error: 'Missing required fields', 
//         missing: missingFields,
//         requestId 
//       });
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(emailAddress)) {
//       log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });
//       return res.status(400).json({ 
//         error: 'Invalid email format',
//         requestId 
//       });
//     }

//     log.info(`✅ Request validation passed [${requestId}]`);
    
//     // 1. Decrypt the text
//     log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
//     const aiInterpretation = decrypt(encryptedContent, clientId);
    
//     // 2. Generate PDF from AI interpretation using html-pdf
//     log.info(`📄 Step 2: Generating PDF from AI interpretation [${requestId}]`);
//     let pdfBuffer;
//     try {
//       pdfBuffer = await markdownToPDF(aiInterpretation, filename);
//       log.info(`✅ PDF generated successfully [${requestId}]`, { 
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
//       });
//     } catch (pdfError) {
//       log.error(`❌ PDF generation failed [${requestId}]`, pdfError);
//       throw new Error(`PDF generation failed: ${pdfError.message}`);
//     }
    
//     // 3. Send email
//     log.info(`📧 Step 3: Sending email [${requestId}]`, { 
//       to: emailAddress,
//       filename: filename || 'medical-report.pdf'
//     });
    
//     try {
//       // FIXED: Use createTransport instead of createTransporter
//       const transporter = nodemailer.createTransport(emailConfig);
//       const testInfo = extractTestInfo(aiInterpretation);
      
//       const mailOptions = {
//         from: emailConfig.auth.user,
//         to: emailAddress,
//         subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//             <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
//               <h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready!</h2>
//             </div>
            
//             <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
//               <p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p>
              
//               <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">
//                 <table style="width: 100%; border-collapse: collapse;">
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${filename || 'medical-report.pdf'}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📊 Format:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📅 Generated:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${new Date().toLocaleString()}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📦 Size:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td>
//                     <td style="padding: 8px 0;">${requestId}</td>
//                   </tr>
//                 </table>
//               </div>
              
//               <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
//                 <p style="margin: 0;"><strong>⚠️ Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice. Please consult with your healthcare provider for proper medical interpretation and treatment recommendations.</p>
//               </div>
              
//               <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 30px;">
//                 Generated by DocSpace AI Medical Interpretation Service<br>
//                 Powered by Advanced AI Technology
//               </p>
//             </div>
//           </div>
//         `,
//         attachments: [{
//           filename: filename || 'medical-report.pdf',
//           content: pdfBuffer,
//           contentType: 'application/pdf'
//         }]
//       };
      
//       const emailResult = await transporter.sendMail(mailOptions);
//       log.info(`✅ Email sent successfully [${requestId}]`, { 
//         messageId: emailResult.messageId,
//         to: emailAddress
//       });
      
//     } catch (emailError) {
//       log.error(`❌ Email sending failed [${requestId}]`, emailError);
//       throw new Error(`Email sending failed: ${emailError.message}`);
//     }
    
//     const duration = Date.now() - startTime;
//     const testInfo = extractTestInfo(aiInterpretation);
    
//     log.info(`🎉 Request completed successfully [${requestId}]`, { 
//       duration: `${duration}ms`,
//       to: emailAddress,
//       filename: filename || 'medical-report.pdf',
//       testType: testInfo.testType,
//       format: testInfo.format
//     });
    
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
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
//         processingTime: `${duration}ms`
//       }
//     });
    
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     log.error(`💥 Request failed [${requestId}]`, {
//       error: error.message,
//       duration: `${duration}ms`,
//       stack: error.stack
//     });
    
//     // Determine error type and appropriate response
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
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // Health check for PDF service
// router.get('/health', (req, res) => {
//   log.info('🏥 PDF service health check requested');
//   res.json({
//     status: 'OK',
//     service: 'PDF Generation Service (html-pdf)',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     supportedFormats: ['structured', 'narrative', 'invalid']
//   });
// });

// module.exports = router;

// const express = require('express');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const pdf = require('html-pdf');
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

// // PDF OPTIONS FOR html-pdf
// const pdfOptions = {
//   format: 'A4',
//   orientation: 'portrait',
//   border: {
//     top: '20mm',
//     right: '15mm',
//     bottom: '20mm',
//     left: '15mm'
//   },
//   header: {
//     height: '10mm'
//   },
//   footer: {
//     height: '15mm',
//     contents: {
//       default: '<div style="text-align: center; font-size: 10px; color: #666;">Page {{page}} of {{pages}} - Generated by DocSpace PDF Service</div>'
//     }
//   },
//   type: 'pdf',
//   quality: '75',
//   dpi: 150,
//   timeout: 30000
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
    
//     // Extract parts
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
    
//     // Make keys
//     log.debug('🔑 Deriving encryption keys...');
//     const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
//     log.debug('✅ Keys derived successfully');
    
//     // Check if data is valid
//     log.debug('🔐 Verifying HMAC authentication...');
//     const hmacInput = Buffer.concat([salt, iv, encrypted]);
//     const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    
//     if (!authTag.equals(expectedTag)) {
//       throw new Error('HMAC verification failed - data may be corrupted or tampered with');
//     }
//     log.debug('✅ HMAC verification passed');
    
//     // Decrypt
//     log.debug('🔓 Performing AES decryption...');
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
//     // Look for JSON block in the response
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
    
//     // Fallback: try to detect format from content structure
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
//   const baseCSS = `
//     <style>
//       body {
//         font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//         line-height: 1.6;
//         color: #333;
//         max-width: 800px;
//         margin: 0 auto;
//         padding: 20px;
//         background: #fff;
//       }
      
//       .header {
//         text-align: center;
//         border-bottom: 3px solid #2c3e50;
//         padding-bottom: 20px;
//         margin-bottom: 30px;
//       }
      
//       .header h1 {
//         color: #2c3e50;
//         margin: 0;
//         font-size: 28px;
//         font-weight: 600;
//       }
      
//       .header .subtitle {
//         color: #7f8c8d;
//         font-size: 14px;
//         margin-top: 5px;
//       }
      
//       h2 {
//         color: #2c3e50;
//         border-left: 4px solid #3498db;
//         padding-left: 15px;
//         margin-top: 30px;
//         margin-bottom: 15px;
//         font-size: 20px;
//       }
      
//       h3 {
//         color: #34495e;
//         margin-top: 25px;
//         margin-bottom: 12px;
//         font-size: 16px;
//       }
      
//       p {
//         margin-bottom: 12px;
//         text-align: justify;
//       }
      
//       ul, ol {
//         margin-bottom: 15px;
//         padding-left: 25px;
//       }
      
//       li {
//         margin-bottom: 8px;
//       }
      
//       blockquote {
//         background: #f8f9fa;
//         border-left: 4px solid #3498db;
//         margin: 20px 0;
//         padding: 15px 20px;
//         font-style: italic;
//         color: #555;
//       }
      
//       code {
//         background: #f4f4f4;
//         padding: 2px 6px;
//         border-radius: 3px;
//         font-family: 'Courier New', monospace;
//         font-size: 90%;
//       }
      
//       pre {
//         background: #f8f9fa;
//         border: 1px solid #e9ecef;
//         border-radius: 5px;
//         padding: 15px;
//         overflow-x: auto;
//         margin: 15px 0;
//       }
      
//       pre code {
//         background: none;
//         padding: 0;
//       }
      
//       .emoji-replacement {
//         display: inline-block;
//         background: #3498db;
//         color: white;
//         padding: 2px 6px;
//         border-radius: 10px;
//         font-size: 11px;
//         font-weight: bold;
//         margin-right: 5px;
//       }
      
//       .test-tube { background: #e74c3c; }
//       .doctor { background: #27ae60; }
//       .findings { background: #f39c12; }
//       .normal { background: #27ae60; }
//       .abnormal { background: #e74c3c; }
//       .warning { background: #f39c12; }
//     </style>
//   `;
  
//   // Add format-specific styles
//   const structuredCSS = `
//     <style>
//       table {
//         width: 100%;
//         border-collapse: collapse;
//         margin: 20px 0;
//         background: white;
//         box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//       }
      
//       th {
//         background: #34495e;
//         color: white;
//         padding: 12px;
//         text-align: left;
//         font-weight: 600;
//         border-bottom: 2px solid #2c3e50;
//       }
      
//       td {
//         padding: 10px 12px;
//         border-bottom: 1px solid #ecf0f1;
//         vertical-align: top;
//       }
      
//       tr:nth-child(even) {
//         background: #f8f9fa;
//       }
      
//       tr:hover {
//         background: #e8f4f8;
//       }
      
//       .value-normal {
//         color: #27ae60;
//         font-weight: 600;
//       }
      
//       .value-abnormal {
//         color: #e74c3c;
//         font-weight: 600;
//       }
      
//       .value-borderline {
//         color: #f39c12;
//         font-weight: 600;
//       }
      
//       .summary-box {
//         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//         color: white;
//         padding: 20px;
//         border-radius: 10px;
//         margin: 20px 0;
//         text-align: center;
//       }
      
//       .summary-box h3 {
//         margin: 0 0 10px 0;
//         color: white;
//       }
//     </style>
//   `;
  
//   const narrativeCSS = `
//     <style>
//       .observation-item {
//         background: #f8f9fa;
//         border-left: 4px solid #3498db;
//         margin: 15px 0;
//         padding: 15px 20px;
//         border-radius: 0 5px 5px 0;
//       }
      
//       .observation-item strong {
//         color: #2c3e50;
//       }
      
//       .conclusion-box {
//         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//         color: white;
//         padding: 25px;
//         border-radius: 10px;
//         margin: 25px 0;
//         text-align: center;
//       }
      
//       .conclusion-box h3 {
//         margin: 0 0 15px 0;
//         color: white;
//       }
      
//       .key-findings {
//         background: #fff;
//         border: 2px solid #3498db;
//         border-radius: 8px;
//         padding: 20px;
//         margin: 20px 0;
//       }
//     </style>
//   `;
  
//   return baseCSS + (format === 'structured' ? structuredCSS : narrativeCSS);
// }

// // CLEAN AND PROCESS MARKDOWN CONTENT
// function processMarkdownContent(markdownText, testInfo) {
//   try {
//     // Remove JSON block if present
//     let cleanedText = markdownText.replace(/```json[\s\S]*?```\s*/, '').trim();
    
//     // Replace emojis with styled spans
//     const emojiReplacements = {
//       '🧪': '<span class="emoji-replacement test-tube">TEST</span>',
//       '🔍': '<span class="emoji-replacement findings">FINDINGS</span>',
//       '🧑‍⚕️': '<span class="emoji-replacement doctor">DOCTOR</span>',
//       '📝': '<span class="emoji-replacement">NOTE</span>',
//       '❌': '<span class="emoji-replacement abnormal">HIGH/LOW</span>',
//       '✅': '<span class="emoji-replacement normal">NORMAL</span>',
//       '⚠️': '<span class="emoji-replacement warning">WARNING</span>',
//       '📊': '<span class="emoji-replacement">DATA</span>',
//       '🩺': '<span class="emoji-replacement doctor">MEDICAL</span>',
//       '📄': '<span class="emoji-replacement">REPORT</span>',
//       '📌': '<span class="emoji-replacement">KEY</span>'
//     };
    
//     Object.entries(emojiReplacements).forEach(([emoji, replacement]) => {
//       cleanedText = cleanedText.replace(new RegExp(emoji, 'g'), replacement);
//     });
    
//     // Convert markdown to HTML
//     let htmlContent = marked(cleanedText);
    
//     // Post-process HTML for better PDF rendering
//     htmlContent = htmlContent
//       // Enhance table styling
//       .replace(/<table>/g, '<table class="data-table">')
//       // Add classes to value cells that look like normal/abnormal indicators
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
//   const currentDate = new Date().toLocaleDateString('en-US', { 
//     year: 'numeric', 
//     month: 'long', 
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit'
//   });
  
//   return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>${testInfo.testType} - ${filename}</title>
//       ${css}
//     </head>
//     <body>
//       <div class="header">
//         <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-height: 70px; margin-bottom: 15px;">
//         <h1>${testInfo.testType}</h1>
//         <div class="subtitle">
//           Generated on ${currentDate} | Format: ${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}
//         </div>
//       </div>
      
//       <div class="content">
//         ${processedContent}
//       </div>
      
//       <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
//         <p>This report was generated by DocSpace AI Medical Interpretation Service</p>
//         <p><strong>Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p>
//       </div>
//     </body>
//     </html>
//   `;
// }

// // MARKDOWN TO PDF CONVERTER USING html-pdf
// function markdownToPDF(markdownText, filename = 'document.pdf') {
//   return new Promise((resolve, reject) => {
//     try {
//       log.debug('📝 Starting markdown to PDF conversion using html-pdf');
      
//       // Extract test information from the AI response
//       const testInfo = extractTestInfo(markdownText);
//       log.debug('🔍 Extracted test info', testInfo);
      
//       // Generate complete HTML document
//       const htmlContent = generateHTML(markdownText, testInfo, filename);
//       log.debug('📄 Generated HTML content', { 
//         htmlLength: htmlContent.length,
//         testType: testInfo.testType,
//         format: testInfo.format
//       });
      
//       // Configure PDF options based on content type
//       const dynamicOptions = { ...pdfOptions };
      
//       if (testInfo.format === 'structured') {
//         // Structured reports might need more width for tables
//         dynamicOptions.border = {
//           top: '15mm',
//           right: '10mm',
//           bottom: '20mm',
//           left: '10mm'
//         };
//       }
      
//       // Generate PDF
//       pdf.create(htmlContent, dynamicOptions).toBuffer((err, buffer) => {
//         if (err) {
//           log.error('❌ PDF generation failed', err);
//           reject(new Error(`PDF generation failed: ${err.message}`));
//           return;
//         }
        
//         log.info('✅ PDF generated successfully', { 
//           pdfSize: `${(buffer.length / 1024).toFixed(2)} KB`,
//           testType: testInfo.testType,
//           format: testInfo.format
//         });
        
//         resolve(buffer);
//       });
      
//     } catch (error) {
//       log.error('❌ Markdown to PDF conversion failed', error);
//       reject(error);
//     }
//   });
// }

// // PDF GENERATION ROUTE
// router.post('/generate', async (req, res) => {
//   const startTime = Date.now();
//   const requestId = Math.random().toString(36).substring(7);
  
//   log.info(`🚀 New PDF generation request [${requestId}]`, {
//     ip: req.ip,
//     userAgent: req.get('User-Agent'),
//     contentLength: req.get('Content-Length')
//   });

//   try {
//     // Validate request body
//     const { encryptedContent, clientId, emailAddress, filename } = req.body;
    
//     log.debug(`📝 Request validation [${requestId}]`, {
//       hasEncryptedContent: !!encryptedContent,
//       hasClientId: !!clientId,
//       hasEmailAddress: !!emailAddress,
//       filename: filename || 'not provided'
//     });

//     if (!encryptedContent || !clientId || !emailAddress) {
//       const missingFields = [];
//       if (!encryptedContent) missingFields.push('encryptedContent');
//       if (!clientId) missingFields.push('clientId');
//       if (!emailAddress) missingFields.push('emailAddress');
      
//       log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });
//       return res.status(400).json({ 
//         error: 'Missing required fields', 
//         missing: missingFields,
//         requestId 
//       });
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(emailAddress)) {
//       log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });
//       return res.status(400).json({ 
//         error: 'Invalid email format',
//         requestId 
//       });
//     }

//     log.info(`✅ Request validation passed [${requestId}]`);
    
//     // 1. Decrypt the text
//     log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
//     const aiInterpretation = decrypt(encryptedContent, clientId);
    
//     // 2. Generate PDF from AI interpretation using html-pdf
//     log.info(`📄 Step 2: Generating PDF from AI interpretation [${requestId}]`);
//     let pdfBuffer;
//     try {
//       pdfBuffer = await markdownToPDF(aiInterpretation, filename);
//       log.info(`✅ PDF generated successfully [${requestId}]`, { 
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
//       });
//     } catch (pdfError) {
//       log.error(`❌ PDF generation failed [${requestId}]`, pdfError);
//       throw new Error(`PDF generation failed: ${pdfError.message}`);
//     }
    
//     // 3. Send email
//     log.info(`📧 Step 3: Sending email [${requestId}]`, { 
//       to: emailAddress,
//       filename: filename || 'medical-report.pdf'
//     });
    
//     try {
//       const transporter = nodemailer.createTransport(emailConfig);
//       const testInfo = extractTestInfo(aiInterpretation);
      
//       const mailOptions = {
//         from: emailConfig.auth.user,
//         to: emailAddress,
//         subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7f6;">
//             <div style="text-align: center; padding: 20px; background-color: #ffffff;">
//               <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-width: 200px; height: auto;">
//             </div>
//             <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
//               <h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready!</h2>
//             </div>
            
//             <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
//               <p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p>
              
//               <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">
//                 <table style="width: 100%; border-collapse: collapse;">
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${filename || 'medical-report.pdf'}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📊 Format:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📅 Generated:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${new Date().toLocaleString()}</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📦 Size:</strong></td>
//                     <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td>
//                   </tr>
//                   <tr>
//                     <td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td>
//                     <td style="padding: 8px 0;">${requestId}</td>
//                   </tr>
//                 </table>
//               </div>
              
//               <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
//                 <p style="margin: 0;"><strong>⚠️ Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice. Please consult with your healthcare provider for proper medical interpretation and treatment recommendations.</p>
//               </div>
              
//               <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 30px;">
//                 Generated by DocSpace AI Medical Interpretation Service<br>
//                 Powered by Advanced AI Technology
//               </p>
//             </div>
//           </div>
//         `,
//         attachments: [{
//           filename: filename || 'medical-report.pdf',
//           content: pdfBuffer,
//           contentType: 'application/pdf'
//         }]
//       };
      
//       const emailResult = await transporter.sendMail(mailOptions);
//       log.info(`✅ Email sent successfully [${requestId}]`, { 
//         messageId: emailResult.messageId,
//         to: emailAddress
//       });
      
//     } catch (emailError) {
//       log.error(`❌ Email sending failed [${requestId}]`, emailError);
//       throw new Error(`Email sending failed: ${emailError.message}`);
//     }
    
//     const duration = Date.now() - startTime;
//     const testInfo = extractTestInfo(aiInterpretation);
    
//     log.info(`🎉 Request completed successfully [${requestId}]`, { 
//       duration: `${duration}ms`,
//       to: emailAddress,
//       filename: filename || 'medical-report.pdf',
//       testType: testInfo.testType,
//       format: testInfo.format
//     });
    
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
//         pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
//         processingTime: `${duration}ms`
//       }
//     });
    
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     log.error(`💥 Request failed [${requestId}]`, {
//       error: error.message,
//       duration: `${duration}ms`,
//       stack: error.stack
//     });
    
//     // Determine error type and appropriate response
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
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // Health check for PDF service
// router.get('/health', (req, res) => {
//   log.info('🏥 PDF service health check requested');
//   res.json({
//     status: 'OK',
//     service: 'PDF Generation Service (html-pdf)',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     supportedFormats: ['structured', 'narrative', 'invalid']
//   });
// });

// module.exports = router;

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer'); // <-- Replaced html-pdf with puppeteer
const { marked } = require('marked');

const router = express.Router();

// --- LOGGING SETUP (No changes) ---
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


// --- EMAIL SETUP (No changes) ---
const emailConfig = {
  host: 'labmate.docspace.co.ke',
  port: 465,
  secure: true,
  auth: {
    user: process.env.RESULTS_USER,
    pass: process.env.RESULTS_PASS
  }
};


// --- DECRYPT FUNCTION (No changes) ---
function decrypt(encryptedData, clientId) {
  try {
    log.debug('🔓 Starting decryption process');
    const data = Buffer.from(encryptedData, 'base64');
    if (data.length < 64) {
      throw new Error(`Data too short: ${data.length} bytes (minimum 64 required)`);
    }
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 32);
    const authTag = data.slice(32, 64);
    const encrypted = data.slice(64);
    const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
    const hmacInput = Buffer.concat([salt, iv, encrypted]);
    const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    if (!authTag.equals(expectedTag)) {
      throw new Error('HMAC verification failed - data may be corrupted or tampered with');
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    log.info('✅ Decryption successful');
    return decrypted;
  } catch (error) {
    log.error('❌ Decryption failed', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}


// --- EXTRACT TEST TYPE AND FORMAT FROM AI RESPONSE (No changes) ---
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


// --- GENERATE CSS STYLES (Improved UI) ---
function generateCSS(format, testType) {
  const baseCSS = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #fff;
      }
      
      .header {
        text-align: center;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .header h1 {
        color: #1a237e; /* A deep blue for a professional look */
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      
      .header .subtitle {
        color: #555;
        font-size: 14px;
        margin-top: 8px;
      }
      
      h2 {
        color: #1a237e;
        border-bottom: 2px solid #3f51b5; /* Indigo accent */
        padding-bottom: 8px;
        margin-top: 35px;
        margin-bottom: 20px;
        font-size: 22px;
        font-weight: 600;
      }
      
      h3 {
        color: #3f51b5;
        margin-top: 25px;
        margin-bottom: 15px;
        font-size: 18px;
        font-weight: 600;
      }
      
      p { margin-bottom: 14px; text-align: justify; }
      ul, ol { margin-bottom: 15px; padding-left: 25px; }
      li { margin-bottom: 8px; }
      
      blockquote {
        background: #f1f3f5;
        border-left: 5px solid #3f51b5;
        margin: 20px 0;
        padding: 15px 20px;
        font-style: italic;
        color: #495057;
      }
      
      code {
        background: #e9ecef;
        padding: 3px 6px;
        border-radius: 4px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 90%;
      }
      
      .emoji-replacement {
        display: inline-block;
        color: white;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        margin-right: 5px;
        vertical-align: middle;
      }
      
      .test-tube { background: #d32f2f; }
      .doctor { background: #388e3c; }
      .findings { background: #f57c00; }
      .normal { background: #388e3c; }
      .abnormal { background: #d32f2f; }
      .warning { background: #f57c00; }
    </style>
  `;
  
  const structuredCSS = `
    <style>
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 25px 0;
        font-size: 14px;
      }
      
      th {
        background: #3f51b5; /* Indigo */
        color: white;
        padding: 12px 15px;
        text-align: left;
        font-weight: 600;
      }
      
      td {
        padding: 12px 15px;
        border-bottom: 1px solid #e9ecef;
        vertical-align: top;
      }
      
      tr:nth-child(even) { background: #f8f9fa; }
      tr:last-child td { border-bottom: 2px solid #3f51b5; }
      tr:hover { background: #e8eaf6; }
      
      .value-normal { color: #2e7d32; font-weight: 600; }
      .value-abnormal { color: #c62828; font-weight: 700; }
      .value-borderline { color: #ef6c00; font-weight: 600; }
      
      .summary-box {
        background: linear-gradient(135deg, #3f51b5 0%, #1a237e 100%);
        color: white; padding: 25px; border-radius: 10px; margin: 25px 0;
      }
      .summary-box h3 { margin: 0 0 10px 0; color: white; font-size: 20px; border: none; padding: 0; }
    </style>
  `;
  
  const narrativeCSS = `
    <style>
      .observation-item {
        background: #f8f9fa; border-left: 4px solid #3f51b5;
        margin: 15px 0; padding: 15px 20px; border-radius: 0 5px 5px 0;
      }
      .observation-item strong { color: #1a237e; }
      
      .conclusion-box {
        background: linear-gradient(135deg, #3f51b5 0%, #1a237e 100%);
        color: white; padding: 30px; border-radius: 10px; margin: 25px 0;
      }
      .conclusion-box h3 { margin: 0 0 15px 0; color: white; font-size: 20px; border: none; padding: 0; }
    </style>
  `;
  
  return baseCSS + (format === 'structured' ? structuredCSS : narrativeCSS);
}


// --- CLEAN AND PROCESS MARKDOWN CONTENT (No changes) ---
function processMarkdownContent(markdownText) {
  try {
    let cleanedText = markdownText.replace(/```json[\s\S]*?```\s*/, '').trim();
    const emojiReplacements = {
      '🧪': '<span class="emoji-replacement test-tube">TEST</span>', '🔍': '<span class="emoji-replacement findings">FINDINGS</span>',
      '🧑‍⚕️': '<span class="emoji-replacement doctor">DOCTOR</span>', '📝': '<span class="emoji-replacement">NOTE</span>',
      '❌': '<span class="emoji-replacement abnormal">HIGH/LOW</span>', '✅': '<span class="emoji-replacement normal">NORMAL</span>',
      '⚠️': '<span class="emoji-replacement warning">WARNING</span>', '📊': '<span class="emoji-replacement">DATA</span>',
      '🩺': '<span class="emoji-replacement doctor">MEDICAL</span>', '📄': '<span class="emoji-replacement">REPORT</span>',
      '📌': '<span class="emoji-replacement">KEY</span>'
    };
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


// --- GENERATE COMPLETE HTML DOCUMENT (No changes) ---
function generateHTML(markdownText, testInfo, filename) {
  const processedContent = processMarkdownContent(markdownText);
  const css = generateCSS(testInfo.format, testInfo.testType);
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${testInfo.testType} - ${filename}</title>
      ${css}
    </head>
    <body>
      <div class="header">
        <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-height: 70px; margin-bottom: 15px;">
        <h1>${testInfo.testType}</h1>
        <div class="subtitle">Generated on ${currentDate} | Format: ${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</div>
      </div>
      <div class="content">${processedContent}</div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>This report was generated by DocSpace AI Medical Interpretation Service</p>
        <p><strong>Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p>
      </div>
    </body>
    </html>
  `;
}


// --- MARKDOWN TO PDF CONVERTER (Rewritten for Puppeteer) ---
async function markdownToPDF(markdownText, filename = 'document.pdf') {
  log.debug('📝 Starting markdown to PDF conversion using Puppeteer');
  let browser;

  try {
    const testInfo = extractTestInfo(markdownText);
    const htmlContent = generateHTML(markdownText, testInfo, filename);

    // Puppeteer launch options, crucial for Render and other containerized environments.
    const puppeteerOptions = {
      headless: true,
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
      // headless: true,
      // executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser' || '/opt/render/.cache/puppeteer/chrome/linux-138.0.7204.49/chrome-linux64/chrome',
      // args: [
      //   '--no-sandbox',
      //   '--disable-setuid-sandbox',
      //   '--disable-dev-shm-usage',
      //   '--disable-accelerated-2d-canvas',
      //   '--no-first-run',
      //   '--no-zygote',
      //   '--single-process',
      //   '--disable-gpu'
      // ]
      // args: [
      //   '--no-sandbox',
      //   '--disable-setuid-sandbox',
      //   '--disable-dev-shm-usage', // Overcomes limited resource issues
      //   '--single-process', // May reduce memory usage
      // ],
    };
    log.debug('🚀 Launching Puppeteer browser', puppeteerOptions.args);
    browser = await puppeteer.launch(puppeteerOptions);

    const page = await browser.newPage();
    
    // Set a reasonable timeout for the entire operation.
    page.setDefaultNavigationTimeout(30000); 
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '25mm', // Increased to accommodate footer
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Empty header
      footerTemplate: `
        <div style="width: 100%; font-family: 'Inter', sans-serif; font-size: 9px; text-align: center; color: #666; padding: 0 15mm;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span> - Generated by DocSpace PDF Service
        </div>
      `,
    };

    if (testInfo.format === 'structured') {
        pdfOptions.margin = { ...pdfOptions.margin, right: '10mm', left: '10mm' };
        pdfOptions.footerTemplate = pdfOptions.footerTemplate.replace(/15mm/g, '10mm');
    }
    
    log.debug('🖨️ Generating PDF buffer...');
    const buffer = await page.pdf(pdfOptions);
    
    log.info('✅ PDF generated successfully with Puppeteer', { pdfSize: `${(buffer.length / 1024).toFixed(2)} KB` });
    return buffer;

  } catch (error) {
    log.error('❌ Puppeteer PDF conversion failed', error);
    throw new Error(`Puppeteer PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      log.debug('🚪 Closing Puppeteer browser');
      await browser.close();
    }
  }
}


// --- PDF GENERATION ROUTE (Updated email template and function call) ---
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  log.info(`🚀 New PDF generation request [${requestId}]`);

  try {
    const { encryptedContent, clientId, emailAddress, filename } = req.body;
    if (!encryptedContent || !clientId || !emailAddress) {
      log.warn(`❌ Missing required fields [${requestId}]`);
      return res.status(400).json({ error: 'Missing required fields', requestId });
    }

    log.info(`✅ Request validation passed [${requestId}]`);
    
    // 1. Decrypt the text
    const aiInterpretation = decrypt(encryptedContent, clientId);
    const testInfo = extractTestInfo(aiInterpretation);

    // 2. Generate PDF from AI interpretation using Puppeteer
    log.info(`📄 Step 2: Generating PDF using Puppeteer [${requestId}]`);
    const pdfBuffer = await markdownToPDF(aiInterpretation, filename);
    
    // 3. Send email with improved HTML template
    log.info(`📧 Step 3: Sending email [${requestId}]`);
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
      from: `LabMate Reports <${emailConfig.auth.user}>`,
      to: emailAddress,
      subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f4f7f6; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="text-align: center; padding: 20px; background-color: #ffffff;">
            <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-width: 180px; height: auto;">
          </div>
          <div style="background: linear-gradient(135deg, #3f51b5 0%, #1a237e 100%); color: white; padding: 30px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">📄 Your Medical Report is Ready!</h2>
          </div>
          <div style="padding: 25px 30px;">
            <p style="color: #333; font-size: 16px;">Hello,</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #555;"><strong>📁 Filename:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #1a237e; font-weight: bold;">${filename || 'medical-report.pdf'}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #555;"><strong>🧪 Test Type:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">${testInfo.testType}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #555;"><strong>📊 Format:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #555;"><strong>📦 Size:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td></tr>
                <tr><td style="padding: 10px 0; color: #555;"><strong>🆔 Request ID:</strong></td><td style="padding: 10px 0;">${requestId}</td></tr>
              </table>
            </div>
            <div style="background-color: #fff9c4; border-left: 4px solid #fbc02d; color: #333; padding: 15px; border-radius: 4px; margin: 25px 0; font-size: 14px;">
              <p style="margin: 0; line-height: 1.5;"><strong>Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only. Please consult with your healthcare provider for accurate medical interpretation.</p>
            </div>
          </div>
          <div style="background-color: #f1f3f5; padding: 20px; text-align: center; color: #777; font-size: 12px;">
            <p style="margin: 0;">DocSpace AI Medical Interpretation Service</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: filename || 'medical-report.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
    
    await transporter.sendMail(mailOptions);
    log.info(`✅ Email sent successfully [${requestId}]`);
    
    const duration = Date.now() - startTime;
    log.info(`🎉 Request completed successfully [${requestId}]`, { duration: `${duration}ms` });
    
    res.json({ 
      success: true, 
      message: 'Medical report PDF generated and sent successfully!',
      requestId,
      details: {
        testType: testInfo.testType,
        format: testInfo.format,
        pdfSizeKB: parseFloat((pdfBuffer.length / 1024).toFixed(2)),
        processingTimeMs: duration
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`💥 Request failed [${requestId}]`, { error: error.message, duration: `${duration}ms` });
    
    let statusCode = 500;
    let errorType = 'INTERNAL_ERROR';
    if (error.message.includes('Decryption failed')) { statusCode = 400; errorType = 'DECRYPTION_ERROR'; }
    else if (error.message.includes('Email sending failed')) { statusCode = 503; errorType = 'EMAIL_ERROR'; }
    else if (error.message.includes('Puppeteer PDF generation failed')) { statusCode = 500; errorType = 'PDF_ERROR'; }
    
    res.status(statusCode).json({ error: error.message, errorType, requestId });
  }
});


// --- Health check for PDF service (Updated service name) ---
router.get('/health', (req, res) => {
  log.info('🏥 PDF service health check requested');
  res.json({
    status: 'OK',
    service: 'PDF Generation Service (Puppeteer)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;