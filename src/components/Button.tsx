import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
}

export const Button = ({
  loading,
  success,
  error,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && success && (
        <span className="material-symbols-outlined text-[18px] shrink-0 text-emerald-500">check_circle</span>
      )}
      {!loading && error && (
        <span className="material-symbols-outlined text-[18px] shrink-0 text-rose-500">error</span>
      )}
      {children}
    </button>
  );
};
export default Button;
