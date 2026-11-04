import type { KeyboardEvent } from 'react'

/**
 * Props that make a non-button element clickable from the keyboard too: focusable, and Enter or
 * Space runs it. List rows keep their tree/list role; anything else becomes a button.
 */
export function pressable(run: () => void, role: string = 'button') {
  return {
    role,
    tabIndex: 0,
    onClick: run,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); run() }
    },
  }
}
