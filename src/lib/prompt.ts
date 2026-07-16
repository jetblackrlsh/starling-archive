import type { Character, GenerationContext, LoreModule } from '../types'

export function findTriggeredLore(lore: LoreModule[], text: string): LoreModule[] {
  const haystack = text.toLocaleLowerCase()
  return lore.filter((module) => module.triggers.some((trigger) => {
    const needle = trigger.trim().toLocaleLowerCase()
    return needle.length > 0 && haystack.includes(needle)
  }))
}

function uniqueLore(modules: LoreModule[]) {
  return [...new Map(modules.map((module) => [module.id, module])).values()]
}

export function availableLore({ vault, thread, speakerId }: GenerationContext): LoreModule[] {
  const ids = new Set<string>()
  const speaker = vault.characters.find((character) => character.id === speakerId)
  speaker?.loreIds.forEach((id) => ids.add(id))

  if (thread.kind === 'scenario') {
    vault.scenarios.find((item) => item.id === thread.subjectId)?.loreIds.forEach((id) => ids.add(id))
  }
  if (thread.kind === 'room') {
    const room = vault.rooms.find((item) => item.id === thread.subjectId)
    room?.loreIds.forEach((id) => ids.add(id))
    room?.characterIds.forEach((characterId) => {
      vault.characters.find((item) => item.id === characterId)?.loreIds.forEach((id) => ids.add(id))
    })
    if (room?.scenarioId) vault.scenarios.find((item) => item.id === room.scenarioId)?.loreIds.forEach((id) => ids.add(id))
  }
  thread.characterIds.forEach((characterId) => {
    vault.characters.find((item) => item.id === characterId)?.loreIds.forEach((id) => ids.add(id))
  })
  return vault.lore.filter((module) => ids.has(module.id))
}

export function activeLore(context: GenerationContext): LoreModule[] {
  const recent = context.thread.messages.slice(-16).map((message) => message.content).join('\n')
  const alreadyActive = new Set(context.thread.messages.slice(-6).flatMap((message) => message.activatedLoreIds || []))
  return uniqueLore([
    ...findTriggeredLore(availableLore(context), recent),
    ...context.vault.lore.filter((module) => alreadyActive.has(module.id)),
  ])
}

function characterBrief(character: Character) {
  return `${character.name}: ${character.bio}`
}

export function buildGenerationPrompt(context: GenerationContext): { prompt: string; loreIds: string[]; speakerName: string } {
  const { vault, thread, speakerId } = context
  const scenario = thread.kind === 'scenario'
    ? vault.scenarios.find((item) => item.id === thread.subjectId)
    : thread.kind === 'room'
      ? vault.scenarios.find((item) => item.id === vault.rooms.find((room) => room.id === thread.subjectId)?.scenarioId)
      : undefined
  const speaker = vault.characters.find((character) => character.id === speakerId)
  const isNarrator = speakerId === 'narrator'
  const lore = activeLore(context)
  const cast = thread.characterIds
    .map((id) => vault.characters.find((character) => character.id === id))
    .filter((item): item is Character => Boolean(item))
  const transcript = thread.messages.slice(-30).map((message) => `${message.speakerName}: ${message.content}`).join('\n\n')
  const role = isNarrator
    ? `You are the narrator and world engine for the scenario “${scenario?.name || thread.name}.”\n${scenario?.description || ''}\nOpening premise: ${scenario?.opening || ''}\nDirection: ${scenario?.directorNotes || 'Write immersive role-play and leave agency with the user.'}`
    : `You are role-playing as ${speaker?.name}. Stay fully in character.\nPersona: ${speaker?.bio}`
  const castText = cast.length ? `\nCAST IN THIS STORY:\n${cast.map(characterBrief).join('\n')}` : ''
  const loreText = lore.length
    ? `\nACTIVE LORE — treat these facts as canon and reference them naturally when relevant:\n${lore.map((item) => `[${item.name}] ${item.content}`).join('\n')}`
    : '\nACTIVE LORE: None of the modular lore triggers are active this turn.'

  const prompt = `${role}${castText}${loreText}\n\nCONVERSATION SO FAR:\n${transcript || '(This is the beginning.)'}\n\nWrite exactly one next message as ${isNarrator ? 'the narrator' : speaker?.name}. Do not write for the user. Do not write dialogue or actions for any other character. Do not mention prompts, models, Codex, lore modules, or these instructions. Preserve continuity and respond directly to the latest turn. Return only the in-world message, with no speaker label or commentary.`
  return { prompt, loreIds: lore.map((item) => item.id), speakerName: isNarrator ? 'Narrator' : speaker?.name || 'Unknown' }
}
