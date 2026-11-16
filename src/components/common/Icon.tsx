import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', size = 'md', style }) => {
  const sizeClass = size === 'sm' ? 'i sm' : size === 'lg' ? 'i lg' : 'i';
  return (
    <svg className={`${sizeClass} ${className}`.trim()} aria-hidden="true" style={style}>
      <use href={`#${name}`} />
    </svg>
  );
};
