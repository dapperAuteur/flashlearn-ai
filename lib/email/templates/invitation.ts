interface InvitationEmailProps {
  inviterName: string;
  personalNote?: string;
  signupUrl: string;
}

export function getInvitationEmailTemplate({
  inviterName,
  personalNote,
  signupUrl,
}: InvitationEmailProps): string {
  const personalNoteBlock = personalNote
    ? `
        <blockquote style="margin: 20px 0; padding: 15px 20px; background-color: #F0F7FF; border-left: 4px solid #3B82F6; border-radius: 0 4px 4px 0; color: #1E3A5F; font-style: italic;">
          &ldquo;${personalNote}&rdquo;
        </blockquote>
      `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited to FlashLearn AI</title>
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
                  <p style="margin: 8px 0 0; color: #DBEAFE; font-size: 14px;">The smart way to learn with flashcards</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background-color: #FFFFFF; padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 20px; font-weight: bold;">You've Been Invited!</h2>

                  <p style="margin: 0 0 16px; color: #4B5563; font-size: 16px;">
                    You've been invited to FlashLearn AI by <strong>${inviterName}</strong>.
                  </p>

                  ${personalNoteBlock}

                  <p style="margin: 0 0 16px; color: #4B5563; font-size: 16px;">
                    FlashLearn AI helps you create, study, and master flashcards using the power of artificial intelligence. Join today and start learning smarter.
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${signupUrl}" style="display: inline-block; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Create Your Account
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; background-color: #F9FAFB; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #3B82F6;">
                    ${signupUrl}
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
                    This is an automated invitation email. Please do not reply.
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
