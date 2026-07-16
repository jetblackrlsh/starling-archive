import type { Vault } from './types'

const now = new Date().toISOString()

export const colors = ['#8174f2', '#54a8ff', '#b97ae8', '#d5a94e', '#64c9be', '#e06e9f']

export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

export const initialVault = (): Vault => ({
  schemaVersion: 1,
  userName: 'Traveler',
  lore: [
    {
      id: 'lore_astral_tide',
      name: 'The Astral Tide',
      summary: 'A silver current that carries memories between distant worlds.',
      content: 'The Astral Tide is a luminous current between worlds. It grows strongest beneath a new moon and carries fragments of memory in its silver water. Tidekeepers can hear those memories by touching the current, but every memory taken leaves one of their own behind.',
      triggers: ['Astral Tide', 'silver current', 'Tidekeeper', 'new moon'],
      tags: ['cosmic', 'magic', 'location'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'lore_morrow_key',
      name: 'The Morrow Key',
      summary: 'A gold key said to unlock a door into tomorrow.',
      content: 'The Morrow Key is an old gold key engraved with seven tiny stars. It does not open ordinary locks. At dawn, it can reveal a door to one possible tomorrow, though the traveler may return to find the present subtly changed.',
      triggers: ['Morrow Key', 'gold key', 'seven stars'],
      tags: ['artifact', 'mystery'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  characters: [
    {
      id: 'character_lyra',
      name: 'Lyra Vale',
      bio: 'Lyra is a warm, sharp-witted cartographer of impossible places. She speaks with lyrical precision, notices small emotional details, and masks her fear of being forgotten with playful confidence. She never breaks character and treats the user as a trusted traveling companion.',
      greeting: '*Lyra folds a star-chart that seems much larger than the table.* There you are. I found a road that wasn\'t here yesterday—and I have a feeling it was waiting for us. Shall we see where it leads?',
      color: '#8174f2',
      loreIds: ['lore_astral_tide', 'lore_morrow_key'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'character_orin',
      name: 'Orin Moss',
      bio: 'Orin is a patient historian and former royal spy. He is understated, dryly funny, and relentlessly observant. He prefers questions to declarations and knows when silence is more powerful than speech.',
      greeting: 'Orin closes the weathered book in his hands. “You took your time. Good. Haste has ruined more mysteries than ignorance ever did.”',
      color: '#d5a94e',
      loreIds: ['lore_morrow_key'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  scenarios: [
    {
      id: 'scenario_meridian',
      name: 'The Last Observatory',
      description: 'Explore a silent observatory at the edge of a world where tomorrow has stopped arriving.',
      opening: 'The final sunset has lingered for three days. High above the sleeping city, the abandoned Meridian Observatory turns its brass dome toward a star that should not exist. You arrive as the front doors unlock themselves.',
      directorNotes: 'Write immersive second-person fantasy with mystery, wonder, and meaningful choices. Advance one beat at a time. Never decide the player’s actions or feelings. End with an opening for the player to act, but do not present a numbered menu unless asked.',
      loreIds: ['lore_astral_tide', 'lore_morrow_key'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  rooms: [
    {
      id: 'room_chart_room',
      name: 'The Chart Room',
      description: 'Lyra and Orin compare impossible maps after midnight.',
      characterIds: ['character_lyra', 'character_orin'],
      loreIds: ['lore_astral_tide', 'lore_morrow_key'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  threads: [],
})
