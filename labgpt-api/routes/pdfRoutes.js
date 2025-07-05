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

// express = require('express');

// const crypto = require('crypto');

// const nodemailer = require('nodemailer');

// const pdf = require('html-pdf');

// const { marked } = require('marked');



// const router = express.Router();



// // LOGGING SETUP

// const log = {

// info: (message, data = null) => {

// const timestamp = new Date().toISOString();

// console.log(`[${timestamp}] INFO: ${message}`);

// if (data) console.log('Data:', JSON.stringify(data, null, 2));

// },

// error: (message, error = null) => {

// const timestamp = new Date().toISOString();

// console.error(`[${timestamp}] ERROR: ${message}`);

// if (error) {

// console.error('Error details:', error.message);

// console.error('Stack trace:', error.stack);

// }

// },

// warn: (message, data = null) => {

// const timestamp = new Date().toISOString();

// console.warn(`[${timestamp}] WARN: ${message}`);

// if (data) console.warn('Data:', data);

// },

// debug: (message, data = null) => {

// const timestamp = new Date().toISOString();

// console.log(`[${timestamp}] DEBUG: ${message}`);

// if (data) console.log('Debug data:', JSON.stringify(data, null, 2));

// }

// };



// // EMAIL SETUP

// const emailConfig = {

// host: 'labmate.docspace.co.ke',

// port: 465,

// secure: true,

// auth: {

// user: process.env.RESULTS_USER,

// pass: process.env.RESULTS_PASS

// }

// };



// // PDF OPTIONS FOR html-pdf

// const pdfOptions = {

// format: 'A4',

// orientation: 'portrait',

// border: {

// top: '20mm',

// right: '15mm',

// bottom: '20mm',

// left: '15mm'

// },

// header: {

// height: '10mm'

// },

// footer: {

// height: '15mm',

// contents: {

// default: '<div style="text-align: center; font-size: 10px; color: #666;">Page {{page}} of {{pages}} - Generated by DocSpace PDF Service</div>'

// }

// },

// type: 'pdf',

// quality: '75',

// dpi: 150,

// timeout: 30000

// };



// // DECRYPT FUNCTION

// function decrypt(encryptedData, clientId) {

// try {

// log.debug('🔓 Starting decryption process', {

// encryptedDataLength: encryptedData.length,

// clientIdLength: clientId.length

// });



// const data = Buffer.from(encryptedData, 'base64');

// log.debug('📊 Decoded base64 data', { dataLength: data.length });


// if (data.length < 64) {

// throw new Error(`Data too short: ${data.length} bytes (minimum 64 required)`);

// }


// // Extract parts

// const salt = data.slice(0, 16);

// const iv = data.slice(16, 32);

// const authTag = data.slice(32, 64);

// const encrypted = data.slice(64);


// log.debug('🔧 Extracted components', {

// saltLength: salt.length,

// ivLength: iv.length,

// authTagLength: authTag.length,

// encryptedLength: encrypted.length

// });


// // Make keys

// log.debug('🔑 Deriving encryption keys...');

// const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');

// const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');

// log.debug('✅ Keys derived successfully');


// // Check if data is valid

// log.debug('🔐 Verifying HMAC authentication...');

// const hmacInput = Buffer.concat([salt, iv, encrypted]);

// const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();


// if (!authTag.equals(expectedTag)) {

// throw new Error('HMAC verification failed - data may be corrupted or tampered with');

// }

// log.debug('✅ HMAC verification passed');


// // Decrypt

// log.debug('🔓 Performing AES decryption...');

// const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);

// let decrypted = decipher.update(encrypted, null, 'utf8');

// decrypted += decipher.final('utf8');


// log.info('✅ Decryption successful', {

// decryptedLength: decrypted.length,

// preview: decrypted.substring(0, 100) + '...'

// });


// return decrypted;


// } catch (error) {

// log.error('❌ Decryption failed', error);

// throw new Error(`Decryption failed: ${error.message}`);

// }

// }



// // EXTRACT TEST TYPE AND FORMAT FROM AI RESPONSE

// function extractTestInfo(markdownText) {

// try {

// // Look for JSON block in the response

// const jsonMatch = markdownText.match(/```json\s*({[\s\S]*?})\s*```/);


// if (jsonMatch) {

// try {

// const parsedJson = JSON.parse(jsonMatch[1]);

// return {

// testType: parsedJson.testType || 'Medical Report',

// format: parsedJson.format || 'narrative',

// isValidTest: !!parsedJson.isValidTest

// };

// } catch (err) {

// log.warn('Failed to parse JSON from AI response, using defaults');

// }

// }


// // Fallback: try to detect format from content structure

// const hasTable = markdownText.includes('|') && markdownText.includes('---');

// const hasStructuredData = /\d+\.?\d*\s*(mg\/dL|g\/dL|mmol\/L|IU\/L|ng\/mL)/i.test(markdownText);


// return {

// testType: 'Medical Report',

// format: (hasTable || hasStructuredData) ? 'structured' : 'narrative',

// isValidTest: true

// };


// } catch (error) {

// log.warn('Could not extract test info, using defaults');

// return {

// testType: 'Medical Report',

// format: 'narrative',

// isValidTest: true

// };

// }

// }



// // GENERATE CSS STYLES BASED ON REPORT FORMAT

// function generateCSS(format, testType) {

// const baseCSS = `

// <style>

// body {

// font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

// line-height: 1.6;

// color: #333;

// max-width: 800px;

// margin: 0 auto;

// padding: 20px;

// background: #fff;

// }


// .header {

// text-align: center;

// border-bottom: 3px solid #2c3e50;

// padding-bottom: 20px;

// margin-bottom: 30px;

// }


// .header h1 {

// color: #2c3e50;

// margin: 0;

// font-size: 28px;

// font-weight: 600;

// }


// .header .subtitle {

// color: #7f8c8d;

// font-size: 14px;

// margin-top: 5px;

// }


// h2 {

// color: #2c3e50;

// border-left: 4px solid #3498db;

// padding-left: 15px;

// margin-top: 30px;

// margin-bottom: 15px;

// font-size: 20px;

// }


// h3 {

// color: #34495e;

// margin-top: 25px;

// margin-bottom: 12px;

// font-size: 16px;

// }


// p {

// margin-bottom: 12px;

// text-align: justify;

// }


// ul, ol {

// margin-bottom: 15px;

// padding-left: 25px;

// }


// li {

// margin-bottom: 8px;

// }


// blockquote {

// background: #f8f9fa;

// border-left: 4px solid #3498db;

// margin: 20px 0;

// padding: 15px 20px;

// font-style: italic;

// color: #555;

// }


// code {

// background: #f4f4f4;

// padding: 2px 6px;

// border-radius: 3px;

// font-family: 'Courier New', monospace;

// font-size: 90%;

// }


// pre {

// background: #f8f9fa;

// border: 1px solid #e9ecef;

// border-radius: 5px;

// padding: 15px;

// overflow-x: auto;

// margin: 15px 0;

// }


// pre code {

// background: none;

// padding: 0;

// }


// .emoji-replacement {

// display: inline-block;

// background: #3498db;

// color: white;

// padding: 2px 6px;

// border-radius: 10px;

// font-size: 11px;

// font-weight: bold;

// margin-right: 5px;

// }


// .test-tube { background: #e74c3c; }

// .doctor { background: #27ae60; }

// .findings { background: #f39c12; }

// .normal { background: #27ae60; }

// .abnormal { background: #e74c3c; }

// .warning { background: #f39c12; }

// </style>

// `;


// // Add format-specific styles

// const structuredCSS = `

// <style>

// table {

// width: 100%;

// border-collapse: collapse;

// margin: 20px 0;

