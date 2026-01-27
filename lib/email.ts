import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, code: string) {
  try {
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    console.log('🔍 Checking Gmail credentials...');
    console.log('GMAIL_USER:', GMAIL_USER ? '✅ Set' : '❌ Not set');
    console.log('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set');

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Fix for self-signed certificate error
      },
    });

    // Email HTML template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Email Verification</h2>
        <p style="color: #666; font-size: 16px;">Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #333; letter-spacing: 8px; margin: 0; font-size: 36px;">
            ${code}
          </h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in <strong>5 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `;

    // Send email
    console.log(`📤 Attempting to send email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"BudgetAI" <${GMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: htmlContent,
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error: any) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
}