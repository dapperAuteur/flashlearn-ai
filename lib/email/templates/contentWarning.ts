export function getContentWarningTemplate(
  userName: string,
  setTitle: string,
  reason: string
): { subject: string; html: string } {
  const reasonLabels: Record<string, string> = {
    inappropriate: 'Inappropriate content',
    offensive: 'Offensive or hateful content',
    spam: 'Spam or misleading content',
    copyright: 'Copyright violation',
    other: 'Community guidelines violation',
  };

  const reasonText = reasonLabels[reason] || reason;

  return {
    subject: 'Content Warning - Your FlashLearn AI set has been flagged',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Content Warning - FlashLearn AI</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
        <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; margin: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background-color: #4A7BF7; padding: 24px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">FlashLearn AI</h1>
          </div>

          <!-- Warning Banner -->
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 24px; margin: 24px 32px 0;">
            <p style="margin: 0; font-weight: 600; color: #92400E; font-size: 16px;">Content Warning Notice</p>
          </div>

          <!-- Body -->
          <div style="padding: 24px 32px;">
            <p style="margin-top: 0;">Hello ${userName},</p>

            <p>We are writing to inform you that your flashcard set has been flagged by our moderation team for review.</p>

            <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Flagged Set</p>
              <p style="margin: 0; font-weight: 600; color: #111827; font-size: 16px;">${setTitle}</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #6B7280;">Reason: <span style="color: #DC2626; font-weight: 500;">${reasonText}</span></p>
            </div>

            <p>As a result of this review, action has been taken on your content. Please review our community guidelines to ensure your future content complies with our standards.</p>

            <p><strong>What you should do:</strong></p>
            <ul style="padding-left: 20px; color: #4B5563;">
              <li>Review our <a href="https://flashlearn.ai/guidelines" style="color: #4A7BF7; text-decoration: none;">Community Guidelines</a></li>
              <li>Edit or remove any content that may violate our policies</li>
              <li>Reach out to our support team if you believe this was a mistake</li>
            </ul>

            <p style="color: #6B7280; font-size: 14px;">Repeated violations may result in further restrictions on your account, including suspension.</p>

            <p style="margin-bottom: 0;">Regards,<br><strong>The FlashLearn AI Team</strong></p>
          </div>

          <!-- Footer -->
          <div style="background-color: #F9FAFB; padding: 16px 32px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
              This is an automated message from FlashLearn AI. Please do not reply to this email.<br>
              If you need assistance, contact us at support@flashlearn.ai
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
