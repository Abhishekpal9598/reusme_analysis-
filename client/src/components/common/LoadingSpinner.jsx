import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({
  size = 'md',
  className = '',
  label = 'Loading...',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <Loader2 className={`animate-spin text-emerald-500 ${sizes[size] || sizes.md}`} />
      {label && <span className="text-xs text-slate-400">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
};