// background: white;

// box-shadow: 0 2px 4px rgba(0,0,0,0.1);

// }


// th {

// background: #34495e;

// color: white;

// padding: 12px;

// text-align: left;

// font-weight: 600;

// border-bottom: 2px solid #2c3e50;

// }


// td {

// padding: 10px 12px;

// border-bottom: 1px solid #ecf0f1;

// vertical-align: top;

// }


// tr:nth-child(even) {

// background: #f8f9fa;

// }


// tr:hover {

// background: #e8f4f8;

// }


// .value-normal {

// color: #27ae60;

// font-weight: 600;

// }


// .value-abnormal {

// color: #e74c3c;

// font-weight: 600;

// }


// .value-borderline {

// color: #f39c12;

// font-weight: 600;

// }


// .summary-box {

// background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// color: white;

// padding: 20px;

// border-radius: 10px;

// margin: 20px 0;

// text-align: center;

// }


// .summary-box h3 {

// margin: 0 0 10px 0;

// color: white;

// }

// </style>

// `;


// const narrativeCSS = `

// <style>

// .observation-item {

// background: #f8f9fa;

// border-left: 4px solid #3498db;

// margin: 15px 0;

// padding: 15px 20px;

// border-radius: 0 5px 5px 0;

// }


// .observation-item strong {

// color: #2c3e50;

// }


// .conclusion-box {

// background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// color: white;

// padding: 25px;

// border-radius: 10px;

// margin: 25px 0;

// text-align: center;

// }


// .conclusion-box h3 {

// margin: 0 0 15px 0;

// color: white;

// }


// .key-findings {

// background: #fff;

// border: 2px solid #3498db;

// border-radius: 8px;

// padding: 20px;

// margin: 20px 0;

// }

// </style>

// `;


// return baseCSS + (format === 'structured' ? structuredCSS : narrativeCSS);

// }



// // CLEAN AND PROCESS MARKDOWN CONTENT

// function processMarkdownContent(markdownText, testInfo) {

// try {

// // Remove JSON block if present

// let cleanedText = markdownText.replace(/```json[\s\S]*?```\s*/, '').trim();


// // Replace emojis with styled spans

// const emojiReplacements = {

// '🧪': '<span class="emoji-replacement test-tube">TEST</span>',

// '🔍': '<span class="emoji-replacement findings">FINDINGS</span>',

// '🧑‍⚕️': '<span class="emoji-replacement doctor">DOCTOR</span>',

// '📝': '<span class="emoji-replacement">NOTE</span>',

// '❌': '<span class="emoji-replacement abnormal">HIGH/LOW</span>',

// '✅': '<span class="emoji-replacement normal">NORMAL</span>',

// '⚠️': '<span class="emoji-replacement warning">WARNING</span>',

// '📊': '<span class="emoji-replacement">DATA</span>',

// '🩺': '<span class="emoji-replacement doctor">MEDICAL</span>',

// '📄': '<span class="emoji-replacement">REPORT</span>',

// '📌': '<span class="emoji-replacement">KEY</span>'

// };


// Object.entries(emojiReplacements).forEach(([emoji, replacement]) => {

// cleanedText = cleanedText.replace(new RegExp(emoji, 'g'), replacement);

// });


// // Convert markdown to HTML

// let htmlContent = marked(cleanedText);


// // Post-process HTML for better PDF rendering

// htmlContent = htmlContent

// // Enhance table styling

// .replace(/<table>/g, '<table class="data-table">')

// // Add classes to value cells that look like normal/abnormal indicators

// .replace(/>\s*✅\s*Normal\s*</g, '><span class="value-normal">✅ Normal</span><')

// .replace(/>\s*❌\s*(High|Low|Abnormal)\s*</g, '><span class="value-abnormal">❌ $1</span><')

// .replace(/>\s*⚠️\s*(Borderline|Review)\s*</g, '><span class="value-borderline">⚠️ $1</span><');


// return htmlContent;


// } catch (error) {

// log.error('Error processing markdown content', error);

// return `<p>Error processing content: ${error.message}</p>`;

// }

// }



// // GENERATE COMPLETE HTML DOCUMENT

// function generateHTML(markdownText, testInfo, filename) {

// const processedContent = processMarkdownContent(markdownText, testInfo);

// const css = generateCSS(testInfo.format, testInfo.testType);

// const currentDate = new Date().toLocaleDateString('en-US', {

// year: 'numeric',

// month: 'long',

// day: 'numeric',

// hour: '2-digit',

// minute: '2-digit'

// });


// return `

// <!DOCTYPE html>

// <html lang="en">

// <head>

// <meta charset="UTF-8">

// <meta name="viewport" content="width=device-width, initial-scale=1.0">

// <title>${testInfo.testType} - ${filename}</title>

// ${css}

// </head>

// <body>

// <div class="header">

// <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-height: 70px; margin-bottom: 15px;">

// <h1>${testInfo.testType}</h1>

// <div class="subtitle">

// Generated on ${currentDate} | Format: ${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}

// </div>

// </div>


// <div class="content">

// ${processedContent}

// </div>


// <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">

// <p>This report was generated by DocSpace AI Medical Interpretation Service</p>

// <p><strong>Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p>

// </div>

// </body>

// </html>

// `;

// }



// // MARKDOWN TO PDF CONVERTER USING html-pdf

// function markdownToPDF(markdownText, filename = 'document.pdf') {

// return new Promise((resolve, reject) => {

// try {

// log.debug('📝 Starting markdown to PDF conversion using html-pdf');


// // Extract test information from the AI response

// const testInfo = extractTestInfo(markdownText);

// log.debug('🔍 Extracted test info', testInfo);


// // Generate complete HTML document

// const htmlContent = generateHTML(markdownText, testInfo, filename);

// log.debug('📄 Generated HTML content', {

// htmlLength: htmlContent.length,

// testType: testInfo.testType,

// format: testInfo.format

// });


// // Configure PDF options based on content type

// const dynamicOptions = { ...pdfOptions };


// if (testInfo.format === 'structured') {

// // Structured reports might need more width for tables

// dynamicOptions.border = {

// top: '15mm',

// right: '10mm',

// bottom: '20mm',

// left: '10mm'

// };

// }


// // Generate PDF

// pdf.create(htmlContent, dynamicOptions).toBuffer((err, buffer) => {

// if (err) {

// log.error('❌ PDF generation failed', err);

// reject(new Error(`PDF generation failed: ${err.message}`));

// return;

// }


// log.info('✅ PDF generated successfully', {

// pdfSize: `${(buffer.length / 1024).toFixed(2)} KB`,

// testType: testInfo.testType,

// format: testInfo.format

// });


// resolve(buffer);

// });


// } catch (error) {

// log.error('❌ Markdown to PDF conversion failed', error);

// reject(error);

// }

// });

// }



// // PDF GENERATION ROUTE

// router.post('/generate', async (req, res) => {

// const startTime = Date.now();

// const requestId = Math.random().toString(36).substring(7);


// log.info(`🚀 New PDF generation request [${requestId}]`, {

// ip: req.ip,

// userAgent: req.get('User-Agent'),

// contentLength: req.get('Content-Length')

// });



// try {

// // Validate request body

// const { encryptedContent, clientId, emailAddress, filename } = req.body;


// log.debug(`📝 Request validation [${requestId}]`, {

// hasEncryptedContent: !!encryptedContent,

// hasClientId: !!clientId,

// hasEmailAddress: !!emailAddress,

// filename: filename || 'not provided'

// });



// if (!encryptedContent || !clientId || !emailAddress) {

// const missingFields = [];

// if (!encryptedContent) missingFields.push('encryptedContent');

// if (!clientId) missingFields.push('clientId');

