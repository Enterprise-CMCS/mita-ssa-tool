/**
 * Layout component accessibility tests
 *
 * Uses vitest-axe to automatically check for WCAG violations.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import Layout from './Layout';
import { DRAFT_BANNER_LANDMARK_LABEL, DRAFT_BANNER_FULL_LANDMARK_LABEL } from './DraftBanner';
import { DRAFT_NOTICE_LABEL, DRAFT_TITLE_MARKER } from '../../constants';

/**
 * Helper to render Layout with required providers
 */
function renderLayout(
  children: React.ReactNode = <div>Test content</div>
): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <Layout>{children}</Layout>
    </BrowserRouter>
  );
}

describe('Layout accessibility', () => {
  it('should have no critical accessibility violations', async () => {
    const { container } = renderLayout();

    // `region` and `landmark-one-main` used to be suppressed here with comments
    // saying the skip link was missing and main needed a label. Both have since
    // been implemented, and the draft banner is a labelled landmark, so the whole
    // ruleset passes and the suppressions have been removed.
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('should have proper navigation structure', async () => {
    const { container } = renderLayout();

    const results = await axe(container, {
      runOnly: ['navigation', 'landmark'],
    });

    // Previously allowed up to 2 violations with a comment saying it was expected
    // to fail. It passes cleanly now, so the tolerance is gone — a regression here
    // should fail rather than be absorbed by the budget.
    expect(results).toHaveNoViolations();
  });
});

describe('Layout structure', () => {
  it('should render main content area', () => {
    const { container } = renderLayout(<div data-testid="content">Hello</div>);

    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('should render navigation', () => {
    const { getByRole } = renderLayout();

    // Navigation should be present (AppBar is now a nav element)
    const nav = getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
  });

  it('should have skip link', () => {
    const { getByText } = renderLayout();

    const skipLink = getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('should have main content with correct id', () => {
    const { container } = renderLayout();

    const main = container.querySelector('#main-content');
    expect(main).toBeInTheDocument();
    expect(main?.tagName.toLowerCase()).toBe('main');
  });
});

describe('Layout draft banner', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
    vi.resetModules();
    vi.doUnmock('../../constants');
  });

  it('shows both notices on every page while draft mode is on', () => {
    renderLayout();

    // CMS requires a top and a bottom notice, so both landmarks must be present on
    // every page — not one or the other.
    expect(screen.getByRole('region', { name: DRAFT_BANNER_LANDMARK_LABEL })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: DRAFT_BANNER_FULL_LANDMARK_LABEL })
    ).toBeInTheDocument();
    expect(screen.getAllByText(DRAFT_NOTICE_LABEL)).toHaveLength(2);
  });

  it('puts the top notice between the navigation and the main content', () => {
    const { container } = renderLayout();

    // Document order is the whole accessibility argument for a plain landmark
    // instead of a live region, so it is worth pinning rather than assuming.
    const banner = screen.getByRole('region', { name: DRAFT_BANNER_LANDMARK_LABEL });
    const nav = container.querySelector('nav');
    const main = container.querySelector('main');

    expect(nav).not.toBeNull();
    expect(main).not.toBeNull();
    expect(nav!.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.compareDocumentPosition(main!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the bottom notice after the main content, above the footer', () => {
    const { container } = renderLayout();

    // It sits outside <main> on purpose: <main> scrolls on most pages and is
    // overflow:hidden on the assessment page, so a notice inside it would either
    // scroll away or be unreachable.
    const banner = screen.getByRole('region', { name: DRAFT_BANNER_FULL_LANDMARK_LABEL });
    const main = container.querySelector('main');
    const footer = container.querySelector('footer');

    expect(main).not.toBeNull();
    expect(main!.contains(banner)).toBe(false);
    expect(main!.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (footer) {
      expect(
        banner.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it('marks the document title so skip-link users still hear it', () => {
    renderLayout();

    // The short marker, not the 29-character banner label.
    expect(document.title).toContain(`(${DRAFT_TITLE_MARKER})`);
  });

  it('does not duplicate the title marker across re-renders', () => {
    const { unmount } = renderLayout();
    unmount();
    renderLayout();

    expect(document.title.match(new RegExp(`\\(${DRAFT_TITLE_MARKER}\\)`, 'g'))).toHaveLength(1);
  });

  it('renders nothing when draft mode is switched off for go-live', async () => {
    vi.resetModules();
    vi.doMock('../../constants', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../constants')>()),
      IS_DRAFT: false,
    }));

    const { default: FreshLayout } = await import('./Layout');
    render(
      <BrowserRouter>
        <FreshLayout>
          <div>Test content</div>
        </FreshLayout>
      </BrowserRouter>
    );

    // Both notices must go, not just the top one.
    expect(screen.queryByText(DRAFT_NOTICE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: DRAFT_BANNER_LANDMARK_LABEL })).toBeNull();
    expect(screen.queryByRole('region', { name: DRAFT_BANNER_FULL_LANDMARK_LABEL })).toBeNull();
    expect(screen.queryByText(/Paperwork Reduction Act/)).not.toBeInTheDocument();
    // The title must not be marked either
    expect(document.title).not.toContain(`(${DRAFT_TITLE_MARKER})`);
  });
});
