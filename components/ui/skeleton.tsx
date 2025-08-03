import React from 'react';

/**
 * A simple, reusable skeleton component to indicate a loading state.
 * It uses a subtle pulse animation and can be customized via Tailwind CSS classes.
 *
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div attributes, including className.
 * @returns A skeleton loader element.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  // A simple utility function to combine class names
  const cn = (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}
