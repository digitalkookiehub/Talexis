import { motion } from 'framer-motion';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <motion.div whileFocus={{ scale: 1.01 }}>
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 transition-colors duration-200 outline-none',
            error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500',
            className
          )}
          {...props}
        />
      </motion.div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
);

AnimatedInput.displayName = 'AnimatedInput';
