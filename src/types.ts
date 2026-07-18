export type ThreadKind = 'character' | 'scenario' | 'room'

export interface Character {
  id: string
  name: string
  bio: string
  greeting: string
  color: string
  loreIds: string[]
  createdAt: string
  updatedAt: string
}

export interface LoreModule {
  id: string
  name: string
  summary: string
  content: string
  triggers: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  opening: string
  directorNotes: string
  loreIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Room {
  id: string
  name: string
  description: string
  characterIds: string[]
  loreIds: string[]
  scenarioId?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  speakerId?: string
  speakerName: string
  content: string
  createdAt: string
  activatedLoreIds?: string[]
}

export interface StoryThread {
  id: string
  name: string
  kind: ThreadKind
  subjectId: string
  characterIds: string[]
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface Vault {
  schemaVersion: 1
  userName: string
  characters: Character[]
  lore: LoreModule[]
  scenarios: Scenario[]
  rooms: Room[]
  threads: StoryThread[]
}

export interface CodexStatus {
  available: boolean
  authenticated: boolean
  binary: string
  version: string
  detail: string
}

export interface AppInfo {
  version: string
  platform: string
  arch: string
  packaged: boolean
}

export interface WeatherInfo {
  location: string
  timeZone: string
  temperature: number
  temperatureUnit: string
  condition: string
  tone: 'clear' | 'cloud' | 'fog' | 'rain' | 'storm' | 'snow' | 'ice' | 'unknown'
  isDay: boolean
  observedAt: string
  fetchedAt: string
  cached: boolean
  stale?: boolean
}

export interface UpdateProgress {
  phase: 'starting' | 'downloading' | 'verifying' | 'preparing' | 'installing'
  percent?: number
  latestVersion?: string
}

export interface UpdateResult {
  currentVersion: string
  latestVersion: string
  available: boolean
  installing: boolean
  releaseUrl?: string
}

export type NavigationView = 'home' | 'characters' | 'lore' | 'scenarios' | 'rooms' | 'threads' | 'settings' | 'about' | 'chat'

export interface GenerationContext {
  vault: Vault
  thread: StoryThread
  speakerId: string
}
