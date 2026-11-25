import React from 'react';
import { ArrowRightIcon } from './icons';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AuthButton: React.FC<AuthButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`w-full flex justify-center items-center py-3.5 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-lg shadow-blue-600/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b1120] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <span>{children}</span>
      <ArrowRightIcon className="w-4 h-4 ml-2" />
    </button>
  );
};

export default AuthButton;
