import type { CSSProperties, HTMLAttributes } from 'react'
import { setiIcon } from './languages'

interface CodiconProps extends HTMLAttributes<HTMLSpanElement> { name: string; size?: number }

export function Codicon({ name, size, className = '', style, ...rest }: CodiconProps) {
  const s: CSSProperties | undefined = size ? { ...style, fontSize: size } : style
  return <span aria-hidden="true" className={`codicon codicon-${name} ${className}`} style={s} {...rest} />
}

export function FileIcon({ path, light = false, className = '' }: { path: string; light?: boolean; className?: string }) {
  const { char, color } = setiIcon(path, light)
  return <span aria-hidden="true" className={`seti-icon ${className}`} style={{ color }}>{char}</span>
}
