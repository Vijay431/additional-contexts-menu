import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  size = 'medium' 
}: ButtonProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const getButtonClass = (): string => {
    const baseClass = 'btn';
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const disabledClass = disabled ? 'btn--disabled' : '';
    
    return [baseClass, variantClass, sizeClass, disabledClass]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <button 
      className={getButtonClass()}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export const IconButton: React.FC<{ icon: string; onClick: () => void }> = ({ 
  icon, 
  onClick 
}) => {
  return (
    <button className="icon-btn" onClick={onClick}>
      <span className={`icon icon-${icon}`} />
    </button>
  );
};

export const useButtonState = (initialDisabled = false) => {
  const [isDisabled, setIsDisabled] = React.useState(initialDisabled);
  
  const toggleDisabled = React.useCallback(() => {
    setIsDisabled(prev => !prev);
  }, []);

  const enable = React.useCallback(() => {
    setIsDisabled(false);
  }, []);

  const disable = React.useCallback(() => {
    setIsDisabled(true);
  }, []);

  return {
    isDisabled,
    toggleDisabled,
    enable,
    disable
  };
};