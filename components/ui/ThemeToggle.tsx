'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light mode' },
    { value: 'dark' as const, icon: Moon, label: 'Dark mode' },
    { value: 'system' as const, icon: Monitor, label: 'System theme' },
  ];

  const cycle = () => {
    const order = ['light', 'dark', 'system'] as const;
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const current = options.find((o) => o.value === theme) || options[0];
  const Icon = current.icon;

  return (
    <button
      onClick={cycle}
      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      aria-label={`Current theme: ${current.label}. Click to change.`}
      title={current.label}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
