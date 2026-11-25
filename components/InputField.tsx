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
    <div>
      <label
        htmlFor={props.id || props.name}
        className="block mb-1.5 text-[11px] font-mono-meta font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>
      <div className="flex items-center border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/80 dark:bg-slate-900/70 focus-within:border-blue-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-sky-400/20 transition-all duration-200">
        <input
          type={inputType}
          className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium pr-3.5 transition-colors"
            aria-label={isPasswordVisible ? t('hide') : t('show')}
          >
            {isPasswordVisible ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isPasswordVisible ? t('hide') : t('show')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
