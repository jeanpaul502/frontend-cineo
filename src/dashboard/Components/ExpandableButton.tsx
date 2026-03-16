import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface ExpandableButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: (e: React.MouseEvent) => void;
    rotateIcon?: boolean;
    shakeOnClick?: boolean;
    activeColor?: string;
    activeIconColor?: string;
    alwaysExpanded?: boolean;
    height?: string;
}

export const ExpandableButton = ({
    icon,
    label,
    onClick,
    rotateIcon = false,
    shakeOnClick = false,
    activeColor,
    activeIconColor,
    alwaysExpanded = false,
    height = '48px'
}: ExpandableButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const isExpanded = alwaysExpanded || isHovered;

    const handleClick = (e: React.MouseEvent) => {
        if (shakeOnClick) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
        onClick?.(e);
    };

    return (
        <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            className={`group relative flex items-center ${isExpanded ? 'gap-2' : 'justify-center'} rounded-lg border backdrop-blur-md overflow-hidden transition-all hover:scale-105 active:scale-95 cursor-pointer
                ${activeColor ? activeColor : "border-gray-400/30 bg-black/40 hover:bg-white/20 hover:border-gray-400 text-white"}
            `}
            style={{
                width: isExpanded ? 'auto' : height, // Slightly wider for better touch target
                height: height,
                paddingLeft: isExpanded ? '16px' : '0',
                paddingRight: isExpanded ? '20px' : '0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <motion.div
                animate={isShaking ? { rotate: [0, -15, 15, -15, 15, 0] } : { rotate: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-shrink-0"
            >
                <div className={`transition-transform duration-300 ${rotateIcon && isExpanded ? 'rotate-90' : ''} ${activeIconColor || ''}`}>
                    {icon}
                </div>
            </motion.div>

            <span
                className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${activeIconColor ? activeIconColor : 'text-white'}`}
                style={{
                    width: isExpanded ? 'auto' : '0px',
                    opacity: isExpanded ? 1 : 0,
                    marginLeft: isExpanded ? '8px' : '0px'
                }}
            >
                {label}
            </span>
        </button>
    );
};
