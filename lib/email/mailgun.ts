import formData from 'form-data';
import Mailgun from 'mailgun.js';

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string || '',
});

// Email verification template
const createVerificationEmailContent = (userName: string, verificationUrl: string) => {
  return {
    subject: 'Verify your FlashLearn AI account',
    text: `Hello ${userName},\n\nPlease verify your email address by clicking on the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.\n\nThanks,\nThe FlashLearn AI Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to FlashLearn AI!</h2>
        <p>Hello ${userName},</p>
        <p>Please verify your email address by clicking on the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4A7BF7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${verificationUrl}
        </p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Thanks,<br>The FlashLearn AI Team</p>
      </div>
    `,
  };
};

// Function to send verification email
export async function sendVerificationEmail(
  email: string, 
  userName: string, 
  verificationToken: string
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
  
  try {
    const { subject, text, html } = createVerificationEmailContent(userName, verificationUrl);
    
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
      from: process.env.EMAIL_FROM as string,
      to: email,
      subject,
      text,
      html,
    });
    
    console.log('Verification email sent:', response);
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
}

// Function to send welcome email after verification
export async function sendWelcomeEmail(email: string, userName: string) {
  try {
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
      from: process.env.EMAIL_FROM as string,
      to: email,
      subject: 'Welcome to FlashLearn AI!',
      text: `Hello ${userName},\n\nThank you for verifying your email address. Your FlashLearn AI account is now active.\n\nYou can now create flashcards and start learning.\n\nThanks,\nThe FlashLearn AI Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to FlashLearn AI!</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for verifying your email address. Your FlashLearn AI account is now active.</p>
          <p>You can now create flashcards and start learning.</p>
          <p>Thanks,<br>The FlashLearn AI Team</p>
        </div>
      `,
    });
    
    console.log('Welcome email sent:', response);
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
}