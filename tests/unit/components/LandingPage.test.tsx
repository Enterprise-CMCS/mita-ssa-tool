import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import LandingPage from '../../../src/components/layout/LandingPage';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// BranchIndicator component has been removed as part of single-branch deployment simplification

describe('LandingPage', () => {
  it('can render a simple component', () => {
    // Test if we can render a simple component first
    const SimpleComponent = () => <div data-testid="simple">Hello World</div>;
    render(<SimpleComponent />);
    expect(screen.getByTestId('simple')).toHaveTextContent('Hello World');
  });

  it('renders the main heading', () => {
    render(<LandingPage />);

    // Debug: Let's see what's actually rendered
    screen.debug();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'MITA State Self-Assessment Tool'
    );
  });

  it('displays the tool description', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Assess the maturity of your Medicaid systems/)).toBeInTheDocument();
  });

  it('renders Getting Started navigation link', () => {
    render(<LandingPage />);
    const gettingStartedLink = screen.getByRole('link', { name: 'Get Started' });
    expect(gettingStartedLink).toBeInTheDocument();
    expect(gettingStartedLink).toHaveAttribute('href', '/dashboard');
  });

  it('renders About MITA navigation link', () => {
    render(<LandingPage />);
    const aboutMitaLink = screen.getByRole('link', { name: 'About MITA' });
    expect(aboutMitaLink).toBeInTheDocument();
    expect(aboutMitaLink).toHaveAttribute(
      'href',
      'https://cmsgov.github.io/Medicaid-Information-Technology-Architecture-MITA-4/'
    );
  });

  it('displays key features section', () => {
    render(<LandingPage />);
    expect(screen.getByText('Key Features')).toBeInTheDocument();
    expect(screen.getByText('Capability-Based Assessment')).toBeInTheDocument();
    expect(screen.getByText('Local Data Storage')).toBeInTheDocument();
    expect(screen.getByText('Guided Workflow')).toBeInTheDocument();
    expect(screen.getByText('Actionable Reports')).toBeInTheDocument();
  });

  it('has proper accessibility structure', () => {
    render(<LandingPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(9); // Main heading + features heading + 4 feature headings + 2 screen reader headings + alert heading
  });

  it('includes browser-based tool information', () => {
    render(<LandingPage />);
    expect(screen.getByText('Browser-Based Tool')).toBeInTheDocument();
    expect(screen.getByText(/works entirely in your browser/)).toBeInTheDocument();
  });
});
