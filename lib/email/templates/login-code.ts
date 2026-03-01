interface LoginCodeEmailProps {
  code: string;
}

export function getLoginCodeEmailTemplate({
  code,
}: LoginCodeEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your FlashLearn Login Code</title>
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
                  <p style="margin: 8px 0 0; color: #DBEAFE; font-size: 14px;">Login Verification</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background-color: #FFFFFF; padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 20px; font-weight: bold;">Your login code</h2>

                  <p style="margin: 0 0 24px; color: #4B5563; font-size: 16px;">
                    Enter the following code to sign in to your FlashLearn AI account:
                  </p>

                  <!-- Code Display -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                    <tr>
                      <td align="center">
                        <div style="background-color: #F0F4FF; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px 40px; display: inline-block;">
                          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1E40AF; font-family: 'Courier New', Courier, monospace;">
                            ${code}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 16px; color: #4B5563; font-size: 14px;">
                    This code will expire in <strong>10 minutes</strong>.
                  </p>

                  <!-- Warning -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 0;">
                    <tr>
                      <td style="background-color: #FEF3C7; padding: 16px; border-radius: 6px; border-left: 4px solid #F59E0B;">
                        <p style="margin: 0; color: #92400E; font-size: 14px;">
                          If you did not request this code, someone may be trying to access your account. You can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
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
