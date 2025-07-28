interface VerificationEmailProps {
  username: string;
  verificationUrl: string;
}

export function getVerificationEmailTemplate({
  username,
  verificationUrl,
}: VerificationEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 5px;
          padding: 20px;
          border: 1px solid #ddd;
        }
        .button {
          display: inline-block;
          background-color: #3182ce;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome to FlashLearn AI!</h2>
        <p>Hello ${username},</p>
        <p>Thank you for registering with FlashLearn AI. To complete your registration and verify your email address, please click the button below:</p>
        <p><a href="${verificationUrl}" class="button">Verify Your Email</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with FlashLearn AI, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>FlashLearn AI - The smart way to learn with flashcards</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </body>
    </html>
  `;
}