// if (!emailAddress) missingFields.push('emailAddress');


// log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });

// return res.status(400).json({

// error: 'Missing required fields',

// missing: missingFields,

// requestId

// });

// }



// // Validate email format

// const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// if (!emailRegex.test(emailAddress)) {

// log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });

// return res.status(400).json({

// error: 'Invalid email format',

// requestId

// });

// }



// log.info(`✅ Request validation passed [${requestId}]`);


// // 1. Decrypt the text

// log.info(`🔓 Step 1: Decrypting content [${requestId}]`);

// const aiInterpretation = decrypt(encryptedContent, clientId);


// // 2. Generate PDF from AI interpretation using html-pdf

// log.info(`📄 Step 2: Generating PDF from AI interpretation [${requestId}]`);

// let pdfBuffer;

// try {

// pdfBuffer = await markdownToPDF(aiInterpretation, filename);

// log.info(`✅ PDF generated successfully [${requestId}]`, {

// pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`

// });

// } catch (pdfError) {

// log.error(`❌ PDF generation failed [${requestId}]`, pdfError);

// throw new Error(`PDF generation failed: ${pdfError.message}`);

// }


// // 3. Send email

// log.info(`📧 Step 3: Sending email [${requestId}]`, {

// to: emailAddress,

// filename: filename || 'medical-report.pdf'

// });


// try {

// const transporter = nodemailer.createTransport(emailConfig);

// const testInfo = extractTestInfo(aiInterpretation);


// const mailOptions = {

// from: emailConfig.auth.user,

// to: emailAddress,

// subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,

// html: `

// <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7f6;">

// <div style="text-align: center; padding: 20px; background-color: #ffffff;">

// <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-width: 200px; height: auto;">

// </div>

// <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">

// <h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready!</h2>

// </div>


// <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">

// <p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p>


// <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">

// <table style="width: 100%; border-collapse: collapse;">

// <tr>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${filename || 'medical-report.pdf'}</td>

// </tr>

// <tr>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td>

// </tr>

// <tr>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📊 Format:</strong></td>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.format.charAt(0).toUpperCase() + testInfo.format.slice(1)}</td>

// </tr>

// <tr>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📅 Generated:</strong></td>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${new Date().toLocaleString()}</td>

// </tr>

// <tr>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📦 Size:</strong></td>

// <td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td>

// </tr>

// <tr>

// <td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td>

// <td style="padding: 8px 0;">${requestId}</td>

// </tr>

// </table>

// </div>


// <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">

// <p style="margin: 0;"><strong>⚠️ Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice. Please consult with your healthcare provider for proper medical interpretation and treatment recommendations.</p>

// </div>


// <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 30px;">

// Generated by DocSpace AI Medical Interpretation Service<br>

// Powered by Advanced AI Technology

// </p>

// </div>

// </div>

// `,

// attachments: [{

// filename: filename || 'medical-report.pdf',

// content: pdfBuffer,

// contentType: 'application/pdf'

// }]

// };


// const emailResult = await transporter.sendMail(mailOptions);

// log.info(`✅ Email sent successfully [${requestId}]`, {

// messageId: emailResult.messageId,

// to: emailAddress

// });


// } catch (emailError) {

// log.error(`❌ Email sending failed [${requestId}]`, emailError);

// throw new Error(`Email sending failed: ${emailError.message}`);

// }


// const duration = Date.now() - startTime;

// const testInfo = extractTestInfo(aiInterpretation);


// log.info(`🎉 Request completed successfully [${requestId}]`, {

// duration: `${duration}ms`,

// to: emailAddress,

// filename: filename || 'medical-report.pdf',

// testType: testInfo.testType,

// format: testInfo.format

// });


// res.json({

// success: true,

// message: 'Medical report PDF generated and sent successfully!',

// requestId,

// duration,

// details: {

// emailAddress,

// filename: filename || 'medical-report.pdf',

// testType: testInfo.testType,

// format: testInfo.format,

// isValidTest: testInfo.isValidTest,

// pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,

// processingTime: `${duration}ms`

// }

// });


// } catch (error) {

// const duration = Date.now() - startTime;

// log.error(`💥 Request failed [${requestId}]`, {

// error: error.message,

// duration: `${duration}ms`,

// stack: error.stack

// });


// // Determine error type and appropriate response

// let statusCode = 500;

// let errorType = 'INTERNAL_ERROR';


// if (error.message.includes('Decryption failed')) {

// statusCode = 400;

// errorType = 'DECRYPTION_ERROR';

// } else if (error.message.includes('Email sending failed')) {

// statusCode = 503;

// errorType = 'EMAIL_ERROR';

// } else if (error.message.includes('PDF generation failed')) {

// statusCode = 500;

// errorType = 'PDF_ERROR';

// }


// res.status(statusCode).json({

// error: error.message,

// errorType,

// requestId,

// duration,

// timestamp: new Date().toISOString()

// });

// }

// });



// // Health check for PDF service

// router.get('/health', (req, res) => {

// log.info('🏥 PDF service health check requested');

// res.json({

// status: 'OK',

// service: 'PDF Generation Service (html-pdf)',

// timestamp: new Date().toISOString(),

// uptime: process.uptime(),

// memory: process.memoryUsage(),

// supportedFormats: ['structured', 'narrative', 'invalid']

// });

// });



// module.exports = router;

// const express = require('express');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const { PDFDocument, rgb } = require('pdf-lib');
// const fetch = require('node-fetch');
// const fontkit = require('fontkit'); // For custom font support
// const fs = require('fs');
// const path = require('path');
// const { marked } = require('marked');

// const router = express.Router();

// // LOGGING SETUP
// const log = {
//     info: (message, data = null) => {
//         const timestamp = new Date().toISOString();
//         console.log(`[${timestamp}] INFO: ${message}`);
//         if (data) console.log('Data:', JSON.stringify(data, null, 2));
//     },
//     error: (message, error = null) => {
//         const timestamp = new Date().toISOString();
//         console.error(`[${timestamp}] ERROR: ${message}`);
//         if (error) {
//             console.error('Error details:', error.message);
//             console.error('Stack trace:', error.stack);
//         }
//     },
//     warn: (message, data = null) => {
//         const timestamp = new Date().toISOString();
//         console.warn(`[${timestamp}] WARN: ${message}`);
//         if (data) console.warn('Data:', data);
//     },
//     debug: (message, data = null) => {
//         const timestamp = new Date().toISOString();
//         console.log(`[${timestamp}] DEBUG: ${message}`);
//         if (data) console.log('Debug data:', JSON.stringify(data, null, 2));
//     }
// };

// // EMAIL SETUP
// const emailConfig = {
//     host: 'labmate.docspace.co.ke',
//     port: 465,
//     secure: true,
//     auth: {
//         user: process.env.RESULTS_USER,
//         pass: process.env.RESULTS_PASS
//     }
// };

// // DECRYPT FUNCTION
// function decrypt(encryptedData, clientId) {
//     try {
//         log.debug('🔓 Starting decryption process', { encryptedDataLength: encryptedData.length, clientIdLength: clientId.length });
//         const data = Buffer.from(encryptedData, 'base64');
//         if (data.length < 64) {
//             throw new Error(`Data too short: ${data.length} bytes (minimum 64 required)`);
//         }
//         const salt = data.slice(0, 16);
//         const iv = data.slice(16, 32);
//         const authTag = data.slice(32, 64);
//         const encrypted = data.slice(64);
//         const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
//         const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
//         const hmacInput = Buffer.concat([salt, iv, encrypted]);
//         const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
//         if (!authTag.equals(expectedTag)) {
//             throw new Error('HMAC verification failed - data may be corrupted or tampered with');
//         }
//         const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
//         let decrypted = decipher.update(encrypted, null, 'utf8');
//         decrypted += decipher.final('utf8');
//         log.info('✅ Decryption successful');
//         return decrypted;
//     } catch (error) {
//         log.error('❌ Decryption failed', error);
//         throw new Error(`Decryption failed: ${error.message}`);
//     }
// }

