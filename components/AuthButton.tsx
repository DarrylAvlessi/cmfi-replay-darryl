import React from 'react';
import { ArrowRightIcon } from './icons';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AuthButton: React.FC<AuthButtonProps> = ({ children, ...props }) => {
  return (
    <div className="relative group w-full">
        <button
            className="relative w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-gray-900 dark:bg-black hover:bg-black dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-white dark:focus:ring-offset-black transition-all duration-300"
            {...props}
        >
            <span>{children}</span>
            <ArrowRightIcon className="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-1" />
        </button>
        <div className="absolute left-0 -bottom-1 w-full h-2.5 bg-amber-400 rounded-lg -z-10" />
    </div>
  );
};

export default AuthButton;