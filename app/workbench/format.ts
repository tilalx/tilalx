/** VS Code's relative time style: "5 mins", "3 hrs", "2 days", "4 wks", "2 mos", "1 yr". */
export function timeAgo(date: string | number | Date): string {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000)
  const units: [number, string, string][] = [
    [60, 'sec', 'secs'], [60, 'min', 'mins'], [24, 'hr', 'hrs'], [7, 'day', 'days'], [4.345, 'wk', 'wks'], [12, 'mo', 'mos'], [Infinity, 'yr', 'yrs'],
  ]
  let v = s
  for (const [step, one, many] of units) {
    if (v < step) { const n = Math.floor(v); return n <= 0 && one === 'sec' ? 'now' : `${n} ${n === 1 ? one : many}` }
    v /= step
  }
  return ''
}
