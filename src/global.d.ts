import type { CodexStatus, Vault } from './types'

declare global {
  interface Window {
    starling: {
      database: {
        load: () => Promise<Vault | null>
        save: (vault: Vault) => Promise<boolean>
        export: () => Promise<string | null>
        import: () => Promise<Vault | null>
      }
      codex: {
        status: () => Promise<CodexStatus>
        chooseBinary: () => Promise<string | null>
        setBinary: (path: string) => Promise<boolean>
        generate: (request: { prompt: string }) => Promise<{ text: string; model: string; reasoning: string }>
      }
      app: {
        platform: string
        version: () => Promise<string>
        openExternal: (url: string) => Promise<boolean>
      }
    }
  }
}

export {}
