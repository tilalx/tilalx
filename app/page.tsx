import { cookies } from 'next/headers'
import Workbench from './workbench/Workbench'
import { loadWorkbenchData } from './workbench/server'
import { SETTINGS_COOKIE, parseSettings } from './workbench/settings'

export default async function HomePage() {
  const [data, cookieStore] = await Promise.all([loadWorkbenchData(), cookies()])
  return <Workbench data={data} initialSettings={parseSettings(cookieStore.get(SETTINGS_COOKIE)?.value)} />
}
