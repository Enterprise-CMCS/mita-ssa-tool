import { useEffect, useCallback, useRef } from 'react';

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  trapFocus?: boolean;
  skipLinks?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusableElements = useRef<HTMLElement[]>([]);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) {
      return [];
    }

    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(selectors)) as HTMLElement[];
  }, []);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (!options.trapFocus || e.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },
    [options.trapFocus, getFocusableElements]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (options.onEscape) {
            e.preventDefault();
            options.onEscape();
          }
          break;
        case 'Enter':
          if (options.onEnter && e.target === containerRef.current) {
            e.preventDefault();
            options.onEnter();
          }
          break;
        case 'ArrowUp':
          if (options.onArrowKeys) {
            e.preventDefault();
            options.onArrowKeys('up');
          }
          break;
        case 'ArrowDown':
          if (options.onArrowKeys) {
            e.preventDefault();
            options.onArrowKeys('down');
          }
          break;
        case 'ArrowLeft':
          if (options.onArrowKeys) {
            e.preventDefault();
            options.onArrowKeys('left');
          }
          break;
        case 'ArrowRight':
          if (options.onArrowKeys) {
            e.preventDefault();
            options.onArrowKeys('right');
          }
          break;
        case 'Tab':
          trapFocus(e);
          break;
      }
    },
    [options, trapFocus]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('keydown', handleKeyDown);
    focusableElements.current = getFocusableElements();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, getFocusableElements]);

  const setFocus = useCallback((element: HTMLElement) => {
    element.focus();
  }, []);

  const restoreFocus = useCallback(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [getFocusableElements]);

  return {
    containerRef,
    setFocus,
    restoreFocus,
    getFocusableElements,
  };
};
