interface StudyGroupInviteEmailProps {
  inviterName: string;
  groupName: string;
  joinCode: string;
  joinUrl: string;
}

export function getStudyGroupInviteEmailTemplate({
  inviterName,
  groupName,
  joinCode,
  joinUrl,
}: StudyGroupInviteEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited to a FlashLearnAI study group</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
              <tr>
                <td style="background: linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%); padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">Study Group Invite</h1>
                  <p style="margin: 8px 0 0; color: #DBEAFE; font-size: 14px;">FlashLearnAI.WitUS.Online</p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #FFFFFF; padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 20px; font-weight: bold;">${inviterName} invited you to ${groupName}</h2>
                  <p style="margin: 0 0 16px; color: #4B5563; font-size: 16px;">
                    Study groups on FlashLearnAI let you and your group share flashcard sets, study together, and track each other's progress.
                  </p>
                  <p style="margin: 0 0 8px; color: #4B5563; font-size: 16px;">Your join code:</p>
                  <p style="margin: 0 0 24px; padding: 18px; background-color: #F5F3FF; border: 2px dashed #7C3AED; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4C1D95;">
                    ${joinCode}
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${joinUrl}" style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Join the Group
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">
                    Already have an account? Click the button to join. Don't have one yet? You'll be asked to sign up first; you must be 13 or older.
                  </p>
                  <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; background-color: #F9FAFB; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #7C3AED;">
                    ${joinUrl}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #F9FAFB; padding: 24px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #E5E7EB; text-align: center;">
                  <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px; font-weight: 600;">
                    FlashLearnAI.WitUS.Online
                  </p>
                  <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    You received this because ${inviterName} added your email to a study group invite. If you weren't expecting this, you can ignore the message.
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
