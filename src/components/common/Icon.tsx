import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  solid?: boolean;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', size = 'md', style, solid }) => {
  const isSolid = solid ?? name.startsWith('i-puzzle');
  const sizeClass = size === 'sm' ? 'i sm' : size === 'lg' ? 'i lg' : 'i';
  const solidClass = isSolid ? 'solid' : '';
  return (
    <svg className={`${sizeClass} ${solidClass} ${className}`.trim()} aria-hidden="true" style={style}>
      <use href={`#${name}`} />
    </svg>
  );
};
