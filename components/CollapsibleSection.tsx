import React, { useState } from 'react';

interface CollapsibleSectionProps {
    title: React.ReactNode;
    defaultExpanded?: boolean;
    children: React.ReactNode;
    className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    defaultExpanded = true,
    children,
    className = ''
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <section className={`bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors rounded-t-lg"
            >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h2>
                <svg
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {expanded && (
                <div className="px-6 pb-6">
                    {children}
                </div>
            )}
        </section>
    );
};

export default CollapsibleSection;
