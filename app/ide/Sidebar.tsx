'use client'

import ExplorerPanel, { type ExplorerPanelProps } from './sidebar/ExplorerPanel'
import SearchPanel from './sidebar/SearchPanel'
import SourceControlPanel from './sidebar/SourceControlPanel'
import ExtensionsPanel from './sidebar/ExtensionsPanel'
import type { Commit, StackItem } from './types'

export interface SidebarProps extends ExplorerPanelProps {
  activityView:   string
  stack:          StackItem[]
  commits:        Commit[]
  commitsLoading: boolean
}

export default function Sidebar({ activityView, stack, commits, commitsLoading, ...explorer }: SidebarProps) {
  const { repos, onTabChange, fileContents, onOpenFile } = explorer
  if (activityView === 'search')     return <SearchPanel repos={repos} stack={stack} onTabChange={onTabChange} fileContents={fileContents} onOpenFile={onOpenFile} />
  if (activityView === 'git')        return <SourceControlPanel commits={commits} loading={commitsLoading} />
  if (activityView === 'extensions') return <ExtensionsPanel stack={stack} />
  return <ExplorerPanel {...explorer} />
}
