export function getConversationReplyTemplate({
  userName,
  adminMessage,
  conversationUrl,
}: {
  userName: string;
  adminMessage: string;
  conversationUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Reply - FlashLearn AI</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f7fa;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 0;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .header {
          background-color: #3B82F6;
          padding: 24px 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          color: #DBEAFE;
          margin: 6px 0 0;
          font-size: 13px;
        }
        .body-content {
          padding: 32px;
        }
        .greeting {
          font-size: 16px;
          color: #1e293b;
          margin-bottom: 16px;
        }
        .message-box {
          background-color: #f1f5f9;
          border-left: 4px solid #3B82F6;
          border-radius: 0 8px 8px 0;
          padding: 16px 20px;
          margin: 20px 0;
          font-size: 14px;
          color: #334155;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .message-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 8px;
        }
        .cta-container {
          text-align: center;
          margin: 28px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #3B82F6;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
        }
        .footer {
          padding: 20px 32px;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }
        .footer p {
          font-size: 12px;
          color: #94a3b8;
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FlashLearn AI</h1>
          <p>You have a new reply to your conversation</p>
        </div>
        <div class="body-content">
          <p class="greeting">Hello ${userName},</p>
          <p style="font-size: 14px; color: #475569;">
            Our support team has responded to your conversation. Here is their message:
          </p>
          <div class="message-label">Admin Reply</div>
          <div class="message-box">${adminMessage}</div>
          <div class="cta-container">
            <a href="${conversationUrl}" class="cta-button">View Conversation</a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">
            You can reply directly from the conversation panel in the app.
          </p>
        </div>
        <div class="footer">
          <p>FlashLearn AI - The smart way to learn with flashcards</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
