'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/core'; // Assuming cn utility exists, or I can define it

/**
 * Premium Button with hover and tap animations
 */
export const PremiumButton = ({ 
  children, 
  className, 
  onClick, 
  disabled = false,
  variant = 'primary' 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'glass';
}) => {
  const variants = {
    primary: 'btn-premium',
    secondary: 'btn-secondary',
    glass: 'glass glass-hover px-6 py-3 rounded-xl font-semibold'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(variants[variant], className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
};

/**
 * GlassCard with cinematic entrance animation and glassmorphism
 */
export const GlassCard = ({ 
  children, 
  className,
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn('glass glass-hover rounded-2xl overflow-hidden', className)}
    >
      {children}
    </motion.div>
  );
};

/**
 * Animated Gradient background for hero sections
 */
export const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-orb-1" />
      <div className="hero-orb-2" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-deep to-bg-deep opacity-80" />
    </div>
  );
};

/**
 * Simple CN utility if not present elsewhere
 */
// Removed duplicate local cn definition to use the imported one
