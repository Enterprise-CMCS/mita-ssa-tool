/**
 * InformationManagementNotice Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { InformationManagementNotice } from './InformationManagementNotice';

describe('InformationManagementNotice', () => {
  it('should render the guidance title', () => {
    render(<InformationManagementNotice />);

    expect(screen.getByText('Information Management guidance')).toBeInTheDocument();
  });

  it('should explain the assess-once-per-domain guidance', () => {
    render(<InformationManagementNotice />);

    expect(
      screen.getByText(/skip the Information dimension in this domain's other capability areas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/assess the Information dimension within that area instead/i)
    ).toBeInTheDocument();
  });

  it('should render as a warning alert', () => {
    const { container } = render(<InformationManagementNotice />);

    expect(container.querySelector('.MuiAlert-colorWarning')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<InformationManagementNotice />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
