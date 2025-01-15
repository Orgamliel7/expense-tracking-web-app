import { useEffect } from 'react';

interface KeyboardShortcutParams {
  onEnter?: () => void;
  onEscape?: () => void;
  inputRefs?: React.RefObject<HTMLInputElement>[];
}

export const useKeyboardShortcuts = ({
  onEnter,
  onEscape,
  inputRefs = [],
}: KeyboardShortcutParams) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onEnter) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused = inputRefs.some(
          (ref) => ref.current && ref.current === activeElement
        );
        
        if (isInputFocused) {
          e.preventDefault();
          onEnter();
        }
      }

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape, inputRefs]);
};