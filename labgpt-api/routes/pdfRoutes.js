// routes/pdfRoutes.js
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { marked } = require('marked');

const router = express.Router();

// LOGGING SETUP
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

// EMAIL SETUP
const emailConfig = {
  host: 'mail.docspace.co.ke',
  port: 465,
  secure: true,
  auth: {
    user: 'mailtest@docspace.co.ke',
    pass: '~iizVde!Ua^SP;MD'
  }
};

// DECRYPT FUNCTION
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

// MARKDOWN TO PDF CONVERTER USING PDFKIT
function markdownToPDF(markdownText) {
  return new Promise((resolve, reject) => {
    try {
      log.debug('📝 Starting markdown to PDF conversion');
      
      // Parse markdown to get structured data
      const tokens = marked.lexer(markdownText);
      log.debug('🔍 Parsed markdown tokens', { tokenCount: tokens.length });
      
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      // Collect PDF data
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        log.debug('✅ PDF generation completed', { 
          pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
        });
        resolve(pdfBuffer);
      });
      
      doc.on('error', (error) => {
        log.error('❌ PDF generation error', error);
        reject(error);
      });
      
      // Process each token
      let isFirstPage = true;
      
      tokens.forEach((token, index) => {
        try {
          switch (token.type) {
            case 'heading':
              if (!isFirstPage && token.depth === 1) {
                doc.addPage();
              }
              
              const fontSize = token.depth === 1 ? 24 : 
                             token.depth === 2 ? 20 : 
                             token.depth === 3 ? 16 : 14;
              
              doc.fontSize(fontSize)
                 .font('Helvetica-Bold')
                 .fillColor('#2c3e50')
                 .text(token.text, { align: 'left' })
                 .moveDown(0.5);
              
              if (token.depth <= 2) {
                doc.strokeColor('#3498db')
                   .lineWidth(token.depth === 1 ? 2 : 1)
                   .moveTo(doc.x, doc.y)
                   .lineTo(doc.x + 400, doc.y)
                   .stroke()
                   .moveDown(0.5);
              }
              break;
              
            case 'paragraph':
              doc.fontSize(12)
                 .font('Helvetica')
                 .fillColor('#333333')
                 .text(token.text, { 
                   align: 'justify',
                   lineGap: 2
                 })
                 .moveDown(0.8);
              break;
              
            case 'list':
              token.items.forEach((item, itemIndex) => {
                const bullet = token.ordered ? `${itemIndex + 1}. ` : '• ';
                doc.fontSize(12)
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(bullet + item.text, { 
                     indent: 20,
                     align: 'left'
                   });
              });
              doc.moveDown(0.8);
              break;
              
            case 'blockquote':
              doc.rect(doc.x, doc.y, 4, 20)
                 .fillColor('#3498db')
                 .fill();
              
              doc.fontSize(12)
                 .font('Helvetica-Oblique')
                 .fillColor('#555555')
                 .text(token.text, { 
                   indent: 20,
                   align: 'left'
                 })
                 .moveDown(0.8);
              break;
              
            case 'code':
              doc.rect(doc.x - 10, doc.y - 5, 420, 20)
                 .fillColor('#f8f9fa')
                 .fill();
              
              doc.fontSize(10)
                 .font('Courier')
                 .fillColor('#333333')
                 .text(token.text, { 
                   align: 'left'
                 })
                 .moveDown(0.8);
              break;
              
            case 'hr':
              doc.strokeColor('#cccccc')
                 .lineWidth(1)
                 .moveTo(doc.x, doc.y)
                 .lineTo(doc.x + 400, doc.y)
                 .stroke()
                 .moveDown(1);
              break;
              
            case 'space':
              doc.moveDown(0.5);
              break;
              
            default:
              // Handle any other token types as plain text
              if (token.text) {
                doc.fontSize(12)
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(token.text)
                   .moveDown(0.5);
              }
              break;
          }
          
          isFirstPage = false;
          
        } catch (tokenError) {
          log.error(`❌ Error processing token ${index}`, tokenError);
          // Continue processing other tokens
        }
      });
      
      // Add footer to all pages
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor('#999999')
           .text(`Page ${i + 1} of ${pageCount}`, 
                 50, 
                 doc.page.height - 30, 
                 { align: 'center' });
      }
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      log.error('❌ Markdown to PDF conversion failed', error);
      reject(error);
    }
  });
}

// PDF GENERATION ROUTE
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
    const { encryptedContent, clientId, emailAddress, filename } = req.body;
    
    log.debug(`📝 Request validation [${requestId}]`, {
      hasEncryptedContent: !!encryptedContent,
      hasClientId: !!clientId,
      hasEmailAddress: !!emailAddress,
      filename: filename || 'not provided'
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
      pdfBuffer = await markdownToPDF(originalText);
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
      const transporter = nodemailer.createTransporter(emailConfig);
      
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
    
    // Determine error type and appropriate response
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
      timestamp: new Date().toISOString()
    });
  }
});

// Health check for PDF service
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