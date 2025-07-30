import React from 'react';

interface CountryFlagProps {
  countryCode?: string;
  country?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const flagEmojis: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  CA: '🇨🇦',
  DE: '🇩🇪',
  FR: '🇫🇷',
  JP: '🇯🇵',
  AU: '🇦🇺',
  IN: '🇮🇳',
  SG: '🇸🇬',
  NL: '🇳🇱',
  SE: '🇸🇪',
  BR: '🇧🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  KR: '🇰🇷',
  CN: '🇨🇳',
  MX: '🇲🇽',
  RU: '🇷🇺',
  ZA: '🇿🇦',
  CH: '🇨🇭',
};

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

export function CountryFlag({ countryCode, country, size = 'md', className = '' }: CountryFlagProps) {
  if (!countryCode) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-gray-400`}>
        🌍
      </div>
    );
  }

  const flag = flagEmojis[countryCode.toUpperCase()] || '🌍';

  return (
    <span 
      className={`${sizeClasses[size]} ${className}`}
      title={country || countryCode}
      role="img"
      aria-label={`${country || countryCode} flag`}
    >
      {flag}
    </span>
  );
}
