interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
}

export function getPasswordResetEmailTemplate({
  userName,
  resetUrl,
}: PasswordResetEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background-color: #3B82F6; padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">FlashLearn AI</h1>
                  <p style="margin: 8px 0 0; color: #DBEAFE; font-size: 14px;">Password Reset Request</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background-color: #FFFFFF; padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 20px; font-weight: bold;">Hi ${userName},</h2>

                  <p style="margin: 0 0 16px; color: #4B5563; font-size: 16px;">
                    Someone recently requested a password change for your FlashLearn AI account. If this was you, click the button below to set a new password:
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetUrl}" style="display: inline-block; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Reset Your Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0 0 24px; background-color: #F9FAFB; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #3B82F6;">
                    ${resetUrl}
                  </p>

                  <p style="margin: 0 0 16px; color: #4B5563; font-size: 14px;">
                    This link will expire in <strong>1 hour</strong>. If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash; your password will remain unchanged.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F9FAFB; padding: 24px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #E5E7EB; text-align: center;">
                  <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px; font-weight: 600;">
                    FlashLearn AI - The smart way to learn with flashcards
                  </p>
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    This is an automated email. Please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
