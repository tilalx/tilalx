import darkVs      from './vendor/dark_vs.json'
import darkPlus    from './vendor/dark_plus.json'
import darkModern  from './vendor/dark_modern.json'
import lightVs     from './vendor/light_vs.json'
import lightPlus   from './vendor/light_plus.json'
import lightModern from './vendor/light_modern.json'

interface TokenRule { scope?: string | string[]; settings: { foreground?: string; background?: string; fontStyle?: string } }
interface ThemeFile { name: string; include?: string; colors?: Record<string, string>; tokenColors?: TokenRule[] }

export interface ResolvedTheme {
  id: ThemeId
  label: string
  type: 'dark' | 'light'
  colors: Record<string, string>
  tokenColors: TokenRule[]
}

export type ThemeId = 'dark-modern' | 'light-modern'

const FILES: Record<string, ThemeFile> = {
  './dark_vs.json': darkVs, './dark_plus.json': darkPlus, './dark_modern.json': darkModern,
  './light_vs.json': lightVs, './light_plus.json': lightPlus, './light_modern.json': lightModern,
}

/**
 * Colors VS Code's color registry supplies when a theme doesn't set them, read from the
 * reference workbench (openvscode-server 1.105) with each theme active. The gitDecoration.*
 * values are VS Code's documented defaults: the workbench only emits them once a file is decorated.
 */
const REGISTRY_DEFAULTS: Record<'dark' | 'light', Record<string, string>> = {
  dark: {
    'list.hoverBackground': '#2a2d2e', 'list.activeSelectionBackground': '#04395e', 'list.inactiveSelectionBackground': '#37373d',
    'list.focusOutline': '#0078d4', 'tree.indentGuidesStroke': '#585858', 'tree.inactiveIndentGuidesStroke': 'rgba(88, 88, 88, 0.4)',
    'commandCenter.background': 'rgba(255, 255, 255, 0.05)', 'commandCenter.border': 'rgba(204, 204, 204, 0.2)',
    'commandCenter.activeBackground': 'rgba(255, 255, 255, 0.08)', 'commandCenter.foreground': '#cccccc',
    'quickInputList.focusBackground': '#04395e', 'widget.shadow': 'rgba(0, 0, 0, 0.36)',
    'scrollbarSlider.background': 'rgba(121, 121, 121, 0.4)', 'scrollbarSlider.hoverBackground': 'rgba(100, 100, 100, 0.7)',
    'scrollbarSlider.activeBackground': 'rgba(191, 191, 191, 0.4)', 'scrollbar.shadow': '#000000',
    'toolbar.hoverBackground': 'rgba(90, 93, 94, 0.31)', 'toolbar.activeBackground': 'rgba(99, 102, 103, 0.31)',
    'breadcrumb.foreground': 'rgba(204, 204, 204, 0.8)', 'breadcrumb.focusForeground': '#e0e0e0',
    'statusBarItem.hoverBackground': 'rgba(241, 241, 241, 0.2)', 'statusBarItem.remoteHoverBackground': 'rgba(255, 255, 255, 0.12)',
    'menu.selectionBackground': '#0078d4', 'menu.selectionForeground': '#ffffff', 'menu.separatorBackground': '#454545',
    'editorGroup.border': 'rgba(255, 255, 255, 0.09)', 'sash.hoverBorder': '#0078d4',
    'gitDecoration.modifiedResourceForeground': '#e2c08d', 'gitDecoration.untrackedResourceForeground': '#73c991',
    'gitDecoration.addedResourceForeground': '#81b88b', 'gitDecoration.deletedResourceForeground': '#c74e39',
    'list.highlightForeground': '#2aaaff', 'list.focusHighlightForeground': '#2aaaff',
    'pickerGroup.border': '#3c3c3c', 'pickerGroup.foreground': '#3794ff',
    'keybindingLabel.background': 'rgba(128, 128, 128, 0.17)', 'keybindingLabel.foreground': '#cccccc',
    'keybindingLabel.border': 'rgba(51, 51, 51, 0.6)', 'keybindingLabel.bottomBorder': 'rgba(68, 68, 68, 0.6)',
    'editorWidget.background': '#202020', 'editorWidget.border': '#454545', 'icon.foreground': '#cccccc',
    'welcomePage.tileHoverBackground': '#262626', 'button.secondaryHoverBackground': '#3c3c3c',
    'welcomePage.tileBorder': 'rgba(255, 255, 255, 0.1)', 'checkbox.foreground': '#cccccc', 'inputOption.activeForeground': '#ffffff',
  },
  light: {
    'list.hoverBackground': '#f2f2f2', 'list.activeSelectionBackground': '#e8e8e8', 'list.inactiveSelectionBackground': '#e4e6f1',
    'list.focusOutline': '#005fb8', 'tree.indentGuidesStroke': '#a9a9a9', 'tree.inactiveIndentGuidesStroke': 'rgba(169, 169, 169, 0.4)',
    'commandCenter.background': 'rgba(0, 0, 0, 0.05)', 'commandCenter.border': 'rgba(30, 30, 30, 0.2)',
    'commandCenter.activeBackground': 'rgba(0, 0, 0, 0.08)', 'commandCenter.foreground': '#1e1e1e',
    'quickInputList.focusBackground': '#e8e8e8', 'widget.shadow': 'rgba(0, 0, 0, 0.16)',
    'scrollbarSlider.background': 'rgba(100, 100, 100, 0.4)', 'scrollbarSlider.hoverBackground': 'rgba(100, 100, 100, 0.7)',
    'scrollbarSlider.activeBackground': 'rgba(0, 0, 0, 0.6)', 'scrollbar.shadow': '#dddddd',
    'toolbar.hoverBackground': 'rgba(184, 184, 184, 0.31)', 'toolbar.activeBackground': 'rgba(166, 166, 166, 0.31)',
    'breadcrumb.foreground': 'rgba(59, 59, 59, 0.8)', 'breadcrumb.focusForeground': '#2f2f2f',
    'statusBarItem.hoverBackground': 'rgba(31, 31, 31, 0.07)', 'statusBarItem.remoteHoverBackground': 'rgba(31, 31, 31, 0.07)',
    'menu.selectionBackground': '#005fb8', 'menu.selectionForeground': '#ffffff', 'menu.separatorBackground': '#d4d4d4',
    'editorGroup.border': '#e5e5e5', 'sash.hoverBorder': '#005fb8',
    'gitDecoration.modifiedResourceForeground': '#895503', 'gitDecoration.untrackedResourceForeground': '#007100',
    'gitDecoration.addedResourceForeground': '#587c0c', 'gitDecoration.deletedResourceForeground': '#ad0707',
    'list.highlightForeground': '#0066bf', 'list.focusHighlightForeground': '#0066bf',
    'pickerGroup.border': '#e5e5e5', 'pickerGroup.foreground': '#8b949e',
    'keybindingLabel.background': 'rgba(221, 221, 221, 0.4)', 'keybindingLabel.foreground': '#3b3b3b',
    'keybindingLabel.border': 'rgba(204, 204, 204, 0.4)', 'keybindingLabel.bottomBorder': 'rgba(187, 187, 187, 0.4)',
    'editorWidget.background': '#f8f8f8', 'editorWidget.border': '#c8c8c8', 'icon.foreground': '#3b3b3b',
    'welcomePage.tileHoverBackground': '#dfdfdf', 'button.secondaryHoverBackground': '#cccccc',
    'welcomePage.tileBorder': 'rgba(0, 0, 0, 0.1)', 'checkbox.foreground': '#3b3b3b',
    // Light Modern leaves the menu to the registry, which derives it from the dropdown colors.
    'menu.background': '#ffffff', 'menu.foreground': '#3b3b3b',
  },
}

