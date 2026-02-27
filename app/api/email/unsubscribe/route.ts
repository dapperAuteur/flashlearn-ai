import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(getHtmlPage('Invalid unsubscribe link.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 400,
      });
    }

    // Decode the base64 encoded email
    let email: string;
    try {
      email = Buffer.from(token, 'base64').toString('utf-8');
    } catch {
      return new NextResponse(getHtmlPage('Invalid unsubscribe link.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 400,
      });
    }

    if (!email || !email.includes('@')) {
      return new NextResponse(getHtmlPage('Invalid unsubscribe link.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 400,
      });
    }

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { emailUnsubscribed: true },
      { new: true }
    );

    if (!user) {
      return new NextResponse(getHtmlPage('Email address not found.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404,
      });
    }

    return new NextResponse(
      getHtmlPage('You have been unsubscribed from FlashLearn AI emails.'),
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return new NextResponse(
      getHtmlPage('Something went wrong. Please try again later.'),
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 500,
      }
    );
  }
}

function getHtmlPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribe - FlashLearn AI</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background-color: #f4f4f5;
          color: #333;
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
          margin: 20px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .logo {
          color: #3B82F6;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 24px;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">FlashLearn AI</div>
        <p class="message">${message}</p>
      </div>
    </body>
    </html>
  `;
}
