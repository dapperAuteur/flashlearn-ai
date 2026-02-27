export function getCampaignEmailWrapper({
  content,
  unsubscribeUrl,
}: {
  content: string;
  unsubscribeUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FlashLearn AI</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f5;
        }
        .wrapper {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #3B82F6;
          padding: 24px 32px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header-logo {
          color: #ffffff;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .header-tagline {
          color: #BFDBFE;
          font-size: 13px;
          margin: 4px 0 0 0;
        }
        .content {
          background-color: #ffffff;
          padding: 32px;
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px 32px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e5e7eb;
          border-top: none;
          text-align: center;
        }
        .footer p {
          margin: 0;
          font-size: 12px;
          color: #9ca3af;
        }
        .footer a {
          color: #3B82F6;
          text-decoration: underline;
        }
        .unsubscribe {
          margin-top: 12px;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <p class="header-logo">FlashLearn AI</p>
          <p class="header-tagline">The smart way to learn with flashcards</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} FlashLearn AI. All rights reserved.</p>
          <p class="unsubscribe">
            <a href="${unsubscribeUrl}">Unsubscribe</a> from these emails.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
