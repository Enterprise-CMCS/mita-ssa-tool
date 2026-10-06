/**
 * ActionMenu Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionMenu } from './ActionMenu';

describe('ActionMenu', () => {
  const defaultProps = {
    status: 'in_progress' as const,
    hasHistory: false,
    onStart: vi.fn(),
    onResume: vi.fn(),
    onEdit: vi.fn(),
    onView: vi.fn(),
    onDelete: vi.fn(),
    onViewHistory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render menu button', () => {
    render(<ActionMenu {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should open menu on click', async () => {
    const user = userEvent.setup();
    render(<ActionMenu {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  describe('in_progress status', () => {
    it('should show Resume option', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="in_progress" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    it('should show Delete option', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="in_progress" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onResume when Resume clicked', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="in_progress" />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Resume'));

      expect(defaultProps.onResume).toHaveBeenCalled();
    });

    it('should call onDelete when Delete clicked', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="in_progress" />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Delete'));

      expect(defaultProps.onDelete).toHaveBeenCalled();
    });
  });

  describe('finalized status', () => {
    it('should show View option', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('View')).toBeInTheDocument();
    });

    it('should show Edit option', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should show Delete option', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onView when View clicked', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('View'));

      expect(defaultProps.onView).toHaveBeenCalled();
    });

    it('should call onEdit when Edit clicked', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Edit'));

      expect(defaultProps.onEdit).toHaveBeenCalled();
    });
  });

  describe('with history', () => {
    it('should show View History option when hasHistory is true', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" hasHistory={true} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('View History')).toBeInTheDocument();
    });

    it('should not show View History when hasHistory is false', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" hasHistory={false} />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('View History')).toBeNull();
    });

    it('should call onViewHistory when View History clicked', async () => {
      const user = userEvent.setup();
      render(<ActionMenu {...defaultProps} status="finalized" hasHistory={true} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('View History'));

      expect(defaultProps.onViewHistory).toHaveBeenCalled();
    });
  });

  it('should close menu after action', async () => {
    const user = userEvent.setup();
    render(<ActionMenu {...defaultProps} status="in_progress" />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByText('Resume'));

    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });
});
