// routes/pdfRoutes.js
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
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
    
    // 2. Convert markdown to HTML
    log.info(`📝 Step 2: Converting markdown to HTML [${requestId}]`);
    let html;
    try {
      html = marked(originalText);
      log.debug(`✅ Markdown conversion successful [${requestId}]`, { 
        htmlLength: html.length 
      });
    } catch (markdownError) {
      log.error(`❌ Markdown conversion failed [${requestId}]`, markdownError);
      throw new Error(`Markdown conversion failed: ${markdownError.message}`);
    }
    
    // 3. Make it look nice for PDF
    log.info(`🎨 Step 3: Styling HTML for PDF [${requestId}]`);
    const styledHtml = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              line-height: 1.6;
              color: #333;
            }
            h1 { 
              color: #2c3e50; 
              border-bottom: 3px solid #3498db; 
              padding-bottom: 10px;
            }
            h2 { 
              color: #34495e; 
              border-bottom: 1px solid #ecf0f1;
              padding-bottom: 5px;
            }
            h3 { color: #7f8c8d; }
            code { 
              background: #f8f9fa; 
              padding: 2px 6px; 
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
            pre { 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 5px;
              border-left: 4px solid #3498db;
              overflow-x: auto;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            blockquote {
              border-left: 4px solid #3498db;
              padding-left: 20px;
              margin: 20px 0;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 0 5px 5px 0;
            }
            ul, ol {
              padding-left: 30px;
            }
            li {
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;
    
    log.debug(`✅ HTML styling complete [${requestId}]`, { 
      styledHtmlLength: styledHtml.length 
    });
    
    // 4. Generate PDF
    log.info(`📄 Step 4: Generating PDF [${requestId}]`);
    let browser;
    let pdfBuffer;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      log.debug(`✅ Browser launched [${requestId}]`);
      
      const page = await browser.newPage();
      log.debug(`✅ New page created [${requestId}]`);
      
      await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
      log.debug(`✅ Content loaded in page [${requestId}]`);
      
      pdfBuffer = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });
      
      log.info(`✅ PDF generated successfully [${requestId}]`, { 
        pdfSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB` 
      });
      
    } catch (pdfError) {
      log.error(`❌ PDF generation failed [${requestId}]`, pdfError);
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    } finally {
      if (browser) {
        await browser.close();
        log.debug(`🔒 Browser closed [${requestId}]`);
      }
    }
    
    // 5. Send email
    log.info(`📧 Step 5: Sending email [${requestId}]`, { 
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
    } else if (error.message.includes('Markdown conversion failed')) {
      statusCode = 400;
      errorType = 'MARKDOWN_ERROR';
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
    service: 'PDF Generation Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;