// // EXTRACT TEST TYPE AND FORMAT FROM AI RESPONSE
// function extractTestInfo(markdownText) {
//     try {
//         const jsonMatch = markdownText.match(/```json\s*({[\s\S]*?})\s*```/);
//         if (jsonMatch) {
//             try {
//                 const parsedJson = JSON.parse(jsonMatch[1]);
//                 return {
//                     testType: parsedJson.testType || 'Medical Report',
//                     format: parsedJson.format || 'narrative',
//                     isValidTest: !!parsedJson.isValidTest
//                 };
//             } catch (err) {
//                 log.warn('Failed to parse JSON from AI response, using defaults');
//             }
//         }
//         const hasTable = markdownText.includes('|') && markdownText.includes('---');
//         const hasStructuredData = /\d+\.?\d*\s*(mg\/dL|g\/dL|mmol\/L|IU\/L|ng\/mL)/i.test(markdownText);
//         return {
//             testType: 'Medical Report',
//             format: (hasTable || hasStructuredData) ? 'structured' : 'narrative',
//             isValidTest: true
//         };
//     } catch (error) {
//         log.warn('Could not extract test info, using defaults');
//         return { testType: 'Medical Report', format: 'narrative', isValidTest: true };
//     }
// }

// // ==========================================================================================
// // PDF-LIB IMPLEMENTATION WITH CUSTOM FONTS
// // ==========================================================================================

// // PDF STYLING CONSTANTS
// const styles = {
//     colors: {
//         primary: rgb(0.17, 0.24, 0.31), text: rgb(0.2, 0.2, 0.2),
//         lightText: rgb(0.5, 0.55, 0.55), border: rgb(0.93, 0.94, 0.95),
//         tableHeader: rgb(0.2, 0.28, 0.36), white: rgb(1, 1, 1),
//     },
//     fontSizes: { h1: 24, h2: 18, p: 10, tableHeader: 11, tableCell: 10, footer: 8 },
//     lineHeight: 1.5,
//     margins: { top: 72, bottom: 72, left: 57, right: 57 },
// };

// // PREPROCESS MARKDOWN TO REPLACE EMOJIS
// function preprocessMarkdown(markdownText) {
//     let processedText = markdownText;
//     const replacements = {
//         '🧪': '**Test:**', '🔍': '**Findings:**', '🧑‍⚕️': '**Doctor\'s Note:**',
//         '📝': '**Note:**', '❌': '**Result (Abnormal):**', '✅': '**Result (Normal):**',
//         '⚠️': '**Warning:**', '📊': '**Data:**', '🩺': '**Medical:**',
//         '📄': '**Report:**', '📌': '**Key Point:**'
//     };
//     for (const [emoji, text] of Object.entries(replacements)) {
//         processedText = processedText.replace(new RegExp(emoji, 'g'), text);
//     }
//     return processedText;
// }

// // LOAD FONT FILES FROM DISK
// const fontBytes = {
//     regular: fs.readFileSync(path.join(__dirname, '../fonts/NotoSans-Regular.ttf')),
//     bold: fs.readFileSync(path.join(__dirname, '../fonts/NotoSans-Bold.ttf')),
//     italic: fs.readFileSync(path.join(__dirname, '../fonts/NotoSans-Italic.ttf')),
// };

// // TEXT WRAPPING HELPER
// function wrapText(text, maxWidth, font, fontSize) {
//     const words = text.split(' ');
//     let lines = [];
//     if (!words.length) return lines;
//     let currentLine = words.shift();
//     for (const word of words) {
//         const lineWithWord = `${currentLine} ${word}`;
//         if (font.widthOfTextAtSize(lineWithWord, fontSize) <= maxWidth) {
//             currentLine = lineWithWord;
//         } else {
//             lines.push(currentLine);
//             currentLine = word;
//         }
//     }
//     lines.push(currentLine);
//     return lines;
// }

// // PDF HEADER AND FOOTER DRAWING HELPERS
// // ## FIX 1: Add 'height' as a parameter to the function signature.
// async function drawHeader(page, resources, testInfo, height) {
//     const { width } = page.getSize();
//     const { fonts, logoImage } = resources;
//     const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
//     const logoDims = logoImage.scale(0.25);
//     page.drawImage(logoImage, {
//         x: (width - logoDims.width) / 2, y: height - styles.margins.top + 70,
//         width: logoDims.width, height: logoDims.height,
//     });
    
//     page.drawText(testInfo.testType, {
//         x: 0, y: height - styles.margins.top + 30,
//         font: fonts.bold, size: styles.fontSizes.h1, color: styles.colors.primary,
//         width: width, align: 'center',
//     });

//     page.drawText(`Generated on ${currentDate}`, {
//         x: 0, y: height - styles.margins.top + 15,
//         font: fonts.regular, size: styles.fontSizes.p, color: styles.colors.lightText,
//         width: width, align: 'center',
//     });

//     page.drawLine({
//         start: { x: styles.margins.left, y: height - styles.margins.top },
//         end: { x: width - styles.margins.right, y: height - styles.margins.top },
//         thickness: 2, color: styles.colors.primary,
//     });
// }

// async function drawFooter(page, pageNumber, totalPages, resources) {
//     const { width } = page.getSize();
//     const { fonts } = resources;
//     const footerText = `Page ${pageNumber} of ${totalPages} - Generated by DocSpace PDF Service`;
    
//     page.drawText(footerText, {
//         x: 0, y: styles.margins.bottom - 20,
//         font: fonts.regular, size: styles.fontSizes.footer, color: styles.colors.lightText,
//         width: width, align: 'center',
//     });
// }

// // MAIN PDF GENERATION FUNCTION
// async function markdownToPDF(markdownText, filename = 'document.pdf') {
//     log.debug('📝 Starting markdown to PDF conversion with pdf-lib and custom fonts');
//     const processedMarkdown = preprocessMarkdown(markdownText);

//     const pdfDoc = await PDFDocument.create();
//     pdfDoc.registerFontkit(fontkit);

//     const fonts = {
//         regular: await pdfDoc.embedFont(fontBytes.regular),
//         bold: await pdfDoc.embedFont(fontBytes.bold),
//         italic: await pdfDoc.embedFont(fontBytes.italic),
//     };

//     // const testInfo = extractTestInfo(markdownText);
//     // const logoUrl = 'https://labmate.docspace.co.ke/labmatelogo.png';
//     // const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
//     // const logoImage = await pdfDoc.embedPng(logoBytes);
//     // const resources = { pdfDoc, fonts, logoImage };

//     const testInfo = extractTestInfo(markdownText);
//     // ⬇️ Load the logo from a local file instead of a URL
//     const logoPath = path.join(__dirname, '../assets/labmatelogo.png');
//     const logoBytes = fs.readFileSync(logoPath);
//     const logoImage = await pdfDoc.embedPng(logoBytes);
//     const resources = { pdfDoc, fonts, logoImage };
    
//     let page = pdfDoc.addPage();
//     const { width, height } = page.getSize();
//     const contentWidth = width - styles.margins.left - styles.margins.right;
//     let y = height - styles.margins.top - 50; 
    
//     const checkAndAddNewPage = async (requiredHeight) => {
//         if (y - requiredHeight < styles.margins.bottom) {
//             page = pdfDoc.addPage();
//             y = height - styles.margins.top - 20;
//             // ## FIX 2: Pass 'height' when calling drawHeader for a new page.
//             await drawHeader(page, resources, testInfo, height);
//         }
//     };

