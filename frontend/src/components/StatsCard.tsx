import React from 'react';
import { clsx } from 'clsx';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorConfig = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    accent: 'text-primary-600',
  },
  success: {
    bg: 'bg-success-50',
    icon: 'text-success-600',
    accent: 'text-success-600',
  },
  warning: {
    bg: 'bg-warning-50',
    icon: 'text-warning-600',
    accent: 'text-warning-600',
  },
  danger: {
    bg: 'bg-danger-50',
    icon: 'text-danger-600',
    accent: 'text-danger-600',
  },
};

export function StatsCard({ title, value, icon, color, subtitle, trend }: StatsCardProps) {
  const config = colorConfig[color];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-bounce-in">
      <div className="flex items-center">
        <div className={clsx('p-3 rounded-lg', config.bg)}>
          <div className={clsx('w-6 h-6', config.icon)}>
            {icon}
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={clsx(
                  'ml-2 text-sm font-medium',
                  trend.isPositive ? 'text-success-600' : 'text-danger-600'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className={clsx('text-sm', config.accent)}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
