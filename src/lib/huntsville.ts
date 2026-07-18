const HUNTSVILLE_TIME_ZONE = 'America/Chicago'

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: HUNTSVILLE_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: HUNTSVILLE_TIME_ZONE,
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
})

export function formatHuntsvilleDateTime(value: Date) {
  return `${timeFormatter.format(value)} ${dateFormatter.format(value)}`
}

export { HUNTSVILLE_TIME_ZONE }