//     // ## FIX 3: Pass 'height' when calling drawHeader for the first page.
//     await drawHeader(page, resources, testInfo, height);
    
//     const tokens = marked.lexer(processedMarkdown);

//     for (const token of tokens) {
//         let text = 'text' in token ? token.text.replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
//         switch (token.type) {
//             case 'heading':
//                 await checkAndAddNewPage(50);
//                 y -= 20;
//                 page.drawText(text, {
//                     x: styles.margins.left, y, font: fonts.bold,
//                     size: token.depth === 1 ? styles.fontSizes.h1 : styles.fontSizes.h2,
//                     color: styles.colors.primary,
//                 });
//                 y -= (token.depth === 1 ? styles.fontSizes.h1 : styles.fontSizes.h2) * styles.lineHeight;
//                 break;

//             case 'paragraph':
//                 const lines = wrapText(text, contentWidth, fonts.regular, styles.fontSizes.p);
//                 await checkAndAddNewPage(lines.length * styles.fontSizes.p * styles.lineHeight + 10);
//                 y -= 10;
//                 for (const line of lines) {
//                     page.drawText(line, {
//                         x: styles.margins.left, y, font: fonts.regular, size: styles.fontSizes.p,
//                         color: styles.colors.text, lineHeight: styles.fontSizes.p * styles.lineHeight,
//                     });
//                     y -= styles.fontSizes.p * styles.lineHeight;
//                 }
//                 break;
            
//             case 'list':
//                 await checkAndAddNewPage(token.items.length * 20);
//                 y -= 10;
//                 for(const item of token.items) {
//                     const itemLines = wrapText(item.text, contentWidth - 20, fonts.regular, styles.fontSizes.p);
//                     await checkAndAddNewPage(itemLines.length * styles.fontSizes.p * styles.lineHeight + 5);
//                     y -= 5;
//                     let lineY = y;
//                     page.drawText('•', { x: styles.margins.left, y: lineY, font: fonts.regular, size: styles.fontSizes.p });
//                     for(const line of itemLines) {
//                         page.drawText(line, {
//                             x: styles.margins.left + 20, y: lineY, font: fonts.regular,
//                             size: styles.fontSizes.p, lineHeight: styles.fontSizes.p * styles.lineHeight,
//                         });
//                         lineY -= styles.fontSizes.p * styles.lineHeight;
//                     }
//                     y = lineY;
//                 }
//                 break;

//             case 'table':
//                 const header = token.header.map(h => h.text);
//                 const rows = token.rows.map(row => row.map(cell => cell.text));
//                 const numColumns = header.length;
//                 if (numColumns === 0) continue;
//                 const columnWidth = contentWidth / numColumns;
                
//                 await checkAndAddNewPage(40);
//                 y -= 20;

//                 const headerY = y;
//                 page.drawRectangle({
//                     x: styles.margins.left, y: headerY - styles.fontSizes.tableHeader * styles.lineHeight * 0.7,
//                     width: contentWidth, height: styles.fontSizes.tableHeader * styles.lineHeight,
//                     color: styles.colors.tableHeader,
//                 });
//                 header.forEach((text, i) => {
//                     page.drawText(text, {
//                         x: styles.margins.left + (i * columnWidth) + 5, y: headerY,
//                         font: fonts.bold, size: styles.fontSizes.tableHeader, color: styles.colors.white,
//                     });
//                 });
//                 y -= styles.fontSizes.tableHeader * styles.lineHeight;

//                 for (const row of rows) {
//                     let maxLines = 1;
//                     const wrappedCells = row.map(cellText => {
//                         const lines = wrapText(cellText, columnWidth - 10, fonts.regular, styles.fontSizes.tableCell);
//                         if (lines.length > maxLines) maxLines = lines.length;
//                         return lines;
//                     });
                    
//                     const rowHeight = maxLines * styles.fontSizes.tableCell * styles.lineHeight;
//                     await checkAndAddNewPage(rowHeight + 5);
//                     y -= rowHeight;
                    
//                     wrappedCells.forEach((lines, i) => {
//                         let cellY = y + (rowHeight - styles.fontSizes.tableCell);
//                         for (const line of lines) {
//                             page.drawText(line, {
//                                 x: styles.margins.left + (i * columnWidth) + 5, y: cellY,
//                                 font: fonts.regular, size: styles.fontSizes.tableCell, color: styles.colors.text
//                             });
//                             cellY -= styles.fontSizes.tableCell * styles.lineHeight;
//                         }
//                     });

//                     page.drawLine({
//                         start: { x: styles.margins.left, y: y - 2 }, end: { x: width - styles.margins.right, y: y - 2 },
//                         thickness: 0.5, color: styles.colors.border,
//                     });
//                     y-= 2;
//                 }
//                 break;
//         }
//     }

//     const pages = pdfDoc.getPages();
//     for (let i = 0; i < pages.length; i++) {
//         await drawFooter(pages[i], i + 1, pages.length, resources);
//     }
    
//     const pdfBytes = await pdfDoc.save();
//     log.info('✅ PDF generated successfully with pdf-lib and custom fonts', {
//         pdfSize: `${(pdfBytes.length / 1024).toFixed(2)} KB`,
//     });
//     return Buffer.from(pdfBytes);
// }

// // PDF GENERATION ROUTE
// router.post('/generate', async (req, res) => {
//     const startTime = Date.now();
//     const requestId = Math.random().toString(36).substring(7);

//     log.info(`🚀 New PDF generation request [${requestId}]`);