function resolve(file: ThemeFile): Omit<ResolvedTheme, 'id' | 'label' | 'type'> {
  const parent = file.include ? resolve(FILES[file.include]) : { colors: {}, tokenColors: [] }
  return {
    colors:      { ...parent.colors, ...file.colors },
    tokenColors: [...parent.tokenColors, ...(file.tokenColors ?? [])],
  }
}

/** `rgba(…)` → `#rrggbbaa`. Monaco only parses hex colors (anything else turns red); CSS takes both. */
function toHex(color: string): string {
  const m = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(color)
  if (!m) return color.toLowerCase()
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  const alpha = m[4] === undefined ? '' : hex(Number(m[4]) * 255)
  return `#${hex(+m[1])}${hex(+m[2])}${hex(+m[3])}${alpha === 'ff' ? '' : alpha}`
}

function build(id: ThemeId, label: string, type: 'dark' | 'light', file: ThemeFile): ResolvedTheme {
  const { colors, tokenColors } = resolve(file)
  const merged = { ...REGISTRY_DEFAULTS[type], ...colors }
  return { id, label, type, colors: Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, toHex(v)])), tokenColors }
}

export const THEMES: Record<ThemeId, ResolvedTheme> = {
  'dark-modern':  build('dark-modern',  'Dark Modern',  'dark',  darkModern),
  'light-modern': build('light-modern', 'Light Modern', 'light', lightModern),
}

/** `editor.background` → `--vscode-editor-background`, the same variable names VS Code uses. */
export function themeCssVars(theme: ResolvedTheme): Record<string, string> {
  return Object.fromEntries(Object.entries(theme.colors).map(([k, v]) => [`--vscode-${k.replace(/\./g, '-')}`, v]))
}
