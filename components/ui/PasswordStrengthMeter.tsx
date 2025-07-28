'use client';

import { useState, useEffect } from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState(0);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    // Don't show strength for empty passwords
    if (!password) {
      setStrength(0);
      setMessage('');
      return;
    }
    
    let currentStrength = 0;
    let feedbackMessage = '';
    
    // Length check
    if (password.length >= 10) {
      currentStrength += 25;
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
      currentStrength += 25;
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
      currentStrength += 25;
    }
    
    // Number check
    if (/[0-9]/.test(password)) {
      currentStrength += 12.5;
    }
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) {
      currentStrength += 12.5;
    }
    
    // Set message based on strength
    if (currentStrength < 50) {
      feedbackMessage = 'Weak password';
    } else if (currentStrength < 75) {
      feedbackMessage = 'Moderate password';
    } else if (currentStrength < 100) {
      feedbackMessage = 'Strong password';
    } else {
      feedbackMessage = 'Very strong password';
    }
    
    setStrength(currentStrength);
    setMessage(feedbackMessage);
  }, [password]);
  
  // Determine color based on strength
  const getBarColor = () => {
    if (strength < 50) return 'bg-red-500';
    if (strength < 75) return 'bg-yellow-500';
    if (strength < 100) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (!password) return null;
  
  return (
    <div className="mt-1 mb-3">
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div 
          className={`h-full rounded-full ${getBarColor()}`} 
          style={{ width: `${strength}%` }}
        ></div>
      </div>
      <p className={`text-sm mt-1 ${getBarColor().replace('bg-', 'text-')}`}>
        {message}
      </p>
    </div>
  );
}