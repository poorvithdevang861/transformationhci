import React from 'react';
import { Icon } from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  width = '640px'
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edge" style={{ marginBottom: '14px' }}>
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="ptitle">{title}</h2>
          </div>
          <button type="button" className="ibtn" onClick={onClose} aria-label="Close modal">
            <Icon name="i-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
