/**
 * Utility for dynamic imports with proper TypeScript typing
 */

import type { ComponentType, LazyExoticComponent } from 'react';
import React, { lazy, Suspense } from 'react';

/**
 * Dynamically import a component
 * @param importFn Function that returns a dynamic import
 * @returns Lazy loaded component
 */
export function dynamicImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(importFn);
}

/**
 * Wrapper component for lazy loaded components
 * @param props Component props
 * @returns Suspense wrapped component
 */
export function LazyComponent<T>(
  props: {
    component: LazyExoticComponent<ComponentType<T>>;
    fallback?: React.ReactNode;
  } & T
): JSX.Element {
  const { component, fallback = React.createElement('div', null, 'Loading...'), ...rest } = props;

  return React.createElement(Suspense, { fallback }, React.createElement(component, rest as any));
}

/**
 * Create a lazy loaded component with suspense
 * @param importFn Function that returns a dynamic import
 * @param fallback Fallback component to show while loading
 * @returns Function that returns a lazy loaded component
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComp = dynamicImport(importFn);

  return function (props: any): JSX.Element {
    return React.createElement(LazyComponent, {
      component: LazyComp,
      fallback,
      ...props,
    });
  };
}
