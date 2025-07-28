import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Create a testing account for development
  // In production, you would use real SMTP credentials
  const testAccount = await nodemailer.createTestAccount();
  console.log('Created test email account:', testAccount.user);
  
  // Create a transporter object
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: process.env.EMAIL_SERVER_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SERVER_USER || testAccount.user,
      pass: process.env.EMAIL_SERVER_PASSWORD || testAccount.pass,
    },
  });

  try {
    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"FlashLearn AI" <noreply@flashlearn.ai>',
      to,
      subject,
      html,
    });

    console.log('Email sent successfully to', to);
    console.log('Message ID:', info.messageId);
    
    // Log preview URL for development (using Ethereal)
    if (!process.env.EMAIL_SERVER_HOST) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}