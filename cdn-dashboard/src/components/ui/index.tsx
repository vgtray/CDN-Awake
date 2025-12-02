'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';

// ===== ANIMATION VARIANTS =====
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

// ===== BUTTON COMPONENT =====
const buttonVariants = cva(
  'relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-50 disabled:pointer-events-none overflow-hidden',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 focus-visible:ring-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]',
        secondary:
          'bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700/80 focus-visible:ring-zinc-500 border border-zinc-700/50 hover:border-zinc-600/50 backdrop-blur-sm',
        danger:
          'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 focus-visible:ring-red-500 shadow-lg shadow-red-500/20',
        ghost:
          'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
        outline:
          'border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400/70',
        success:
          'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500 focus-visible:ring-emerald-500 shadow-lg shadow-emerald-500/20',
      },
      size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        setRipple({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setTimeout(() => setRipple(null), 600);
      }
      props.onClick?.(e);
    };

    return (
      <button
        ref={(node) => {
          (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={handleClick}
        {...props}
      >
        {ripple && (
          <span
            className="absolute rounded-full bg-white/20 animate-[ripple_0.6s_ease-out]"
            style={{
              left: ripple.x - 5,
              top: ripple.y - 5,
              width: 10,
              height: 10,
            }}
          />
        )}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ===== ANIMATED CARD COMPONENT =====
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  glow?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'none';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, gradient, glow = 'none', hover = true, ...props }, ref) => {
    const glowClasses = {
      indigo: 'hover:glow-indigo',
      emerald: 'hover:glow-emerald',
      amber: 'hover:glow-amber',
      rose: 'hover:glow-rose',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm',
          'transition-all duration-300',
          hover && 'hover:border-zinc-700/50 hover:bg-zinc-900/70',
          gradient && 'bg-gradient-to-br from-zinc-900/80 to-zinc-800/50',
          glowClasses[glow],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Animated Card Wrapper
interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
  glow?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'none';
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, delay = 0, glow = 'none', children, ...props }, ref) => {
    const glowClasses = {
      indigo: 'hover:glow-indigo',
      emerald: 'hover:glow-emerald',
      amber: 'hover:glow-amber',
      rose: 'hover:glow-rose',
      none: '',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.4, 
          delay,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        whileHover={{ 
          scale: 1.01,
          transition: { duration: 0.2 },
        }}
        className={cn(
          'rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm',
          'transition-colors duration-300',
          'hover:border-zinc-700/50 hover:bg-zinc-900/70',
          glowClasses[glow],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between p-6 border-b border-zinc-800/50', className)}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';

// ===== INPUT COMPONENT =====
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-zinc-400">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50',
            'text-zinc-100 placeholder-zinc-500',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            'transition-all duration-200',
            'hover:border-zinc-600/50',
            error && 'border-red-500/50 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ===== BADGE COMPONENT =====
const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
        primary: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
        info: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ variant, className }))} {...props} />
    );
  }
);

Badge.displayName = 'Badge';

// ===== ANIMATED NUMBER COMPONENT =====
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  className,
  formatter = (n) => n.toLocaleString(),
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValueRef.current + (value - startValueRef.current) * easeOut;
      
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={cn('tabular-nums', className)}>
      {formatter(displayValue)}
    </span>
  );
}

// ===== MODAL COMPONENT =====
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className={cn(
              'relative w-full mx-4 rounded-2xl',
              'bg-zinc-900 border border-zinc-800/50',
              'shadow-2xl shadow-black/50',
              sizeClasses[size]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
            
            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ===== SKELETON LOADER =====
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl skeleton',
        className
      )}
    />
  );
}

// ===== EMPTY STATE =====
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      {icon && (
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4"
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-lg font-medium text-zinc-100 mb-2">{title}</h3>
      {description && (
        <p className="text-zinc-400 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </motion.div>
  );
}

// ===== PAGE TRANSITION WRAPPER =====
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===== STAGGER CONTAINER =====
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.05 }: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===== STAGGER ITEM =====
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===== TOOLTIP =====
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'absolute z-50 px-2.5 py-1.5 text-xs font-medium',
              'bg-zinc-800 text-zinc-100 rounded-lg border border-zinc-700/50',
              'shadow-lg whitespace-nowrap pointer-events-none',
              positions[side]
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
