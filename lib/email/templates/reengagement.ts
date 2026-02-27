export function getReengagementTemplate(
  template: string,
  userName: string
): { subject: string; html: string } {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://flashlearn.ai';
  const firstName = userName.split(' ')[0] || 'there';

  switch (template) {
    case 'we-miss-you':
      return {
        subject: 'We miss you at FlashLearn AI!',
        html: getEmailWrapper(`
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 22px;">
            We miss you, ${firstName}!
          </h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Learning is a journey, and every journey has its pauses. We noticed you haven&rsquo;t
            visited FlashLearn AI in a while, and we wanted to let you know &mdash; your flashcards
            are right where you left them.
          </p>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Studies show that even a few minutes of spaced repetition each day can dramatically
            improve long-term retention. Why not pick up where you left off?
          </p>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Your progress matters, and we are here to support your learning goals whenever
            you are ready to come back.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}/dashboard"
               style="background-color: #4A7BF7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Come Back and Study
            </a>
          </div>
        `),
      };

    case 'new-features':
      return {
        subject: "Check out what's new at FlashLearn AI",
        html: getEmailWrapper(`
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 22px;">
            What&rsquo;s new at FlashLearn AI
          </h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Hi ${firstName}, we have been busy making FlashLearn AI even better for you!
            Here are some of the latest improvements:
          </p>
          <div style="margin: 24px 0;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
              <div style="background-color: #EEF2FF; border-radius: 8px; padding: 8px 12px; margin-right: 12px; flex-shrink: 0;">
                <span style="font-size: 18px;">&#x2728;</span>
              </div>
              <div>
                <p style="color: #1f2937; font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">AI-Powered Flashcard Generation</p>
                <p style="color: #6b7280; margin: 0; font-size: 13px;">Create flashcards from PDFs, YouTube videos, images, and more with a single click.</p>
              </div>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
              <div style="background-color: #EEF2FF; border-radius: 8px; padding: 8px 12px; margin-right: 12px; flex-shrink: 0;">
                <span style="font-size: 18px;">&#x1F4CA;</span>
              </div>
              <div>
                <p style="color: #1f2937; font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">Enhanced Study Analytics</p>
                <p style="color: #6b7280; margin: 0; font-size: 13px;">Track your progress with detailed accuracy and session insights.</p>
              </div>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
              <div style="background-color: #EEF2FF; border-radius: 8px; padding: 8px 12px; margin-right: 12px; flex-shrink: 0;">
                <span style="font-size: 18px;">&#x1F4F1;</span>
              </div>
              <div>
                <p style="color: #1f2937; font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">Improved Mobile Experience</p>
                <p style="color: #6b7280; margin: 0; font-size: 13px;">Study anywhere with our optimized mobile interface and offline mode.</p>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}/dashboard"
               style="background-color: #4A7BF7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Explore New Features
            </a>
          </div>
        `),
      };

    case 'study-reminder':
      return {
        subject: 'Your flashcards are waiting!',
        html: getEmailWrapper(`
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 22px;">
            Your flashcards are waiting, ${firstName}!
          </h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Did you know? Spaced repetition is one of the most effective learning techniques
            backed by science. By reviewing your flashcards at optimal intervals, you can
            remember more with less effort.
          </p>
          <div style="background-color: #F0F4FF; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #4A7BF7;">
            <p style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0; font-style: italic;">
              &ldquo;The best time to review is just before you are about to forget.
              A short daily study session beats a long cramming session every time.&rdquo;
            </p>
          </div>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Even 5 minutes a day can make a real difference. Your flashcard sets are ready
            and waiting for you. Why not start a quick study session right now?
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}/flashcards"
               style="background-color: #4A7BF7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Start Studying Now
            </a>
          </div>
        `),
      };

    default:
      return {
        subject: 'Hello from FlashLearn AI',
        html: getEmailWrapper(`
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 22px;">
            Hello, ${firstName}!
          </h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            We wanted to reach out and let you know we are here to help with your
            learning journey. Visit FlashLearn AI anytime to continue studying.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}/dashboard"
               style="background-color: #4A7BF7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Visit FlashLearn AI
            </a>
          </div>
        `),
      };
  }
}

function getEmailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FlashLearn AI</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4A7BF7; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
          <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: -0.5px;">
            FlashLearn AI
          </p>
          <p style="color: #BFDBFE; font-size: 13px; margin: 4px 0 0 0;">
            The smart way to learn with flashcards
          </p>
        </div>
        <div style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          ${content}
        </div>
        <div style="background-color: #f9fafb; padding: 24px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            &copy; ${new Date().getFullYear()} FlashLearn AI. All rights reserved.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
            You received this email because you have an account at FlashLearn AI.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
