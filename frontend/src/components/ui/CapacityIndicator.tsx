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
    color: 'bg-success-500',
    textColor: 'text-success-700',
    bgColor: 'bg-success-50',
    label: 'Low capacity',
  },
  medium: {
    color: 'bg-warning-500',
    textColor: 'text-warning-700',
    bgColor: 'bg-warning-50',
    label: 'Medium capacity',
  },
  high: {
    color: 'bg-danger-500',
    textColor: 'text-danger-700',
    bgColor: 'bg-danger-50',
    label: 'High capacity',
  },
  full: {
    color: 'bg-danger-600',
    textColor: 'text-danger-800',
    bgColor: 'bg-danger-100',
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
      <div className={clsx('w-full bg-gray-200 rounded-full overflow-hidden', sizeStyles.height)}>
        <div
          className={clsx('transition-all duration-500 ease-out rounded-full', config.color, sizeStyles.height)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status and count */}
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'inline-flex items-center rounded-full font-medium',
            sizeStyles.text,
            sizeStyles.padding,
            config.textColor,
            config.bgColor
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
        'inline-flex items-center rounded-full font-medium',
        sizeStyles.text,
        sizeStyles.padding,
        config.textColor,
        config.bgColor
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full mr-1', config.color)} />
      {config.label}
    </span>
  );
}
