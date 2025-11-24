import type { ReactElement } from 'react';
import React from 'react';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { RenderOptions } from '@testing-library/react';

// Add any providers that components need during testing
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };
