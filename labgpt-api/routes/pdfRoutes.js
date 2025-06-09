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
    const expectedTag = crypto.createHmac('sha256', hmacInput).digest();
    
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
  const contentWidth = doc.page.width - pageMarginLeft - pageMarginRight;
  const footerY = doc.page.height - 30; // Y position for footer text

  // --- Header and Footer Drawing Function (called manually) ---
  // This function draws the header and a placeholder footer 'Page X of X'.
  // It's called whenever a new page is explicitly added.
  const drawPageDecorations = (docInstance, pageNumber) => {
    const pageWidth = docInstance.page.width;

    // Header
    docInstance.fillColor(Colors.primary)
               .font('Helvetica-Bold')
               .fontSize(10)
               .text(documentTitle, pageMarginLeft, 40, { align: 'left' });

    docInstance.fillColor(Colors.mediumGrey)
               .font('Helvetica')
               .fontSize(8)
               .text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 
                     pageWidth - pageMarginRight - 100, 40, { width: 100, align: 'right' });

    // Header line
    docInstance.strokeColor(Colors.accent)
               .lineWidth(1)
               .moveTo(pageMarginLeft, 55)
               .lineTo(pageWidth - pageMarginRight, 55)
               .stroke();

    // Footer - Placeholder "Page X of X"
    docInstance.fillColor(Colors.mediumGrey)
               .font('Helvetica')
               .fontSize(8)
               .text(`Page ${pageNumber} of X`, // 'X' is the placeholder
                     pageMarginLeft, footerY, { width: contentWidth, align: 'center' });
  };
  
  // --- IMPORTANT: NO doc.on('pageAdded', ...) listener anymore ---

  try {
    const cleanedText = extractMarkdownContent(markdownText);
    const tokens = marked.lexer(cleanedText);

    // Manually add the first page and its decorations
    doc.addPage(); 
    drawPageDecorations(doc, 1);
    doc.y = 70; // Set initial Y position for content after header

    for (const token of tokens) {
      // Calculate approximate height of the next element to check for page overflow
      let elementHeight = 0;
      doc.font('Helvetica').fontSize(12); // Default font for height calculations

      switch (token.type) {
        case 'heading':
          elementHeight = doc.heightOfString(safeText(token.text), { width: contentWidth }) + 30; // Estimate
          break;
        case 'paragraph':
          elementHeight = doc.heightOfString(safeText(token.text), { width: contentWidth, lineGap: 4 }) + 20;
          break;
        case 'list':
          elementHeight = token.items.length * (doc.heightOfString('Example item', { width: contentWidth - 20 }) + 5) + 30; // Estimate
          break;
        case 'table':
          elementHeight = (token.header.length > 0 ? 25 : 0) + (token.rows.length * 20) + 30; // Estimate
          break;
        case 'blockquote':
          elementHeight = doc.heightOfString(safeText(token.text), { width: contentWidth - 40, lineGap: 4 }) + 50; // Estimate
          break;
        case 'code':
          elementHeight = doc.heightOfString(safeText(token.text), { width: contentWidth - 20, lineGap: 2 }) + 40; // Estimate
          break;
        case 'hr':
          elementHeight = 30;
          break;
        case 'space':
          elementHeight = 10;
          break;
        default:
          if (token.text) {
              elementHeight = doc.heightOfString(safeText(token.text), { width: contentWidth, lineGap: 4 }) + 20;
          }
          break;
      }
      
      // Check if current element will overflow the page
      // doc.page.height - doc.page.margins.bottom is the safe bottom margin.
      // -5 is a small buffer to prevent cutting off precisely at the margin
      if (doc.y + elementHeight > (doc.page.height - doc.page.margins.bottom - 5)) {
          doc.addPage();
          drawPageDecorations(doc, doc.page.count);
          doc.y = doc.page.margins.top; // Reset Y position for content on new page
      }

      // Now draw the element
      switch (token.type) {
        case 'heading': { 
          let headingSize;
          let spacingAfterHeading;
          switch (token.depth) {
            case 1: headingSize = 24; spacingAfterHeading = 0.5; break; 
            case 2: headingSize = 20; spacingAfterHeading = 0.4; break;
            case 3: headingSize = 16; spacingAfterHeading = 0.3; break;
            default: headingSize = 14; spacingAfterHeading = 0.2; break;
          }

          doc.fillColor(Colors.primary)
             .font('Helvetica-Bold')
             .fontSize(headingSize)
             .text(safeText(token.text), {
               width: contentWidth,
               continued: false 
             })
             .moveDown(0.2); 

          if (token.depth <= 2) {
            const currentY = doc.y; 
            doc.strokeColor(Colors.accent)
               .lineWidth(token.depth === 1 ? 2 : 1)
               .moveTo(doc.x, currentY)
               .lineTo(doc.x + contentWidth * 0.7, currentY)
               .stroke()
               .moveDown(0.2); 
          }
          doc.moveDown(spacingAfterHeading); 
          break;
        } 

        case 'paragraph': { 
          doc.fillColor(Colors.text)
             .font('Helvetica')
             .fontSize(12)
             .text(safeText(token.text), {
               width: contentWidth,
               lineGap: 4 
             })
             .moveDown(0.7); 
          break;
        } 

        case 'list': { 
          const listIndent = 20;
          doc.fillColor(Colors.text)
             .font('Helvetica')
             .fontSize(12)
             .moveDown(0.5); 

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
            .moveDown(0.2); 
          }
          doc.moveDown(0.7); 
          break;
        } 

        case 'table': { 
          if (token.header && token.rows) {
              const numColumns = token.header.length;
              const colWidth = contentWidth / numColumns;
              const headerRowHeight = 25; 
              const dataRowHeight = 20; 
              const cellPadding = 5;

              doc.moveDown(0.5); 

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
                         valign: 'center' 
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
              doc.y = currentTableY + 20; 
          }
          break;
        } 

        case 'blockquote': { 
            const quoteText = safeText(token.text);
            const quoteLineThickness = 5;
            const quotePadding = 15;
            const quoteContentWidth = contentWidth - quoteLineThickness - (2 * quotePadding);

            doc.moveDown(0.5); 

            // Calculate height of the blockquote content
            doc.font('Helvetica-Oblique').fontSize(12);
            const quoteHeight = doc.heightOfString(quoteText, {
                width: quoteContentWidth,
                lineGap: 4
            }) + (2 * quotePadding); 

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
            
            doc.y = blockquoteY + quoteHeight + 20; 
            break;
        } 

        case 'code': { 
            const codeContent = safeText(token.text);
            const codePadding = 10;
            const codeContentWidth = contentWidth - (2 * codePadding);

            doc.moveDown(0.5); 

            // Calculate height of the code block content
            doc.font('Courier').fontSize(10);
            const codeHeight = doc.heightOfString(codeContent, {
                width: codeContentWidth,
                lineGap: 2
            }) + (2 * codePadding); 

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

            doc.y = codeBlockY + codeHeight + 20; 
            break;
        } 

        case 'hr': { 
            doc.moveDown(0.7); 
            const currentY = doc.y;
            doc.strokeColor(Colors.mediumGrey)
               .lineWidth(0.5)
               .moveTo(pageMarginLeft, currentY)
               .lineTo(pageMarginLeft + contentWidth, currentY)
               .stroke()
               .moveDown(0.7); 
            break;
        } 

        case 'space': { 
            doc.moveDown(0.5); 
            break;
        } 

        default:
          if (token.text) {
            doc.fillColor(Colors.text)
               .font('Helvetica')
               .fontSize(12)
               .text(safeText(token.text), {
                 width: contentWidth,
                 lineGap: 4
               })
               .moveDown(0.7); 
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

    // --- SECOND PASS: OVERLAY TOTAL PAGE COUNT ---
    const totalPages = doc.bufferedPageRange().count;

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i); 

        // Calculate the position of "of X" in "Page [current] of X" to clear and replace
        const currentPlaceholderText = `Page ${i + 1} of X`;
        const initialTextWidth = doc.widthOfString(currentPlaceholderText, { align: 'center' });
        const initialStartX = pageMarginLeft + (contentWidth - initialTextWidth) / 2;
        
        const stringBeforeX = `Page ${i + 1} of `;
        const stringBeforeXWidth = doc.widthOfString(stringBeforeX);
        
        const placeholderX = initialStartX + stringBeforeXWidth; 

        // Clear the old "X" placeholder.
        doc.fillColor(Colors.white)
           .rect(placeholderX, footerY, 10, 10) 
           .fill();
        
        // Draw the actual totalPages number.
        doc.fillColor(Colors.mediumGrey)
           .font('Helvetica')
           .fontSize(8)
           .text(totalPages.toString(), placeholderX, footerY, { continued: false }); 
    }
    
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
    service: 'PDF Generation Service (PDFKit)', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;