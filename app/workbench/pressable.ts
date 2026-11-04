import type { KeyboardEvent } from 'react'

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
