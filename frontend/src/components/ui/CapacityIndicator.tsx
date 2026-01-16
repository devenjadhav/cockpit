import React from 'react';
import { clsx } from 'clsx';

interface CapacityIndicatorProps {
  current: number;
  maximum?: number;
  status: 'low' | 'medium' | 'high' | 'full' | string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  low: {
    color: 'bg-green-500',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    label: 'Low capacity',
  },
  medium: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    label: 'Medium capacity',
  },
  high: {
    color: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    label: 'High capacity',
  },
  full: {
    color: 'bg-red-600',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/30',
    borderColor: 'border-red-500/50',
    label: 'At capacity',
  },
};

const sizeConfig = {
  sm: {
    height: 'h-2',
    text: 'text-xs',
    padding: 'px-2 py-1',
  },
  md: {
    height: 'h-3',
    text: 'text-sm',
    padding: 'px-3 py-1',
  },
  lg: {
    height: 'h-4',
    text: 'text-base',
    padding: 'px-4 py-2',
  },
};

export function CapacityIndicator({
  current,
  maximum,
  status,
  showPercentage = true,
  size = 'md',
  className = '',
}: CapacityIndicatorProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.low; // Fallback to 'low' if status is invalid
  const sizeStyles = sizeConfig[size];
  const percentage = maximum ? Math.min(100, Math.round((current / maximum) * 100)) : 0;

  return (
    <div className={clsx('space-y-1', className)}>
      {/* Progress bar */}
      <div className={clsx('w-full bg-white/10 overflow-hidden', sizeStyles.height)}>
        <div
          className={clsx('transition-all duration-500 ease-out', config.color, sizeStyles.height)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status and count */}
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'inline-flex items-center font-medium border',
            sizeStyles.text,
            sizeStyles.padding,
            config.textColor,
            config.bgColor,
            config.borderColor
          )}
        >
          {current}{maximum ? `/${maximum}` : ''} attendees
        </span>

        {showPercentage && maximum && (
          <span className={clsx('font-medium', sizeStyles.text, config.textColor)}>
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}

export function CapacityBadge({ status, size = 'sm' }: { status: 'low' | 'medium' | 'high' | 'full'; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium border',
        sizeStyles.text,
        sizeStyles.padding,
        config.textColor,
        config.bgColor,
        config.borderColor
      )}
    >
      <span className={clsx('w-2 h-2 mr-1', config.color)} />
      {config.label}
    </span>
  );
}
