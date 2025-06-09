// routes/pdfRoutes.js
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { marked } = require('marked');

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

// --- HELPER: Wrap text manually for pdf-lib ---
function wrapText(text, font, fontSize, maxWidth) {
    if (!text) return [''];
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let testLine;
        if (currentLine === '') {
            testLine = word;
        } else {
            testLine = currentLine + ' ' + word;
        }
        
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            // If even a single word is too long for a line, break it
            if (currentLine === '') {
                // Try to break the long word
                let splitWord = '';
                for (let j = 0; j < word.length; j++) {
                    const char = word[j];
                    if (font.widthOfTextAtSize(splitWord + char, fontSize) <= maxWidth) {
                        splitWord += char;
                    } else {
                        lines.push(splitWord);
                        splitWord = char;
                    }
                }
                if (splitWord) lines.push(splitWord);
                currentLine = ''; // Reset current line
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
    }
    if (currentLine !== '') {
        lines.push(currentLine);
    }
    return lines;
}

// --- MARKDOWN TO PDF CONVERTER USING PDF-LIB (Enhanced) ---
async function markdownToPDF(markdownText, documentTitle = 'Generated Document') {
  log.debug('📝 Starting markdown to PDF conversion with pdf-lib');
  
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();

  // Load fonts - using StandardFonts for broad compatibility and quick setup
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const codeFont = await pdfDoc.embedFont(StandardFonts.Courier);

  // Define global PDF dimensions and margins
  const { width, height } = page.getSize();
  const marginX = 50; // Left/Right margin
  const marginY_Top = 70; // Increased top margin for header
  const marginY_Bottom = 50; // Bottom margin
  let cursorY = height - marginY_Top; // Starting Y position (from top)
  const contentWidth = width - (2 * marginX);

  // Define a consistent color palette
  const Colors = {
    primary: rgb(44 / 255, 62 / 255, 80 / 255),  // Dark Blue/Grey for headings & main elements
    accent: rgb(52 / 255, 152 / 255, 219 / 255), // Bright Blue for accents (lines, blockquote border)
    text: rgb(51 / 255, 51 / 255, 51 / 255),     // Dark text color for body
    lightGrey: rgb(236 / 255, 240 / 255, 241 / 255), // Very Light Grey for backgrounds (blockquote, code)
    mediumGrey: rgb(127 / 255, 140 / 255, 141 / 255), // Medium Grey for secondary text (footer) and borders
    white: rgb(1, 1, 1),
    offWhite: rgb(254 / 255, 254 / 255, 254 / 255), // For alternating row backgrounds
  };

  // Helper function to add header and footer (adapted for pdf-lib)
  const addPageHeaderAndFooter = (pageInstance, pageNumber, totalPages) => {
    const { width, height } = pageInstance.getSize();

    // Header
    pageInstance.drawText(documentTitle, {
      x: marginX,
      y: height - 40, // Consistent top position
      font: boldFont,
      size: 10,
      color: Colors.primary,
    });
    pageInstance.drawText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
        x: width - marginX,
        y: height - 40,
        font: font,
        size: 8,
        color: Colors.mediumGrey,
        width: 100,
        align: 'right',
        x: width - marginX - 100 // Adjust x for right alignment
    });
    // Header line
    pageInstance.drawLine({
      start: { x: marginX, y: height - 55 },
      end: { x: width - marginX, y: height - 55 },
      thickness: 1,
      color: Colors.accent,
    });

    // Footer
    pageInstance.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: marginX,
      y: marginY_Bottom - 20, // Position relative to bottom margin
      font: font,
      size: 8,
      color: Colors.mediumGrey,
      width: contentWidth,
      align: 'center',
    });
  };

  // Helper function to add content with text wrapping
  const addTextContent = (text, fontInstance, size, color, options = {}) => {
    const defaultLineHeight = size * 1.5; // Good for readability
    const effectiveLineHeight = options.lineHeight || defaultLineHeight;
    const effectiveIndent = options.indent || 0;
    const effectiveMaxWidth = contentWidth - effectiveIndent;

    const lines = wrapText(text, fontInstance, size, effectiveMaxWidth);
    let totalHeightUsed = 0;

    for (const line of lines) {
        // Check for page break BEFORE drawing the line
        if (cursorY - effectiveLineHeight < marginY_Bottom) {
            page = pdfDoc.addPage();
            cursorY = height - marginY_Top; // Reset cursor for new page
        }
        page.drawText(line, {
            x: marginX + effectiveIndent,
            y: cursorY - (effectiveLineHeight * 0.7), // Align text to the top of the line box
            font: fontInstance,
            size: size,
            color: color,
            lineHeight: effectiveLineHeight,
            maxWidth: effectiveMaxWidth
        });
        cursorY -= effectiveLineHeight; // Move cursor down
        totalHeightUsed += effectiveLineHeight;
    }
    return totalHeightUsed; // Total height used by text block
  };

  try {
    const cleanedText = extractMarkdownContent(markdownText);
    const tokens = marked.lexer(cleanedText);

    for (const token of tokens) {
      let elementHeightEstimate = 0; // Estimate height needed for the current element

      switch (token.type) {
        case 'heading':
          let headingSize;
          let headingFont;
          let spacingAfterHeading;
          switch (token.depth) {
            case 1: headingSize = 24; headingFont = boldFont; spacingAfterHeading = 30; break;
            case 2: headingSize = 20; headingFont = boldFont; spacingAfterHeading = 25; break;
            case 3: headingSize = 16; headingFont = boldFont; spacingAfterHeading = 20; break;
            default: headingSize = 14; headingFont = boldFont; spacingAfterHeading = 15; break;
          }
          elementHeightEstimate = headingSize + spacingAfterHeading; // Text height + spacing

          // Check if heading fits, if not, new page
          if (cursorY - elementHeightEstimate < marginY_Bottom) {
            page = pdfDoc.addPage();
            cursorY = height - marginY_Top;
          }

          page.drawText(safeText(token.text), {
            x: marginX,
            y: cursorY - headingSize, // Position based on bottom of text
            font: headingFont,
            size: headingSize,
            color: Colors.primary,
          });
          cursorY -= (headingSize * 1.2); // Initial drop after text itself
          
          if (token.depth <= 2) {
            page.drawLine({
                start: { x: marginX, y: cursorY + 5 },
                end: { x: marginX + contentWidth * 0.7, y: cursorY + 5 }, // Line across 70% of content width
                thickness: (token.depth === 1 ? 2 : 1),
                color: Colors.accent,
            });
            cursorY -= 10; // Space after line
          }
          cursorY -= (spacingAfterHeading - (headingSize * 0.2)); // Additional spacing
          break;

        case 'paragraph':
          const paragraphText = safeText(token.text);
          const paragraphLines = wrapText(paragraphText, font, 12, contentWidth);
          elementHeightEstimate = paragraphLines.length * (12 * 1.5) + 15; // Est. height + margin

          if (cursorY - elementHeightEstimate < marginY_Bottom) {
              page = pdfDoc.addPage();
              cursorY = height - marginY_Top;
          }
          addTextContent(paragraphText, font, 12, Colors.text);
          cursorY -= 15; // Space after paragraph
          break;

        case 'list':
          const listIndent = 20;
          const listItemSize = 12;
          const listItemLineHeight = listItemSize * 1.5;
          let estimatedListHeight = 0;
          token.items.forEach(item => {
              estimatedListHeight += wrapText(safeText(item.text), font, listItemSize, contentWidth - listIndent).length * listItemLineHeight;
          });
          estimatedListHeight += 15; // Margin after list

          if (cursorY - estimatedListHeight < marginY_Bottom) {
            page = pdfDoc.addPage();
            cursorY = height - marginY_Top;
          }

          for (let i = 0; i < token.items.length; i++) {
            const item = token.items[i];
            const bullet = token.ordered ? `${i + 1}. ` : '• ';
            const itemText = bullet + safeText(item.text);
            addTextContent(itemText, font, listItemSize, Colors.text, { indent: listIndent });
          }
          cursorY -= 15; // Space after list
          break;

        case 'table':
          if (token.header && token.rows) {
              const numColumns = token.header.length;
              // Simple dynamic col width: distribute evenly across content width
              const colWidth = contentWidth / numColumns; 
              const headerRowHeight = 25; 
              const dataRowHeight = 20; 
              const cellPadding = 5;

              // Estimate total height needed for table
              const estimatedTableHeight = headerRowHeight + (token.rows.length * dataRowHeight) + 20; // + some buffer
              if (cursorY - estimatedTableHeight < marginY_Bottom) {
                  page = pdfDoc.addPage();
                  cursorY = height - marginY_Top;
              }
              
              let currentTableY = cursorY;

              // Draw Header
              for (let i = 0; i < token.header.length; i++) {
                  const headerText = safeText(token.header[i]);
                  const headerX = marginX + (i * colWidth);
                  page.drawRectangle({
                      x: headerX,
                      y: currentTableY - headerRowHeight,
                      width: colWidth,
                      height: headerRowHeight,
                      color: Colors.lightGrey,
                      borderColor: Colors.mediumGrey,
                      borderWidth: 0.5,
                  });
                  // Header text centered
                  page.drawText(headerText, {
                      x: headerX + cellPadding,
                      y: currentTableY - headerRowHeight + cellPadding,
                      font: boldFont,
                      size: 10,
                      color: Colors.primary,
                      maxWidth: colWidth - (2 * cellPadding),
                      align: 'center'
                  });
              }
              currentTableY -= headerRowHeight;

              // Draw Rows
              for (let rowIndex = 0; rowIndex < token.rows.length; rowIndex++) {
                  const row = token.rows[rowIndex];
                  const rowFillColor = rowIndex % 2 === 0 ? Colors.white : Colors.offWhite; 

                  for (let colIndex = 0; colIndex < row.length; colIndex++) {
                      const cellText = safeText(row[colIndex]);
                      const cellX = marginX + (colIndex * colWidth);
                      
                      page.drawRectangle({
                          x: cellX,
                          y: currentTableY - dataRowHeight,
                          width: colWidth,
                          height: dataRowHeight,
                          color: rowFillColor,
                          borderColor: Colors.mediumGrey,
                          borderWidth: 0.5,
                      });
                      page.drawText(cellText, {
                          x: cellX + cellPadding,
                          y: currentTableY - dataRowHeight + cellPadding,
                          font: font,
                          size: 10,
                          color: Colors.text,
                          maxWidth: colWidth - (2 * cellPadding),
                          align: 'left' // Usually left-align data in cells
                      });
                  }
                  currentTableY -= dataRowHeight;
              }
              cursorY = currentTableY - 20; // Move cursor below table with some margin
          }
          break;

        case 'blockquote':
            const quoteText = safeText(token.text);
            const quoteLines = wrapText(quoteText, italicFont, 12, contentWidth - 30); // 30 for indent + left line
            const quoteLineHeight = 12 * 1.5;
            const quotePadding = 15;
            const quoteBlockHeight = quoteLines.length * quoteLineHeight + (2 * quotePadding);
            const quoteLeftLineThickness = 5;

            if (cursorY - quoteBlockHeight < marginY_Bottom) {
                page = pdfDoc.addPage();
                cursorY = height - marginY_Top;
            }

            const quoteRectY = cursorY - quoteBlockHeight;
            // Draw background rectangle
            page.drawRectangle({
                x: marginX,
                y: quoteRectY,
                width: contentWidth,
                height: quoteBlockHeight,
                color: Colors.lightGrey,
            });
            // Draw accent left line
            page.drawRectangle({
                x: marginX,
                y: quoteRectY,
                width: quoteLeftLineThickness,
                height: quoteBlockHeight,
                color: Colors.accent,
            });

            let currentQuoteTextY = cursorY - quotePadding - quoteLineHeight; // Start text below top padding
            for (const line of quoteLines) {
                page.drawText(line, {
                    x: marginX + quoteLeftLineThickness + quotePadding, // Indent text from left line
                    y: currentQuoteTextY,
                    font: italicFont,
                    size: 12,
                    color: Colors.text,
                    maxWidth: contentWidth - quoteLeftLineThickness - (2 * quotePadding)
                });
                currentQuoteTextY -= quoteLineHeight;
            }
            cursorY = quoteRectY - 20; // Move cursor below the blockquote with margin
            break;

        case 'code':
            const codeContent = safeText(token.text);
            const codeLines = codeContent.split('\n'); // Code blocks often have literal newlines
            const codeFontSize = 10;
            const codeLineHeight = codeFontSize * 1.5;
            const codePadding = 10;
            const codeBlockHeight = codeLines.length * codeLineHeight + (2 * codePadding);

            if (cursorY - codeBlockHeight < marginY_Bottom) {
                page = pdfDoc.addPage();
                cursorY = height - marginY_Top;
            }

            const codeRectY = cursorY - codeBlockHeight;
            page.drawRectangle({
                x: marginX,
                y: codeRectY,
                width: contentWidth,
                height: codeBlockHeight,
                color: Colors.codeBg,
                borderColor: Colors.codeBorder,
                borderWidth: 0.5,
            });

            let currentCodeY = cursorY - codePadding - codeLineHeight; // Start text with top padding
            for (const line of codeLines) {
                page.drawText(line, {
                    x: marginX + codePadding, // Indent code
                    y: currentCodeY,
                    font: codeFont,
                    size: codeFontSize,
                    color: Colors.text
                });
                currentCodeY -= codeLineHeight;
            }
            cursorY = codeRectY - 20; // Move cursor below code block with margin
            break;

        case 'hr':
            if (cursorY - 30 < marginY_Bottom) { // Ensure space for HR and surrounding margin
                page = pdfDoc.addPage();
                cursorY = height - marginY_Top;
            }
            page.drawLine({
                start: { x: marginX, y: cursorY - 15 },
                end: { x: width - marginX, y: cursorY - 15 },
                thickness: 0.5,
                color: Colors.mediumGrey,
            });
            cursorY -= 30; // Space before and after HR
            break;

        case 'space':
            cursorY -= 10; // Small vertical space
            break;

        default:
          if (token.text) {
            addTextContent(safeText(token.text), font, 12, Colors.text);
            cursorY -= 15; // Space after generic text block
          }
          break;
      }
    }

    // Add headers and footers to all pages after content is rendered
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        addPageHeaderAndFooter(pages[i], i + 1, pages.length);
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    log.info(`✅ PDF generated successfully with pdf-lib`, { 
        pdfSize: `${(pdfBytes.length / 1024).toFixed(2)} KB` 
    });
    return Buffer.from(pdfBytes);

  } catch (error) {
    log.error('❌ Markdown to PDF conversion failed with pdf-lib', error);
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
      
      // 2. Generate PDF directly from markdown using PDF-LIB
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
    service: 'PDF Generation Service (PDF-LIB)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;