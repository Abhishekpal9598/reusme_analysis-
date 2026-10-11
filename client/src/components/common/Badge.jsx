import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full shrink-0 select-none';

  const variants = {
    default: 'bg-slate-800 text-slate-200 border border-slate-700',
    success: 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/80',
    warning: 'bg-amber-950/90 text-amber-300 border border-amber-700/80',
    info: 'bg-sky-950/90 text-sky-300 border border-sky-700/80',
    purple: 'bg-purple-950/90 text-purple-300 border border-purple-700/80',
    danger: 'bg-rose-950/90 text-rose-300 border border-rose-700/80',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[11px] font-medium',
    md: 'px-3 py-1 text-xs font-medium tracking-wide',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  return (
    <span className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
};
