import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    animation?: 'fadeIn' | 'slideUp';
    delay?: number;
    threshold?: number;
    once?: boolean;
}

const animationClasses: Record<string, string> = {
    fadeIn: 'animate-fadeIn',
    slideUp: 'animate-slideUp',
};

const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    className = '',
    animation = 'slideUp',
    delay = 0,
    threshold = 0.1,
    once = true,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    if (once) observer.unobserve(el);
                } else if (!once) {
                    setVisible(false);
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, once]);

    const animClass = animationClasses[animation] || animationClasses.slideUp;

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${visible ? animClass : 'opacity-0 translate-y-6'} ${className}`}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            {children}
        </div>
    );
};

export default ScrollReveal;