//     try {
//         const { encryptedContent, clientId, emailAddress, filename } = req.body;
//         if (!encryptedContent || !clientId || !emailAddress) {
//             return res.status(400).json({ error: 'Missing required fields' });
//         }
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(emailAddress)) {
//             return res.status(400).json({ error: 'Invalid email format' });
//         }

//         log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
//         const aiInterpretation = decrypt(encryptedContent, clientId);
//         const testInfo = extractTestInfo(aiInterpretation);

//         log.info(`📄 Step 2: Generating PDF from AI interpretation [${requestId}]`);
//         const pdfBuffer = await markdownToPDF(aiInterpretation, filename);
        
//         log.info(`📧 Step 3: Sending email [${requestId}]`);
//         const transporter = nodemailer.createTransport(emailConfig);
//         const mailOptions = {
//             from: emailConfig.auth.user,
//             to: emailAddress,
//             subject: `Your ${testInfo.testType} Report: ${filename || 'medical-report.pdf'}`,
//             html: `
// <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7f6;">
//   <div style="text-align: center; padding: 20px; background-color: #ffffff;">
//     <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-width: 200px; height: auto;">
//   </div>
//   <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
//     <h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready!</h2>
//   </div>
//   <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
//     <p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p>
//     <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">
//       <table style="width: 100%; border-collapse: collapse;">
//         <tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${filename || 'medical-report.pdf'}</td></tr>
//         <tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td></tr>
//         <tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📅 Generated:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${new Date().toLocaleString()}</td></tr>
//         <tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📦 Size:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${(pdfBuffer.length / 1024).toFixed(2)} KB</td></tr>
//         <tr><td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td><td style="padding: 8px 0;">${requestId}</td></tr>
//       </table>
//     </div>
//     <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
//       <p style="margin: 0;"><strong>⚠️ Important Disclaimer:</strong> This AI-generated interpretation is for informational purposes only and should not replace professional medical advice.</p>
//     </div>
//   </div>
// </div>`,
//             attachments: [{
//                 filename: filename || 'medical-report.pdf',
//                 content: pdfBuffer,
//                 contentType: 'application/pdf'
//             }]
//         };
//         await transporter.sendMail(mailOptions);
        
//         const duration = Date.now() - startTime;
//         log.info(`🎉 Request completed successfully [${requestId}]`, { duration: `${duration}ms` });
//         res.json({
//             success: true, message: 'Medical report PDF generated and sent successfully!', requestId,
//         });

//     } catch (error) {
//         const duration = Date.now() - startTime;
//         log.error(`💥 Request failed [${requestId}]`, { error: error.message, duration: `${duration}ms`, stack: error.stack });
//         let statusCode = 500; let errorType = 'INTERNAL_ERROR';
//         if (error.message.includes('Decryption failed')) { statusCode = 400; errorType = 'DECRYPTION_ERROR'; }
//         else if (error.message.includes('Email sending failed')) { statusCode = 503; errorType = 'EMAIL_ERROR'; }
//         else if (error.message.includes('PDF generation failed')) { statusCode = 500; errorType = 'PDF_ERROR'; }
//         res.status(statusCode).json({ error: error.message, errorType, requestId });
//     }
// });

// // HEALTH CHECK ROUTE
// router.get('/health', (req, res) => {
//     log.info('🏥 PDF service health check requested');
//     res.json({
//         status: 'OK',
//         service: 'PDF Generation Service (pdf-lib)',
//         timestamp: new Date().toISOString(),
//         uptime: process.uptime(),
//         memory: process.memoryUsage(),
//         supportedFormats: ['structured', 'narrative']
//     });
// });

// module.exports = router;

/*
 * _           _       _
 * | |         | |     | |
 * | |     __ _| |_ ___| |_   ___  _ __
 * | |    / _` | __/ __| __| / _ \| '_ \
 * | |___| (_| | |_\__ \ |_ | (_) | | | |
 * \_____/\__,_|\__|___/\__| \___/|_| |_|
 *
 * PDF Generation & Emailing Service
 */

/**
 * @file Express router for PDF generation and email services.
 * @description This service handles encrypted medical data, decrypts it,
 * generates a styled PDF report from a Markdown AI interpretation,
 * and emails it to the user.
 * @author DocSpace Engineering (Styling by Gemini)
 * @date July 5, 2025
 */

// =========================================================================
//                                 IMPORTS
// =========================================================================

// Core Node.js Modules
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Third-Party Modules
const express = require('express');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('fontkit');
const { marked } = require('marked');

// =========================================================================
//                               CONFIGURATION
// =========================================================================

const router = express.Router();

/**
 * Centralized application configuration.
 */
const CONFIG = {
    EMAIL: {
        HOST: 'labmate.docspace.co.ke',
        PORT: 465,
        SECURE: true,
        AUTH: {
            USER: process.env.RESULTS_USER,
            PASS: process.env.RESULTS_PASS,
        },
    },
    PDF: {
        STYLES: {
            COLORS: {
                PRIMARY: rgb(0.17, 0.24, 0.31),      // Dark Blue/Charcoal
                TEXT: rgb(0.2, 0.2, 0.2),            // Dark Gray
                LIGHT_TEXT: rgb(0.5, 0.55, 0.55),    // Medium Gray
                BORDER: rgb(0.93, 0.94, 0.95),       // Light Gray
                TABLE_HEADER: rgb(0.2, 0.28, 0.36),  // Darker Blue/Charcoal
                WHITE: rgb(1, 1, 1),
            },
            FONT_SIZES: { H1: 24, H2: 18, P: 10, TABLE_HEADER: 11, TABLE_CELL: 10, FOOTER: 8 },
            LINE_HEIGHT: 1.5,
            MARGINS: { TOP: 72, BOTTOM: 72, LEFT: 57, RIGHT: 57 },
        },
        PATHS: {
            FONTS: {
                REGULAR: path.join(__dirname, '../fonts/NotoSans-Regular.ttf'),
                BOLD: path.join(__dirname, '../fonts/NotoSans-Bold.ttf'),
                ITALIC: path.join(__dirname, '../fonts/NotoSans-Italic.ttf'),
            },
            ASSETS: {
                LOGO: path.join(__dirname, '../assets/labmatelogo.png'),
            },
        },
    },
};

// =========================================================================
//                                  LOGGER
// =========================================================================

/**
 * A simple timestamped logger for console output.
 */
const log = {
    info: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ✅ INFO: ${message}`);
        if (data) console.log('  Data:', JSON.stringify(data, null, 2));
    },
    error: (message, error = null) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ ERROR: ${message}`);
        if (error) {
            console.error('  Error Details:', error.message);
            console.error('  Stack Trace:', error.stack);
        }
    },
    warn: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] ⚠️ WARN: ${message}`);
        if (data) console.warn('  Data:', data);
    },
    debug: (message, data = null) => {
        // Only log debug messages if enabled
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🐞 DEBUG: ${message}`);
            if (data) console.log('  Debug Data:', JSON.stringify(data, null, 2));
        }
    }
};

// =========================================================================
//                             CORE SERVICE LOGIC
// =========================================================================

/**
 * Decrypts data using AES-256-CBC with HMAC-SHA256 for integrity.
 * The encrypted payload is expected in the format: salt(16) || iv(16) || authTag(32) || encryptedData
 * @param {string} encryptedData - The base64 encoded encrypted string.
 * @param {string} clientId - The secret key used for decryption.
 * @returns {string} The decrypted plaintext string.
 * @throws {Error} If decryption or HMAC verification fails.
 */
