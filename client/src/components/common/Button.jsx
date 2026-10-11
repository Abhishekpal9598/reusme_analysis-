import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white focus-visible:ring-emerald-400 shadow-sm shadow-emerald-950/50',
    secondary: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 focus-visible:ring-slate-400 border border-slate-700',
    outline: 'bg-transparent hover:bg-slate-800/80 active:bg-slate-800 text-slate-200 border border-slate-700 focus-visible:ring-slate-400',
    ghost: 'bg-transparent hover:bg-slate-800/80 active:bg-slate-800 text-slate-300 hover:text-white focus-visible:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white focus-visible:ring-rose-400',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2 text-sm gap-2 min-h-[40px]',
    lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[44px]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
