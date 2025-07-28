import React, { ReactNode } from 'react';
import Link from 'next/link';

interface StatisticCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  linkHref?: string;
  linkText?: string;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
}

export default function StatisticCard({
  title,
  value,
  description,
  icon,
  linkHref,
  linkText,
  color = 'blue',
}: StatisticCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          iconBg: 'bg-green-100',
          iconText: 'text-green-600',
          linkBg: 'bg-green-100',
          linkText: 'text-green-700 hover:text-green-900',
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          iconBg: 'bg-purple-100',
          iconText: 'text-purple-600',
          linkBg: 'bg-purple-100',
          linkText: 'text-purple-700 hover:text-purple-900',
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          iconBg: 'bg-yellow-100',
          iconText: 'text-yellow-600',
          linkBg: 'bg-yellow-100',
          linkText: 'text-yellow-700 hover:text-yellow-900',
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          iconBg: 'bg-red-100',
          iconText: 'text-red-600',
          linkBg: 'bg-red-100',
          linkText: 'text-red-700 hover:text-red-900',
        };
      default:
        return {
          bg: 'bg-blue-50',
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-600',
          linkBg: 'bg-blue-100',
          linkText: 'text-blue-700 hover:text-blue-900',
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div className={`${colorClasses.bg} overflow-hidden shadow rounded-lg`}>
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className={`flex-shrink-0 ${colorClasses.iconBg} rounded-md p-3`}>
              <div className={colorClasses.iconText}>{icon}</div>
            </div>
          )}
          <div className={`${icon ? 'ml-5' : ''} w-0 flex-1`}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
              {description && (
                <dd className="mt-1 text-sm text-gray-500">{description}</dd>
              )}
            </dl>
          </div>
        </div>
      </div>
      {linkHref && linkText && (
        <div className={`${colorClasses.linkBg} px-5 py-3`}>
          <div className="text-sm">
            <Link href={linkHref} className={`font-medium ${colorClasses.linkText}`}>
              {linkText}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}