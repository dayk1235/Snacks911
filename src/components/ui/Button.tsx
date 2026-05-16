'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline' | 'glass' | 'pill';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  glow?: boolean;
}

const glowVariants: Record<string, string> = {
  primary: 'btn-primary-glow',
  success: 'btn-success-glow',
};

const sizeClasses: Record<string, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading: _loading,
      glow,
      disabled,
      children,
      onClick,
      onDrag,
      ...props
    },
    ref,
  ) => {
    const loading = _loading;
    const glowClass = glow && glowVariants[variant] ? glowVariants[variant] : '';
    const sizeClass = sizeClasses[size] ?? '';
    const isDisabled = disabled || loading;

    const classes = [
      'btn',
      `btn-${variant}`,
      sizeClass,
      glowClass,
      fullWidth ? 'w-full' : '',
      loading ? 'btn-loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        className={classes}
        whileHover={!isDisabled ? {} : undefined}
        whileTap={!isDisabled ? { scale: 0.94 } : undefined}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 25,
          mass: 0.6,
        }}
        disabled={isDisabled}
        onClick={onClick}
        {...props as Record<string, unknown>}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
