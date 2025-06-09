// routes/pdfRoutes.js
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit'); // Import PDFKit
const { marked } = require('marked');
const stream = require('stream'); // For piping PDF output

const router = express.Router();

// --- LOGGING SETUP ---
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

// --- EMAIL SETUP ---
const emailConfig = {
  host: 'mail.docspace.co.ke',
  port: 465,
  secure: true,
  auth: {
    user: 'mailtest@docspace.co.ke',
    pass: '~iizVde!Ua^SP;MD'
  }
};

// --- DECRYPT FUNCTION ---
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
    
    // Extract parts
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
    
    // Make keys
    log.debug('🔑 Deriving encryption keys...');
    const encKey = crypto.pbkdf2Sync(clientId, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(clientId + 'hmac', salt, 10000, 32, 'sha256');
    log.debug('✅ Keys derived successfully');
    
    // Check if data is valid
    log.debug('🔐 Verifying HMAC authentication...');
    const hmacInput = Buffer.concat([salt, iv, encrypted]);
    const expectedTag = crypto.createHmac('sha256', hmacKey).update(hmacInput).digest();
    
    if (!authTag.equals(expectedTag)) {
      throw new Error('HMAC verification failed - data may be corrupted or tampered with');
    }
    log.debug('✅ HMAC verification passed');
    
    // Decrypt
    log.debug('🔓 Performing AES decryption...');
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

// --- CLEAN AND EXTRACT MARKDOWN CONTENT ---
function extractMarkdownContent(text) {
  try {
    if (text.trim().startsWith('{') && text.includes('interpretation:')) {
      const match = text.match(/interpretation:\s*(.+?)(?:,\s*testType:|$)/s);
      if (match) {
        let extracted = match[1].trim();
        if (extracted.endsWith(',')) {
          extracted = extracted.slice(0, -1);
        }
        return extracted;
      }
    }
    return text;
  } catch (error) {
    log.warn('Could not extract markdown content, using original text');
    return text;
  }
}

// --- SAFE TEXT PROCESSING (removes problematic characters) ---
function safeText(text) {
  if (!text) return '';
  
  return text
    .replace(/[^\x00-\x7F]/g, (char) => {
      const emojiMap = {
        '🧪': '[Test]', '🔍': '[Findings]', '🧑‍⚕️': '[Doctor]', '📝': '[Note]',
        '❌': '[High/Low]', '✅': '[Normal]', '⚠️': '[Warning]', '📊': '[Data]',
        '🩺': '[Medical]'
      };
      return emojiMap[char] || '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// --- MARKDOWN TO PDF CONVERTER USING PDFKIT (Enhanced) ---
async function markdownToPDF(markdownText, documentTitle = 'Generated Document') {
  log.debug('📝 Starting markdown to PDF conversion with pdfkit');

  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 70,    // Adjusted for header
      bottom: 50, // Adjusted for footer
      left: 50,
      right: 50
    },
    bufferPages: true // Essential for total page count in footer
  });

  const bufferStream = new stream.PassThrough();
  doc.pipe(bufferStream);

  // Define a consistent color palette
  const Colors = {
    primary: '#2C3E50',  // Dark Blue/Grey for headings & main elements
    accent: '#3498DB',   // Bright Blue for accents (lines, blockquote border)
    text: '#333333',     // Dark text color for body
    lightGrey: '#ECF0F1', // Very Light Grey for backgrounds (blockquote, code)
    mediumGrey: '#7F8C8D', // Medium Grey for secondary text (footer) and borders
    white: '#FFFFFF',
    offWhite: '#FEFEFE', // For alternating row backgrounds
  };

  const pageMarginLeft = doc.page.margins.left;
  const pageMarginRight = doc.page.margins.right;
  // const pageMarginTop = doc.page.margins.top; // Not directly used in positioning, but for doc init
  // const pageMarginBottom = doc.page.margins.bottom; // Not directly used in positioning
  const contentWidth = doc.page.width - pageMarginLeft - pageMarginRight;

  // --- Header and Footer Drawing Function ---
  const addPageHeaderAndFooter = (doc, pageNumber, totalPages) => {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;

    // Header
    doc.fillColor(Colors.primary)
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(documentTitle, pageMarginLeft, 40, { align: 'left' });

    doc.fillColor(Colors.mediumGrey)
       .font('Helvetica')
       .fontSize(8)
       .text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 
             pageWidth - pageMarginRight - 100, 40, { width: 100, align: 'right' });

    // Header line
    doc.strokeColor(Colors.accent)
       .lineWidth(1)
       .moveTo(pageMarginLeft, 55)
       .lineTo(pageWidth - pageMarginRight, 55)
       .stroke();

    // Footer
    doc.fillColor(Colors.mediumGrey)
       .font('Helvetica')
       .fontSize(8)
       .text(`Page ${pageNumber} of ${totalPages}`, 
             pageMarginLeft, pageHeight - 30, { width: contentWidth, align: 'center' });
  };
  
  // --- Register pageAdded event (will be called for each page) ---
  doc.on('pageAdded', () => {
    // This will be called *after* doc.end() as well to re-stamp total pages
    // Placeholder total pages for now.
    addPageHeaderAndFooter(doc, doc.page.count, 'X'); 
  });


  try {
    const cleanedText = extractMarkdownContent(markdownText);
    const tokens = marked.lexer(cleanedText);

    // Initial header/footer for the first page
    // This ensures the first page has the header/footer before any content is added
    // The 'X' will be replaced by the actual total pages later.
    addPageHeaderAndFooter(doc, 1, 'X');

    for (const token of tokens) {
      switch (token.type) {
        case 'heading': { // Added block scope
          let headingSize;
          let spacingAfterHeading;
          switch (token.depth) {
            case 1: headingSize = 24; spacingAfterHeading = 0.5; break; // in lines
            case 2: headingSize = 20; spacingAfterHeading = 0.4; break;
            case 3: headingSize = 16; spacingAfterHeading = 0.3; break;
            default: headingSize = 14; spacingAfterHeading = 0.2; break;
          }

          doc.fillColor(Colors.primary)
             .font('Helvetica-Bold')
             .fontSize(headingSize)
             .text(safeText(token.text), {
               width: contentWidth,
               continued: false // Ensure new line after heading
             })
             .moveDown(0.2); // Small initial move down

          if (token.depth <= 2) {
            const currentY = doc.y; // Get current Y position
            doc.strokeColor(Colors.accent)
               .lineWidth(token.depth === 1 ? 2 : 1)
               .moveTo(doc.x, currentY)
               .lineTo(doc.x + contentWidth * 0.7, currentY)
               .stroke()
               .moveDown(0.2); // Space after line
          }
          doc.moveDown(spacingAfterHeading); // Additional spacing after heading
          break;
        } // End block scope

        case 'paragraph': { // Added block scope
          doc.fillColor(Colors.text)
             .font('Helvetica')
             .fontSize(12)
             .text(safeText(token.text), {
               width: contentWidth,
               lineGap: 4 // Adjust for comfortable line spacing
             })
             .moveDown(0.7); // Space after paragraph
          break;
        } // End block scope

        case 'list': { // Added block scope
          const listIndent = 20;
          doc.fillColor(Colors.text)
             .font('Helvetica')
             .fontSize(12)
             .moveDown(0.5); // Space before list

          for (let i = 0; i < token.items.length; i++) {
            const item = token.items[i];
            const bullet = token.ordered ? `${i + 1}. ` : '• ';
            const itemText = safeText(item.text);

            doc.text(bullet, doc.x + listIndent, doc.y, { continued: true, width: listIndent });
            doc.text(itemText, {
              width: contentWidth - listIndent,
              indent: listIndent,
              lineGap: 4
            })
            .moveDown(0.2); // Small space between list items
          }
          doc.moveDown(0.7); // Space after list
          break;
        } // End block scope

        case 'table': { // Added block scope
          if (token.header && token.rows) {
              const numColumns = token.header.length;
              const colWidth = contentWidth / numColumns;
              const headerRowHeight = 25; 
              const dataRowHeight = 20; 
              const cellPadding = 5;

              doc.moveDown(0.5); // Space before table

              // Helper to draw a cell
              const drawCell = (text, x, y, width, height, font, fontSize, fillColor, textColor, align) => {
                  doc.rect(x, y, width, height)
                     .fill(fillColor)
                     .stroke(Colors.mediumGrey)
                     .lineWidth(0.5);
                  doc.fillColor(textColor)
                     .font(font)
                     .fontSize(fontSize)
                     .text(text, x + cellPadding, y + cellPadding, {
                         width: width - (2 * cellPadding),
                         align: align,
                         height: height - (2 * cellPadding),
                         valign: 'center' // Vertically center text
                     });
              };

              // Draw Header
              let currentTableY = doc.y;
              for (let i = 0; i < token.header.length; i++) {
                  const headerText = safeText(token.header[i]);
                  const headerX = pageMarginLeft + (i * colWidth);
                  drawCell(headerText, headerX, currentTableY, colWidth, headerRowHeight, 
                           'Helvetica-Bold', 10, Colors.lightGrey, Colors.primary, 'center');
              }
              currentTableY += headerRowHeight;

              // Draw Rows
              for (let rowIndex = 0; rowIndex < token.rows.length; rowIndex++) {
                  const row = token.rows[rowIndex];
                  const rowFillColor = rowIndex % 2 === 0 ? Colors.white : Colors.offWhite; 

                  for (let colIndex = 0; colIndex < row.length; colIndex++) {
                      const cellText = safeText(row[colIndex]);
                      const cellX = pageMarginLeft + (colIndex * colWidth);
                      drawCell(cellText, cellX, currentTableY, colWidth, dataRowHeight,
                               'Helvetica', 10, rowFillColor, Colors.text, 'left');
                  }
                  currentTableY += dataRowHeight;
              }
              doc.y = currentTableY + 20; // Set doc.y after table with some margin
          }
          break;
        } // End block scope

        case 'blockquote': { // Added block scope
            const quoteText = safeText(token.text);
            const quoteLineThickness = 5;
            const quotePadding = 15;
            const quoteContentWidth = contentWidth - quoteLineThickness - (2 * quotePadding);

            doc.moveDown(0.5); // Space before blockquote

            // Calculate height of the blockquote content
            doc.font('Helvetica-Oblique').fontSize(12);
            const quoteHeight = doc.heightOfString(quoteText, {
                width: quoteContentWidth,
                lineGap: 4
            }) + (2 * quotePadding); // Add padding for top/bottom

            const blockquoteY = doc.y;
            // Draw background rectangle
            doc.fillColor(Colors.lightGrey)
               .rect(pageMarginLeft, blockquoteY, contentWidth, quoteHeight)
               .fill();

            // Draw accent left line
            doc.fillColor(Colors.accent)
               .rect(pageMarginLeft, blockquoteY, quoteLineThickness, quoteHeight)
               .fill();

            // Draw quote text
            doc.fillColor(Colors.text)
               .font('Helvetica-Oblique')
               .fontSize(12)
               .text(quoteText, pageMarginLeft + quoteLineThickness + quotePadding, blockquoteY + quotePadding, {
                   width: quoteContentWidth,
                   lineGap: 4
               });
            
            // Move y position correctly after the blockquote
            doc.y = blockquoteY + quoteHeight + 20; // Set doc.y after blockquote with margin
            break;
        } // End block scope

        case 'code': { // Added block scope
            const codeContent = safeText(token.text);
            const codePadding = 10;
            const codeContentWidth = contentWidth - (2 * codePadding);

            doc.moveDown(0.5); // Space before code block

            // Calculate height of the code block content
            doc.font('Courier').fontSize(10);
            const codeHeight = doc.heightOfString(codeContent, {
                width: codeContentWidth,
                lineGap: 2
            }) + (2 * codePadding); // Add padding for top/bottom

            const codeBlockY = doc.y;
            // Draw background rectangle and border
            doc.fillColor(Colors.lightGrey)
               .rect(pageMarginLeft, codeBlockY, contentWidth, codeHeight)
               .fill()
               .strokeColor(Colors.mediumGrey)
               .lineWidth(0.5)
               .stroke();

            // Draw code text
            doc.fillColor(Colors.text)
               .font('Courier')
               .fontSize(10)
               .text(codeContent, pageMarginLeft + codePadding, codeBlockY + codePadding, {
                   width: codeContentWidth,
                   lineGap: 2
               });

            // Move y position correctly after the code block
            doc.y = codeBlockY + codeHeight + 20; // Set doc.y after code block with margin
            break;
        } // End block scope

        case 'hr': { // Added block scope
            doc.moveDown(0.7); // Space before HR
            const currentY = doc.y;
            doc.strokeColor(Colors.mediumGrey)
               .lineWidth(0.5)
               .moveTo(pageMarginLeft, currentY)
               .lineTo(pageMarginLeft + contentWidth, currentY)
               .stroke()
               .moveDown(0.7); // Space after HR
            break;
        } // End block scope

        case 'space': { // Added block scope
            doc.moveDown(0.5); // Add some vertical space
            break;
        } // End block scope

        default:
          if (token.text) {
            doc.fillColor(Colors.text)
               .font('Helvetica')
               .fontSize(12)
               .text(safeText(token.text), {
                 width: contentWidth,
                 lineGap: 4
               })
               .moveDown(0.7); // Space after generic text
          }
          break;
      }
    }

    // Finalize PDF and get total page count
    doc.end();

    // Collect buffer data
    const pdfBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        bufferStream.on('data', chunk => chunks.push(chunk));
        bufferStream.on('end', () => resolve(Buffer.concat(chunks)));
        bufferStream.on('error', reject);
    });

    // --- RE-RENDER FOOTERS WITH FINAL PAGE COUNT ---
    // This part requires PDFKit's bufferPages option.
    // It iterates through each page, clears the previous footer, and draws the final one.
    // This assumes `doc.end()` has already processed all content.
    const totalPages = doc.bufferedPageRange().count;

    for (let i = 0; i < totalPages; i++) {
        // Switch to the specific page to modify it
        doc.switchToPage(i);
        
        // Clear previous footer placeholder by drawing a white rectangle over it
        // Ensure this rectangle covers the area where the footer was drawn
        doc.fillColor(Colors.white)
           .rect(doc.page.margins.left, doc.page.height - 40, contentWidth, 30)
           .fill();
        
        // Redraw header and footer with the actual total pages
        addPageHeaderAndFooter(doc, i + 1, totalPages);
    }
    
    // Final end to ensure all modifications are written (important for bufferedPageRange updates)
    // Note: this `doc.end()` is effectively a no-op for the stream, as it's already ended,
    // but ensures PDFKit's internal state is fully finalized for the buffered pages.
    doc.end(); 

    log.info(`✅ PDF generated successfully with pdfkit`, { 
        pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
    });
    return pdfBuffer;

  } catch (error) {
    log.error('❌ Markdown to PDF conversion failed with pdfkit', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}


// --- PDF GENERATION ROUTE ---
router.post('/generate', async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    log.info(`🚀 New PDF generation request [${requestId}]`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length')
    });
  
    try {
      // Validate request body
      const { encryptedContent, clientId, emailAddress, filename, documentTitle } = req.body;
      
      log.debug(`📝 Request validation [${requestId}]`, {
        hasEncryptedContent: !!encryptedContent,
        hasClientId: !!clientId,
        hasEmailAddress: !!emailAddress,
        filename: filename || 'not provided',
        documentTitle: documentTitle || 'not provided'
      });
  
      if (!encryptedContent || !clientId || !emailAddress) {
        const missingFields = [];
        if (!encryptedContent) missingFields.push('encryptedContent');
        if (!clientId) missingFields.push('clientId');
        if (!emailAddress) missingFields.push('emailAddress');
        
        log.warn(`❌ Missing required fields [${requestId}]`, { missingFields });
        return res.status(400).json({ 
          error: 'Missing required fields', 
          missing: missingFields,
          requestId 
        });
      }
  
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        log.warn(`❌ Invalid email format [${requestId}]`, { emailAddress });
        return res.status(400).json({ 
          error: 'Invalid email format',
          requestId 
        });
      }
  
      log.info(`✅ Request validation passed [${requestId}]`);
      
      // 1. Decrypt the text
      log.info(`🔓 Step 1: Decrypting content [${requestId}]`);
      const originalText = decrypt(encryptedContent, clientId);
      
      // 2. Generate PDF directly from markdown using PDFKit
      log.info(`📄 Step 2: Generating PDF from markdown [${requestId}]`);
      let pdfBuffer;
      try {
        pdfBuffer = await markdownToPDF(originalText, documentTitle || filename || 'Generated Document');
        log.info(`✅ PDF generated successfully [${requestId}]`, { 
          pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
        });
      } catch (pdfError) {
        log.error(`❌ PDF generation failed [${requestId}]`, pdfError);
        throw new Error(`PDF generation failed: ${pdfError.message}`);
      }
      
      // 3. Send email
      log.info(`📧 Step 3: Sending email [${requestId}]`, { 
        to: emailAddress,
        filename: filename || 'document.pdf'
      });
      
      try {
        const transporter = nodemailer.createTransport(emailConfig);
        
        const mailOptions = {
          from: emailConfig.auth.user,
          to: emailAddress,
          subject: `Your PDF Document: ${filename || 'document.pdf'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #2c3e50;">📄 Your PDF is Ready!</h2>
              <p>Your document has been successfully generated and is attached to this email.</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>📁 Filename:</strong> ${filename || 'document.pdf'}</p>
                <p><strong>📅 Generated:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>📊 Size:</strong> ${(pdfBuffer.length / 1024).toFixed(2)} KB</p>
                <p><strong>🆔 Request ID:</strong> ${requestId}</p>
              </div>
              <p style="color: #7f8c8d; font-size: 12px;">Generated by PDF Service</p>
            </div>
          `,
          attachments: [{
            filename: filename || 'document.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        };
        
        const emailResult = await transporter.sendMail(mailOptions);
        log.info(`✅ Email sent successfully [${requestId}]`, { 
          messageId: emailResult.messageId,
          to: emailAddress
        });
        
      } catch (emailError) {
        log.error(`❌ Email sending failed [${requestId}]`, emailError);
        throw new Error(`Email sending failed: ${emailError.message}`);
      }
      
      const duration = Date.now() - startTime;
      log.info(`🎉 Request completed successfully [${requestId}]`, { 
        duration: `${duration}ms`,
        to: emailAddress,
        filename: filename || 'document.pdf'
      });
      
      res.json({ 
        success: true, 
        message: 'PDF generated and sent successfully!',
        requestId,
        duration,
        details: {
          emailAddress,
          filename: filename || 'document.pdf',
          pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
          processingTime: `${duration}ms`
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
      } else if (error.message.includes('Invalid email format')) {
        statusCode = 400;
        errorType = 'VALIDATION_ERROR';
      }
       else if (error.message.includes('Email sending failed')) {
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
        timestamp: new Date().toISOString()
      });
    }
});
  
// --- Health check for PDF service ---
router.get('/health', (req, res) => {
  log.info('🏥 PDF service health check requested');
  res.json({
    status: 'OK',
    service: 'PDF Generation Service (PDFKit)', // Updated service name
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;