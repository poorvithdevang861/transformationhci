import React from 'react';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  style?: React.CSSProperties;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style
}: SegmentedControlProps<T>) {
  return (
    <div className="seg" role="group" style={style}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className="t"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
