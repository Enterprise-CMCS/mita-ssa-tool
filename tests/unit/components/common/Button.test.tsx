import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';

import Button from '@/components/common/Button';

describe('Button Component', () => {
  test('renders with default props', () => {
    render(<Button label="Click me" />);

    const button = screen.getByTestId('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
    expect(button).not.toBeDisabled();
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    const button = screen.getByTestId('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('renders as disabled when disabled prop is true', () => {
    render(<Button label="Disabled Button" disabled />);

    const button = screen.getByTestId('button');
    expect(button).toBeDisabled();
  });

  test('renders with different variants', () => {
    const { rerender } = render(<Button label="Primary Button" variant="primary" />);
    let button = screen.getByTestId('button');
    expect(button).toHaveClass('bg-blue-600');

    rerender(<Button label="Secondary Button" variant="secondary" />);
    button = screen.getByTestId('button');
    expect(button).toHaveClass('bg-gray-600');

    rerender(<Button label="Outline Button" variant="outline" />);
    button = screen.getByTestId('button');
    expect(button).toHaveClass('border-gray-300');
  });

  test('applies custom className', () => {
    render(<Button label="Custom Button" className="custom-class" />);

    const button = screen.getByTestId('button');
    expect(button).toHaveClass('custom-class');
  });
});
