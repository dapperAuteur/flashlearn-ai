// lib/email/templates/securityAlert.ts
interface SecurityAlertEmailProps {
  username: string;
  eventType: string;
  ipAddress: string;
  timestamp: string;
  userAgent: string;
  location?: string;
}

export function getSecurityAlertEmailTemplate({
  username,
  eventType,
  ipAddress,
  timestamp,
  userAgent,
  location = "Unknown location"
}: SecurityAlertEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Security Alert - FlashLearn AI</title>
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
        .alert {
          background-color: #ffe0e0;
          border-left: 4px solid #ff5050;
          padding: 15px;
          margin-bottom: 20px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .info-table th {
          text-align: left;
          padding: 8px;
          background-color: #f2f2f2;
          border-bottom: 1px solid #ddd;
        }
        .info-table td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        .button {
          display: inline-block;
          background-color: #dc3545;
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
        <div class="alert">
          <h2>Security Alert</h2>
          <p>We detected suspicious activity on your FlashLearn AI account.</p>
        </div>
        
        <p>Hello ${username},</p>
        
        <p>We've detected a security event that you should be aware of:</p>
        
        <table class="info-table">
          <tr>
            <th>Event Type</th>
            <td>${eventType}</td>
          </tr>
          <tr>
            <th>Time</th>
            <td>${timestamp}</td>
          </tr>
          <tr>
            <th>IP Address</th>
            <td>${ipAddress}</td>
          </tr>
          <tr>
            <th>Location</th>
            <td>${location}</td>
          </tr>
          <tr>
            <th>Device</th>
            <td>${userAgent}</td>
          </tr>
        </table>
        
        <p>If this was you, you can ignore this email. If you don't recognize this activity, please take immediate action to secure your account:</p>
        
        <p><a href="https://flashlearn.ai/account/security" class="button">Secure Your Account</a></p>
        
        <p>For security reasons, we recommend:</p>
        <ul>
          <li>Changing your password immediately</li>
          <li>Enabling two-factor authentication</li>
          <li>Reviewing your recent account activity</li>
        </ul>
        
        <p>If you need any assistance, please contact our support team.</p>
      </div>
      <div class="footer">
        <p>FlashLearn AI - The smart way to learn with flashcards</p>
        <p>This email was sent to you as part of our security measures. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
}