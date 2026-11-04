'use client'

import { useWorkbench } from '../context'
import Explorer from '../views/Explorer'
import Search from '../views/Search'
import SourceControl from '../views/SourceControl'
import RunAndDebug from '../views/RunAndDebug'
import Extensions from '../views/Extensions'

export default function Sidebar() {
  const { sidebar } = useWorkbench()
  switch (sidebar.view) {
    case 'explorer':   return <Explorer />
    case 'search':     return <Search />
    case 'scm':        return <SourceControl />
    case 'run':        return <RunAndDebug />
    case 'extensions': return <Extensions />
  }
}
