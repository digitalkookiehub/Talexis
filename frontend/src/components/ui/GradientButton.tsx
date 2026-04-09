import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GradientButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

const variants = {
  primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25',
  secondary: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/25',
  outline: 'border-2 border-purple-500 text-purple-600 hover:bg-purple-50',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  type = 'button',
  onClick,
}: GradientButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        'rounded-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      type={type}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
