import { describe, expect, it } from 'vitest'
import { formatHuntsvilleDateTime } from './huntsville'

describe('Huntsville date and time', () => {
  it('uses two-digit 12-hour Central time and MM/DD/YYYY', () => {
    expect(formatHuntsvilleDateTime(new Date('2026-07-18T12:05:00Z'))).toBe('07:05 AM 07/18/2026')
  })
})
