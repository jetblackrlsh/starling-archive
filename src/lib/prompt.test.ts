import { describe, expect, it } from 'vitest'
import { initialVault } from '../data'
import type { StoryThread } from '../types'
import { activeLore, buildGenerationPrompt, findTriggeredLore } from './prompt'

const thread = (content: string): StoryThread => ({
  id: 'thread_test', name: 'Test', kind: 'character', subjectId: 'character_lyra', characterIds: ['character_lyra'],
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
  messages: [{ id: 'm1', role: 'user', speakerName: 'Traveler', content, createdAt: '2026-01-01' }],
})

describe('lore activation', () => {
  it('matches triggers case-insensitively', () => {
    const vault = initialVault()
    expect(findTriggeredLore(vault.lore, 'We follow the ASTRAL TIDE.').map((item) => item.id)).toContain('lore_astral_tide')
  })

  it('only activates lore available to the conversation', () => {
    const vault = initialVault()
    const context = { vault, thread: thread('I found the gold key.'), speakerId: 'character_lyra' }
    expect(activeLore(context).map((item) => item.id)).toEqual(['lore_morrow_key'])
  })

  it('builds a single-speaker prompt with model-safe boundaries', () => {
    const vault = initialVault()
    const result = buildGenerationPrompt({ vault, thread: thread('Tell me about the new moon.'), speakerId: 'character_lyra' })
    expect(result.speakerName).toBe('Lyra Vale')
    expect(result.loreIds).toContain('lore_astral_tide')
    expect(result.prompt).toContain('Do not write for the user')
    expect(result.prompt).toContain('Return only the in-world message')
  })
})
