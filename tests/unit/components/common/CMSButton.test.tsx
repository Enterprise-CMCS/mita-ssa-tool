import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';

import CMSButton from '@/components/common/CMSButton';

// Mock the CMS Design System Button component
jest.mock('@cmsgov/design-system', () => ({
  Button: ({ children, onClick, disabled, type }) => (
    <button onClick={onClick} disabled={disabled} type={type} data-testid="cms-button">
      {children}
    </button>
  ),
}));

describe('CMSButton Component', () => {
  test('renders with default props', () => {
    render(<CMSButton label="Click me" />);

    const button = screen.getByTestId('cms-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
    expect(button).not.toBeDisabled();
    expect(button.tagName).toBe('BUTTON');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<CMSButton label="Click me" onClick={handleClick} />);

    const button = screen.getByTestId('cms-button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('renders as disabled when disabled prop is true', () => {
    render(<CMSButton label="Disabled Button" disabled />);

    const button = screen.getByTestId('cms-button');
    expect(button).toBeDisabled();
  });
});
