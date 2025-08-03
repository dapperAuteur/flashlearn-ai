import React from 'react';

interface PasswordResetEmailProps {
  userFirstname?: string;
  resetPasswordUrl: string;
}

export default function PasswordResetEmail({
  userFirstname = 'there',
  resetPasswordUrl,
}: PasswordResetEmailProps) {
  return (
    <div>
      <h1>Hi {userFirstname},</h1>
      <p>
        Someone recently requested a password change for your FlashLearn AI account.
        If this was you, you can set a new password here:
      </p>
      <a href={resetPasswordUrl}>Set a new password</a>
      <p>
        If you don&apos;t want to change your password or didn&apos;t request this, just
        ignore and delete this message.
      </p>
      <p>
        To keep your account secure, please don&apos;t forward this email to anyone.
      </p>
      <p>Thanks,</p>
      <p>The FlashLearn AI Team</p>
    </div>
  );
}