function decrypt(encryptedData, clientId) {
    try {
        log.debug('🔓 Starting decryption process...');
        const data = Buffer.from(encryptedData, 'base64');

        if (data.length < 64) {
            throw new Error(`Data too short: ${data.length} bytes (minimum 64 required for salt, IV, and auth tag)`);
        }

        // Deconstruct the payload
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 32);
        const authTag = data.slice(32, 64);
        const encrypted = data.slice(64);

        // Derive keys using PBKDF2
        const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
        const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');

        // Verify HMAC to ensure data integrity and authenticity
        const hmacInput = Buffer.concat([salt, iv, encrypted]);
        const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();

        if (!authTag.equals(expectedTag)) {
            throw new Error('HMAC verification failed - data may be corrupted or tampered with');
        }

        // Decrypt the data
        const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');

        log.info('✅ Decryption successful.');
        return decrypted;
    } catch (error) {
        log.error('❌ Decryption failed', error);
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Extracts structured information (test type, format) from the AI's markdown response.
 * @param {string} markdownText - The markdown text from the AI.
 * @returns {{testType: string, format: string, isValidTest: boolean}} Extracted information.
 */
function extractTestInfo(markdownText) {
    try {
        // First, try to find a specific JSON block
        const jsonMatch = markdownText.match(/```json\s*({[\s\S]*?})\s*```/);
        if (jsonMatch) {
            try {
                const parsedJson = JSON.parse(jsonMatch[1]);
                return {
                    testType: parsedJson.testType || 'Medical Report',
                    format: parsedJson.format || 'narrative',
                    isValidTest: !!parsedJson.isValidTest,
                };
            } catch (err) {
                log.warn('Failed to parse JSON from AI response, falling back to heuristics.');
            }
        }
        // Fallback to heuristics if JSON is not found or invalid
        const hasTable = markdownText.includes('|') && markdownText.includes('---');
        const hasStructuredData = /\d+\.?\d*\s*(mg\/dL|g\/dL|mmol\/L|IU\/L|ng\/mL)/i.test(markdownText);

        return {
            testType: 'Medical Report',
            format: (hasTable || hasStructuredData) ? 'structured' : 'narrative',
            isValidTest: true,
        };
    } catch (error) {
        log.warn('Could not extract test info due to an unexpected error, using defaults.', error);
        return { testType: 'Medical Report', format: 'narrative', isValidTest: true };
    }
}

// =========================================================================
//                           PDF GENERATION MODULE
// =========================================================================

/**
 * Replaces common emojis with markdown bold text for better PDF rendering.
 * @param {string} markdownText - The input markdown.
 * @returns {string} The processed text.
 */
function preprocessMarkdown(markdownText) {
    const replacements = {
        '🧪': '**Test:**', '🔍': '**Findings:**', '🧑‍⚕️': '**Doctor\'s Note:**',
        '📝': '**Note:**', '❌': '**Result (Abnormal):**', '✅': '**Result (Normal):**',
        '⚠️': '**Warning:**', '📊': '**Data:**', '🩺': '**Medical:**',
        '📄': '**Report:**', '📌': '**Key Point:**'
    };
    let processedText = markdownText;
    for (const [emoji, text] of Object.entries(replacements)) {
        processedText = processedText.replace(new RegExp(emoji, 'g'), text);
    }
    return processedText;
}

/**
 * Wraps text to fit within a maximum width.
 * @param {string} text - The text to wrap.
 * @param {number} maxWidth - The maximum width in points.
 * @param {object} font - The pdf-lib font object.
 * @param {number} fontSize - The size of the font.
 * @returns {string[]} An array of lines.
 */
function wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    if (!words.length) return [];

    let lines = [];
    let currentLine = words.shift();

    for (const word of words) {
        const lineWithWord = `${currentLine} ${word}`;
        if (font.widthOfTextAtSize(lineWithWord, fontSize) <= maxWidth) {
            currentLine = lineWithWord;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

/**
 * Draws the header on a PDF page.
 * @param {PDFPage} page - The pdf-lib page object.
 * @param {object} resources - Contains fonts and logo image.
 * @param {object} testInfo - Contains the test type.
 * @param {number} height - The height of the page.
 */
async function drawHeader(page, resources, testInfo, height) {
    const { width } = page.getSize();
    const { fonts, logoImage } = resources;
    const { STYLES } = CONFIG.PDF;

    const logoDims = logoImage.scale(0.25);
    page.drawImage(logoImage, {
        x: (width - logoDims.width) / 2,
        y: height - STYLES.MARGINS.TOP + 70, // Position above the title
        width: logoDims.width,
        height: logoDims.height,
    });
    
    page.drawText(testInfo.testType, {
        x: 0, y: height - STYLES.MARGINS.TOP + 30,
        font: fonts.bold, size: STYLES.FONT_SIZES.H1, color: STYLES.COLORS.PRIMARY,
        width: width, align: 'center',
    });

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    page.drawText(`Generated on ${currentDate}`, {
        x: 0, y: height - STYLES.MARGINS.TOP + 15,
        font: fonts.regular, size: STYLES.FONT_SIZES.P, color: STYLES.COLORS.LIGHT_TEXT,
        width: width, align: 'center',
    });

    page.drawLine({
        start: { x: STYLES.MARGINS.LEFT, y: height - STYLES.MARGINS.TOP },
        end: { x: width - STYLES.MARGINS.RIGHT, y: height - STYLES.MARGINS.TOP },
        thickness: 2, color: STYLES.COLORS.PRIMARY,
    });
}

/**
 * Draws the footer on a PDF page.
 * @param {PDFPage} page - The pdf-lib page object.
 * @param {number} pageNumber - The current page number.
 * @param {number} totalPages - The total number of pages.
 */
async function drawFooter(page, pageNumber, totalPages) {
    const { width } = page.getSize();
    const { STYLES } = CONFIG.PDF;
    const footerText = `Page ${pageNumber} of ${totalPages} - Generated by DocSpace PDF Service`;
    
    page.drawText(footerText, {
        x: 0, y: STYLES.MARGINS.BOTTOM - 20,
        font: await page.doc.embedFont(fs.readFileSync(CONFIG.PDF.PATHS.FONTS.REGULAR)),
        size: STYLES.FONT_SIZES.FOOTER, color: STYLES.COLORS.LIGHT_TEXT,
        width: width, align: 'center',
    });
}

/**
 * Converts markdown text into a styled PDF document.
 * @param {string} markdownText - The markdown content to convert.
 * @returns {Promise<Buffer>} A buffer containing the generated PDF bytes.
 */
async function markdownToPDF(markdownText) {
    log.debug('📝 Starting markdown to PDF conversion...');
    const { STYLES, PATHS } = CONFIG.PDF;
    const processedMarkdown = preprocessMarkdown(markdownText);

    // Initialize PDF Document
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Load resources
    const resources = {
        fonts: {
            regular: await pdfDoc.embedFont(fs.readFileSync(PATHS.FONTS.REGULAR)),
            bold: await pdfDoc.embedFont(fs.readFileSync(PATHS.FONTS.BOLD)),
            italic: await pdfDoc.embedFont(fs.readFileSync(PATHS.FONTS.ITALIC)),
        },
        logoImage: await pdfDoc.embedPng(fs.readFileSync(PATHS.ASSETS.LOGO)),
    };
    const testInfo = extractTestInfo(markdownText);
    
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const contentWidth = width - STYLES.MARGINS.LEFT - STYLES.MARGINS.RIGHT;
    let y = height - STYLES.MARGINS.TOP - 50; 
    
    // Helper to handle page breaks
    const checkAndAddNewPage = async (requiredHeight) => {
        if (y - requiredHeight < STYLES.MARGINS.BOTTOM) {
            page = pdfDoc.addPage();
            y = height - STYLES.MARGINS.TOP - 20;
            await drawHeader(page, resources, testInfo, height);
        }
    };

    // Draw header on the first page
    await drawHeader(page, resources, testInfo, height);
    
    // Process markdown tokens and draw them
    const tokens = marked.lexer(processedMarkdown);
    for (const token of tokens) {
        const text = 'text' in token ? token.text.replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
        
        switch (token.type) {
            case 'heading':
                await checkAndAddNewPage(50);
                y -= 20;
                page.drawText(text, {
                    x: STYLES.MARGINS.LEFT, y, font: resources.fonts.bold,
                    size: token.depth === 1 ? STYLES.FONT_SIZES.H1 : STYLES.FONT_SIZES.H2,
                    color: STYLES.COLORS.PRIMARY,
                });
                y -= (token.depth === 1 ? STYLES.FONT_SIZES.H1 : STYLES.FONT_SIZES.H2) * STYLES.LINE_HEIGHT;
                break;

            case 'paragraph':
                const pLines = wrapText(text, contentWidth, resources.fonts.regular, STYLES.FONT_SIZES.P);
                await checkAndAddNewPage(pLines.length * STYLES.FONT_SIZES.P * STYLES.LINE_HEIGHT + 10);
                y -= 10;
                for (const line of pLines) {
                    page.drawText(line, {
                        x: STYLES.MARGINS.LEFT, y, font: resources.fonts.regular, size: STYLES.FONT_SIZES.P,
                        color: STYLES.COLORS.TEXT, lineHeight: STYLES.FONT_SIZES.P * STYLES.LINE_HEIGHT,
                    });
                    y -= STYLES.FONT_SIZES.P * STYLES.LINE_HEIGHT;
                }
                break;
            
            case 'list':
                await checkAndAddNewPage(token.items.length * 20);
                y -= 10;
                for(const item of token.items) {
                    const itemLines = wrapText(item.text, contentWidth - 20, resources.fonts.regular, STYLES.FONT_SIZES.P);
                    await checkAndAddNewPage(itemLines.length * STYLES.FONT_SIZES.P * STYLES.LINE_HEIGHT + 5);
                    y -= 5;
                    let lineY = y;
                    page.drawText('•', { x: STYLES.MARGINS.LEFT, y: lineY, font: resources.fonts.regular, size: STYLES.FONT_SIZES.P });
                    for(const line of itemLines) {
                        page.drawText(line, {
                            x: STYLES.MARGINS.LEFT + 20, y: lineY, font: resources.fonts.regular,
                            size: STYLES.FONT_SIZES.P, lineHeight: STYLES.FONT_SIZES.P * STYLES.LINE_HEIGHT,
                        });
                        lineY -= STYLES.FONT_SIZES.P * STYLES.LINE_HEIGHT;
                    }
                    y = lineY;
                }
                break;

            case 'table':
                const header = token.header.map(h => h.text);
                if (header.length === 0) continue;
                const rows = token.rows.map(row => row.map(cell => cell.text));
                const colWidth = contentWidth / header.length;
                
                // Draw table header
                await checkAndAddNewPage(40);
                y -= 20;
                page.drawRectangle({
                    x: STYLES.MARGINS.LEFT, y: y - STYLES.FONT_SIZES.TABLE_HEADER * STYLES.LINE_HEIGHT * 0.7,
                    width: contentWidth, height: STYLES.FONT_SIZES.TABLE_HEADER * STYLES.LINE_HEIGHT,
                    color: STYLES.COLORS.TABLE_HEADER,
                });
                header.forEach((th, i) => {
                    page.drawText(th, {
                        x: STYLES.MARGINS.LEFT + (i * colWidth) + 5, y,
                        font: resources.fonts.bold, size: STYLES.FONT_SIZES.TABLE_HEADER, color: STYLES.COLORS.WHITE,
                    });
                });
                y -= STYLES.FONT_SIZES.TABLE_HEADER * STYLES.LINE_HEIGHT;

                // Draw table rows
                for (const row of rows) {
                    const wrappedCells = row.map(cellText => wrapText(cellText, colWidth - 10, resources.fonts.regular, STYLES.FONT_SIZES.TABLE_CELL));
                    const maxLines = Math.max(...wrappedCells.map(c => c.length));
                    const rowHeight = maxLines * STYLES.FONT_SIZES.TABLE_CELL * STYLES.LINE_HEIGHT;
                    
                    await checkAndAddNewPage(rowHeight + 5);
                    y -= rowHeight;
                    
                    wrappedCells.forEach((lines, i) => {
                        let cellY = y + (rowHeight - STYLES.FONT_SIZES.TABLE_CELL);
                        lines.forEach(line => {
                            page.drawText(line, {
                                x: STYLES.MARGINS.LEFT + (i * colWidth) + 5, y: cellY,
                                font: resources.fonts.regular, size: STYLES.FONT_SIZES.TABLE_CELL, color: STYLES.COLORS.TEXT
                            });
                            cellY -= STYLES.FONT_SIZES.TABLE_CELL * STYLES.LINE_HEIGHT;
                        });
                    });

                    page.drawLine({
                        start: { x: STYLES.MARGINS.LEFT, y: y - 2 }, end: { x: width - STYLES.MARGINS.RIGHT, y: y - 2 },
                        thickness: 0.5, color: STYLES.COLORS.BORDER,
                    });
                    y -= 2;
                }
                break;
        }
    }

    // Add footers to all pages
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        await drawFooter(pages[i], i + 1, pages.length);
    }
    
    const pdfBytes = await pdfDoc.save();
    log.info(`📄 PDF generated successfully`, { size: `${(pdfBytes.length / 1024).toFixed(2)} KB` });
    return Buffer.from(pdfBytes);
}

// =========================================================================
//                                API ROUTES
// =========================================================================

/**
 * @route POST /generate
 * @description Main endpoint to generate and email a PDF report from encrypted content.
 * @body {string} encryptedContent - Base64 encrypted report data.
 * @body {string} clientId - The secret key for decryption.
 * @body {string} emailAddress - The recipient's email address.
 * @body {string} [filename] - Optional filename for the PDF attachment.
 */
router.post('/generate', async (req, res) => {
    const startTime = Date.now();
    const requestId = crypto.randomBytes(4).toString('hex');
    log.info(`🚀 [${requestId}] New PDF generation request received.`);

    try {
        // --- 1. Validation ---
        const { encryptedContent, clientId, emailAddress, filename } = req.body;
        if (!encryptedContent || !clientId || !emailAddress) {
            return res.status(400).json({ error: 'Missing required fields: encryptedContent, clientId, emailAddress.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
            return res.status(400).json({ error: 'Invalid email format provided.' });
        }

        // --- 2. Decryption ---
        log.info(`[${requestId}] Step 1: Decrypting content...`);
        const aiInterpretation = decrypt(encryptedContent, clientId);
        const testInfo = extractTestInfo(aiInterpretation);

        // --- 3. PDF Generation ---
        log.info(`[${requestId}] Step 2: Generating PDF for "${testInfo.testType}"...`);
        const pdfBuffer = await markdownToPDF(aiInterpretation);
        
        // --- 4. Emailing ---
        log.info(`[${requestId}] Step 3: Preparing and sending email to ${emailAddress}...`);
        const transporter = nodemailer.createTransport(CONFIG.EMAIL);
        const finalFilename = filename || 'medical-report.pdf';
        
        await transporter.sendMail({
            from: `LabMate Reports <${CONFIG.EMAIL.AUTH.USER}>`,
            to: emailAddress,
            subject: `Your ${testInfo.testType} Report: ${finalFilename}`,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f4f7f6; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0;">
  <div style="text-align: center; padding: 20px; background-color: #ffffff;">
    <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="LabMate Logo" style="max-width: 180px;">
  </div>
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
    <h2 style="margin: 0; font-size: 24px;">📄 Your Medical Report is Ready</h2>
  </div>
  <div style="padding: 30px;">
    <p>Dear User,</p>
    <p>Your <strong>${testInfo.testType}</strong> has been successfully interpreted and is attached to this email.</p>
    <div style="background: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 25px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>📁 Filename:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${finalFilename}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;"><strong>🧪 Test Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">${testInfo.testType}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>🆔 Request ID:</strong></td><td style="padding: 8px 0;">${requestId}</td></tr>
      </table>
    </div>
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; text-align: center;">
      <p style="margin: 0;"><strong>Important:</strong> This AI interpretation is for informational purposes only. Please consult a qualified healthcare professional for medical advice.</p>
    </div>
  </div>
</div>`,
            attachments: [{
                filename: finalFilename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        });
        
        // --- 5. Success Response ---
        const duration = Date.now() - startTime;
        log.info(`[${requestId}] 🎉 Request completed successfully in ${duration}ms.`);
        res.json({
            success: true, message: 'Medical report PDF generated and sent successfully!', requestId,
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        log.error(`[${requestId}] 💥 Request failed after ${duration}ms`, error);
        
        let statusCode = 500;
        let errorType = 'INTERNAL_SERVER_ERROR';
        if (error.message.includes('Decryption failed')) { statusCode = 400; errorType = 'DECRYPTION_ERROR'; }
        else if (error.message.includes('email')) { statusCode = 502; errorType = 'EMAIL_SERVICE_ERROR'; }
        
        res.status(statusCode).json({ success: false, error: error.message, errorType, requestId });
    }
});

/**
 * @route GET /health
 * @description A health check endpoint to verify service status and configuration.
 */
router.get('/health', (req, res) => {
    log.info('🏥 PDF service health check requested.');
    res.json({
        status: 'OK',
        service: 'PDF Generation Service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptimeInSeconds: Math.floor(process.uptime()),
    });
});

// =========================================================================
//                              MODULE EXPORT
// =========================================================================

module.exports = router;