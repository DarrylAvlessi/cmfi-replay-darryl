import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from './icons';
import { useAppContext } from '../context/AppContext';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { t } = useAppContext();

  const isPasswordField = type === 'password';
  const inputType = isPasswordField && isPasswordVisible ? 'text' : type;

  return (
    <div className="relative">
      <label 
          htmlFor={props.id || props.name} 
          className="absolute -top-2.5 left-3 px-1 bg-white dark:bg-black text-sm font-bold text-black dark:text-gray-200"
      >
          {label}
      </label>
      <div className="flex items-center border border-gray-400/50 dark:border-gray-600 rounded-xl focus-within:ring-1 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all duration-200">
          <input
              type={inputType}
              className="w-full bg-transparent px-4 py-3.5 focus:outline-none text-gray-700 dark:text-gray-300 placeholder-gray-500/80"
              {...props}
          />
          {isPasswordField && (
              <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 font-semibold pr-4"
                  aria-label={isPasswordVisible ? t('hide') : t('show')}
              >
                  {isPasswordVisible ? (
                      <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                      <EyeIcon className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">{isPasswordVisible ? t('hide') : t('show')}</span>
              </button>
          )}
      </div>
    </div>
  );
};

export default InputField;