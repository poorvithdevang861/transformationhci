import React, { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 9, 11, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
        style={{
          width,
          maxWidth: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: '20px',
          padding: '24px 28px',
          boxShadow: '0 24px 70px -15px rgba(0, 0, 0, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edge" style={{ marginBottom: '16px' }}>
          <div>
            {eyebrow && <div className="eyebrow" style={{ marginBottom: '2px' }}>{eyebrow}</div>}
            <h2 className="ptitle" style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          </div>
          <button
            type="button"
            className="ibtn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ borderRadius: '10px' }}
          >
            <Icon name="i-x" size="sm" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
