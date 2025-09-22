import { Logger, LogContext } from '@/lib/logging/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Mailgun API
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    await Logger.warning(LogContext.SYSTEM, 'Mailgun not configured, skipping email', { to, subject });
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('from', process.env.MAILGUN_FROM_EMAIL || `FlashLearn AI <noreply@${process.env.MAILGUN_DOMAIN}>`);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);
    if (text) {
      formData.append('text', text);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
    }

    await Logger.info(LogContext.SYSTEM, 'Email sent successfully', { to, subject });
    return true;
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to send email', {
      to,
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send flashcard generation completion email
 */
export async function sendGenerationCompleteEmail(
  userEmail: string,
  userName: string,
  fileName: string,
  flashcardCount: number,
  jobId: string
): Promise<boolean> {
  const subject = 'Your flashcards are ready! 🎉';
  const viewUrl = `${process.env.NEXTAUTH_URL}/dashboard?job=${jobId}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        FlashLearn AI
      </h1>
      
      <h2 style="color: #059669;">Your flashcards are ready! 🎉</h2>
      
      <p>Hi ${userName},</p>
      
      <p>Great news! We've finished processing your file and generated <strong>${flashcardCount} flashcards</strong> from:</p>
      
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>${fileName}</strong>
      </div>
      
      <p>Your flashcards are ready to study. Click the button below to view them:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewUrl}" 
           style="background: #3b82f6; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 8px; display: inline-block;
                  font-weight: bold;">
          View My Flashcards
        </a>
      </div>
      
      <p>Happy studying!</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p style="color: #6b7280; font-size: 14px;">
        This email was sent because you requested flashcard generation on FlashLearn AI.
        <br>
        <a href="${process.env.NEXTAUTH_URL}" style="color: #3b82f6;">Visit FlashLearn AI</a>
      </p>
    </div>
  `;

  const text = `
    Hi ${userName},

    Your flashcards are ready! We've generated ${flashcardCount} flashcards from "${fileName}".

    View your flashcards: ${viewUrl}

    Happy studying!
    - FlashLearn AI Team
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    text,
  });
}

/**
 * Send flashcard generation failed email
 */
export async function sendGenerationFailedEmail(
  userEmail: string,
  userName: string,
  fileName: string,
  error: string
): Promise<boolean> {
  const subject = 'Flashcard generation failed';
  const supportUrl = `${process.env.NEXTAUTH_URL}/support`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        FlashLearn AI
      </h1>
      
      <h2 style="color: #dc2626;">Generation Failed ❌</h2>
      
      <p>Hi ${userName},</p>
      
      <p>We encountered an issue while processing your file:</p>
      
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>${fileName}</strong>
      </div>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Error:</strong> ${error}
      </div>
      
      <p>Here are a few things you can try:</p>
      <ul>
        <li>Make sure your file isn't corrupted</li>
        <li>Check that the file size is within our limits</li>
        <li>Try uploading the file again</li>
      </ul>
      
      <p>If the problem persists, please contact our support team:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${supportUrl}" 
           style="background: #dc2626; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 8px; display: inline-block;
                  font-weight: bold;">
          Contact Support
        </a>
      </div>
      
      <p>We apologize for the inconvenience!</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p style="color: #6b7280; font-size: 14px;">
        <a href="${process.env.NEXTAUTH_URL}" style="color: #3b82f6;">Visit FlashLearn AI</a>
      </p>
    </div>
  `;

  const text = `
    Hi ${userName},

    We encountered an issue while processing "${fileName}".

    Error: ${error}

    Please try uploading the file again, or contact support if the problem persists.

    Contact Support: ${supportUrl}

    - FlashLearn AI Team
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    text,
  });
}