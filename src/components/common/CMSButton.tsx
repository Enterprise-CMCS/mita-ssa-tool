import React from 'react';

import { Button as DSButton } from '@cmsgov/design-system';

interface CMSButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'transparent';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  size?: 'small' | 'big';
}

/**
 * Button component that wraps the CMS Design System Button
 */
const CMSButton: React.FC<CMSButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
  size,
}) => {
  // CMS Design System uses different variation types
  // We'll use isAlternate for secondary, and solid/ghost for variation
  const isAlternate = variant === 'secondary' || variant === 'danger' || variant === 'success';
  const onDark = variant === 'transparent';

  return (
    <DSButton
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      isAlternate={isAlternate}
      onDark={onDark}
      size={size}
    >
      {label}
    </DSButton>
  );
};

export default CMSButton;
