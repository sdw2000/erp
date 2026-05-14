export const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'

function toDate(input) {
  if (input instanceof Date) return input
  if (input === null || input === undefined || input === '') return new Date()
  if (typeof input === 'number') return new Date(input)
  const text = String(input).trim()
  if (!text) return new Date()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00`)
  }
  return new Date(text)
}

function formatParts(input, withTime = true) {
  const date = toDate(input)
  const options = withTime
    ? {
        timeZone: SHANGHAI_TIME_ZONE,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }
    : {
        timeZone: SHANGHAI_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
  const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(date)
  const map = {}
  parts.forEach(p => {
    if (p.type !== 'literal') map[p.type] = p.value
  })
  return map
}

export function formatShanghaiDateTime(input) {
  const m = formatParts(input, true)
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`
}

export function formatShanghaiDate(input) {
  const m = formatParts(input, false)
  return `${m.year}-${m.month}-${m.day}`
}

export function todayInShanghai() {
  return formatShanghaiDate(new Date())
}

export function dateStampInShanghai() {
  const m = formatParts(new Date(), false)
  return `${m.year}${m.month}${m.day}`
}
