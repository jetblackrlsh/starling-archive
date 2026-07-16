import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive, ArrowLeft, BookOpen, Bot, Check, ChevronRight, CircleHelp, Compass, Download,
  Feather, FilePlus2, Github, Import, Info, Library, LoaderCircle, MessageCircle, MoreHorizontal,
  Plus, Radio, RefreshCw, Save, Search, Send, Settings, Sparkles, SquarePen, Trash2, Users,
  WandSparkles, X,
} from 'lucide-react'
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { colors, createId, initialVault } from './data'
import { activeLore, buildGenerationPrompt } from './lib/prompt'
import type {
  Character, CodexStatus, LoreModule, Message, NavigationView, Room, Scenario, StoryThread, Vault,
} from './types'

const navItems: { id: NavigationView; label: string; icon: typeof Compass }[] = [
  { id: 'home', label: 'Observatory', icon: Compass },
  { id: 'characters', label: 'Characters', icon: Sparkles },
  { id: 'lore', label: 'Lore Library', icon: Library },
  { id: 'scenarios', label: 'Scenarios', icon: BookOpen },
  { id: 'rooms', label: 'Rooms', icon: Users },
  { id: 'threads', label: 'Threads', icon: MessageCircle },
]

const titles: Record<NavigationView, { eyebrow: string; title: string; description: string }> = {
  home: { eyebrow: 'Your private story studio', title: 'Observatory', description: 'Pick up a conversation or open a new door.' },
  characters: { eyebrow: 'Voices & personas', title: 'Characters', description: 'Create distinct companions with their own voice, history, and greeting.' },
  lore: { eyebrow: 'Shared world memory', title: 'Lore Library', description: 'Build modular knowledge that wakes when its key words appear.' },
  scenarios: { eyebrow: 'Worlds to explore', title: 'Scenarios', description: 'Create living settings for solo adventures or a cast of your characters.' },
  rooms: { eyebrow: 'Directed ensemble chat', title: 'Rooms', description: 'Bring characters together and decide exactly who speaks next.' },
  threads: { eyebrow: 'Saved journeys', title: 'Threads', description: 'Return to every conversation and adventure in your archive.' },
  settings: { eyebrow: 'Local intelligence', title: 'Settings', description: 'Connect Codex and manage your private archive.' },
  about: { eyebrow: 'A field guide', title: 'About Starling Archive', description: 'Everything you need to create characters, worlds, and stories.' },
  chat: { eyebrow: 'Active story', title: 'Conversation', description: '' },
}

function App() {
  const [vault, setVault] = useState<Vault>(initialVault)
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<NavigationView>('home')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ type: 'character' | 'lore' | 'scenario' | 'room'; id?: string } | null>(null)
  const [scenarioStart, setScenarioStart] = useState<string | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.starling.database.load().then((saved) => {
      if (saved) setVault(saved)
      setHydrated(true)
    }).catch(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => { window.starling.database.save(vault).catch(console.error) }, 250)
    return () => window.clearTimeout(saveTimer.current)
  }, [vault, hydrated])

  const openThread = (id: string) => {
    setActiveThreadId(id)
    setView('chat')
  }

  const startCharacter = (character: Character) => {
    const time = new Date().toISOString()
    const thread: StoryThread = {
      id: createId('thread'), name: `Chat with ${character.name}`, kind: 'character', subjectId: character.id,
      characterIds: [character.id], createdAt: time, updatedAt: time,
      messages: character.greeting ? [{
        id: createId('message'), role: 'assistant', speakerId: character.id, speakerName: character.name,
        content: character.greeting, createdAt: time,
      }] : [],
    }
    setVault((current) => ({ ...current, threads: [thread, ...current.threads] }))
    openThread(thread.id)
  }

  const startScenario = (scenario: Scenario, characterIds: string[]) => {
    const time = new Date().toISOString()
    const thread: StoryThread = {
      id: createId('thread'), name: scenario.name, kind: 'scenario', subjectId: scenario.id,
      characterIds, createdAt: time, updatedAt: time,
      messages: [{ id: createId('message'), role: 'assistant', speakerId: 'narrator', speakerName: 'Narrator', content: scenario.opening, createdAt: time }],
    }
    setVault((current) => ({ ...current, threads: [thread, ...current.threads] }))
    setScenarioStart(null)
    openThread(thread.id)
  }

  const startRoom = (room: Room) => {
    const time = new Date().toISOString()
    const thread: StoryThread = {
      id: createId('thread'), name: room.name, kind: 'room', subjectId: room.id,
      characterIds: room.characterIds, createdAt: time, updatedAt: time, messages: [],
    }
    setVault((current) => ({ ...current, threads: [thread, ...current.threads] }))
    openThread(thread.id)
  }

  const deleteEntity = (type: 'character' | 'lore' | 'scenario' | 'room', id: string) => {
    if (!window.confirm('Delete this item? Existing thread messages will be kept.')) return
    setVault((current) => {
      if (type === 'character') return {
        ...current,
        characters: current.characters.filter((item) => item.id !== id),
        rooms: current.rooms.map((room) => ({ ...room, characterIds: room.characterIds.filter((item) => item !== id) })),
        threads: current.threads.map((thread) => ({ ...thread, characterIds: thread.characterIds.filter((item) => item !== id) })),
      }
      if (type === 'lore') return {
        ...current,
        lore: current.lore.filter((item) => item.id !== id),
        characters: current.characters.map((item) => ({ ...item, loreIds: item.loreIds.filter((loreId) => loreId !== id) })),
        scenarios: current.scenarios.map((item) => ({ ...item, loreIds: item.loreIds.filter((loreId) => loreId !== id) })),
        rooms: current.rooms.map((item) => ({ ...item, loreIds: item.loreIds.filter((loreId) => loreId !== id) })),
      }
      if (type === 'scenario') return { ...current, scenarios: current.scenarios.filter((item) => item.id !== id), rooms: current.rooms.map((room) => room.scenarioId === id ? { ...room, scenarioId: undefined } : room) }
      return { ...current, rooms: current.rooms.filter((item) => item.id !== id) }
    })
  }

  if (!hydrated) return <div className="launch-screen"><BrandMark /><LoaderCircle className="spin" size={22} /></div>

  return (
    <div className="app-shell">
      <Starfield />
      <aside className="sidebar">
        <div className="drag-region" />
        <button className="brand-button" onClick={() => setView('home')}><BrandMark /><span><strong>Starling</strong><small>Archive</small></span></button>
        <nav className="primary-nav">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />)}
        </nav>
        <div className="sidebar-bottom">
          <NavButton item={{ id: 'settings', label: 'Settings', icon: Settings }} active={view === 'settings'} onClick={() => setView('settings')} />
          <NavButton item={{ id: 'about', label: 'About & Guide', icon: CircleHelp }} active={view === 'about'} onClick={() => setView('about')} />
          <div className="model-chip"><span className="live-dot" /><div><strong>Luna 5.6</strong><small>Low reasoning</small></div></div>
        </div>
      </aside>
      <main className={`main-content ${view === 'chat' ? 'chat-main' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={view + (activeThreadId || '')} className="view-frame" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .2 }}>
            {view !== 'chat' && <PageHeader view={view} />}
            {view === 'home' && <Home vault={vault} openThread={openThread} startCharacter={startCharacter} startScenario={(id) => setScenarioStart(id)} onNavigate={setView} />}
            {view === 'characters' && <CharactersPage vault={vault} onEdit={(id) => setEditor({ type: 'character', id })} onCreate={() => setEditor({ type: 'character' })} onStart={startCharacter} onDelete={(id) => deleteEntity('character', id)} />}
            {view === 'lore' && <LorePage vault={vault} onEdit={(id) => setEditor({ type: 'lore', id })} onCreate={() => setEditor({ type: 'lore' })} onDelete={(id) => deleteEntity('lore', id)} />}
            {view === 'scenarios' && <ScenariosPage vault={vault} onEdit={(id) => setEditor({ type: 'scenario', id })} onCreate={() => setEditor({ type: 'scenario' })} onStart={(id) => setScenarioStart(id)} onDelete={(id) => deleteEntity('scenario', id)} />}
            {view === 'rooms' && <RoomsPage vault={vault} onEdit={(id) => setEditor({ type: 'room', id })} onCreate={() => setEditor({ type: 'room' })} onStart={startRoom} onDelete={(id) => deleteEntity('room', id)} />}
            {view === 'threads' && <ThreadsPage vault={vault} setVault={setVault} openThread={openThread} />}
            {view === 'settings' && <SettingsPage vault={vault} setVault={setVault} />}
            {view === 'about' && <AboutPage />}
            {view === 'chat' && activeThreadId && <ChatPage vault={vault} setVault={setVault} threadId={activeThreadId} onBack={() => setView('threads')} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {editor && <EntityEditor key={`${editor.type}-${editor.id || 'new'}`} vault={vault} setVault={setVault} type={editor.type} id={editor.id} onClose={() => setEditor(null)} />}
        {scenarioStart && <StartScenarioDialog vault={vault} scenarioId={scenarioStart} onClose={() => setScenarioStart(null)} onStart={startScenario} />}
      </AnimatePresence>
    </div>
  )
}

function Starfield() {
  return <div className="starfield" aria-hidden="true"><div className="stars-a" /><div className="stars-b" /><div className="cosmic-haze" /></div>
}

function BrandMark() {
  return <span className="brand-mark"><Sparkles size={17} strokeWidth={1.7} /></span>
}

function NavButton({ item, active, onClick }: { item: { id: NavigationView; label: string; icon: typeof Compass }; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{active && <motion.span layoutId="nav-indicator" className="nav-indicator" />}</button>
}

function PageHeader({ view }: { view: NavigationView }) {
  const copy = titles[view]
  return <header className="page-header"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></header>
}

function Home({ vault, openThread, startCharacter, startScenario, onNavigate }: {
  vault: Vault; openThread: (id: string) => void; startCharacter: (item: Character) => void; startScenario: (id: string) => void; onNavigate: (view: NavigationView) => void
}) {
  const recent = [...vault.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  return <div className="home-grid">
    <section className="home-hero">
      <div className="orbital-map" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="planet"><Sparkles size={25} /></span></div>
      <div className="hero-copy"><span className="hero-kicker"><span className="live-dot" /> Your archive is ready</span><h2>Every voice.<br />Every world.<br /><em>Yours to direct.</em></h2><p>Create a character, enter a world, or bring an unfinished story back into focus.</p><div className="button-row"><button className="primary-button" onClick={() => onNavigate('characters')}><Plus size={17} /> Create character</button><button className="ghost-button" onClick={() => onNavigate('scenarios')}><Compass size={17} /> Explore scenarios</button></div></div>
    </section>
    <section className="content-section recent-section">
      <SectionTitle eyebrow="Continue" title="Recent threads" action={recent.length ? <button className="text-button" onClick={() => onNavigate('threads')}>View all <ChevronRight size={15} /></button> : undefined} />
      {recent.length ? <div className="thread-strip">{recent.map((thread) => <ThreadRow key={thread.id} thread={thread} vault={vault} onClick={() => openThread(thread.id)} />)}</div> : <EmptyState icon={Feather} title="Your first page is waiting" description="Start a character chat or scenario and it will appear here." />}
    </section>
    <section className="content-section two-column-section">
      <div><SectionTitle eyebrow="Meet someone" title="Characters" /><div className="mini-list">{vault.characters.slice(0, 3).map((character) => <button className="mini-person" key={character.id} onClick={() => startCharacter(character)}><Avatar item={character} /><span><strong>{character.name}</strong><small>{character.bio.slice(0, 74)}…</small></span><MessageCircle size={17} /></button>)}</div></div>
      <div><SectionTitle eyebrow="Step through" title="Scenarios" /><div className="mini-list">{vault.scenarios.slice(0, 3).map((scenario) => <button className="mini-person" key={scenario.id} onClick={() => startScenario(scenario.id)}><span className="scenario-glyph"><Compass size={20} /></span><span><strong>{scenario.name}</strong><small>{scenario.description}</small></span><ChevronRight size={17} /></button>)}</div></div>
    </section>
  </div>
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="section-title"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action}</div>
}

function EntityToolbar({ label, onCreate, onQuery }: { label: string; onCreate: () => void; onQuery: (query: string) => void }) {
  const [query, setQuery] = useState('')
  return <div className="entity-toolbar"><div className="search-box"><Search size={17} /><input aria-label={`Search ${label}`} placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(event) => { setQuery(event.target.value); onQuery(event.target.value.trim().toLowerCase()) }} /></div><button className="primary-button" onClick={onCreate}><Plus size={17} /> New {label.replace(/s$/, '')}</button></div>
}

function CharactersPage({ vault, onEdit, onCreate, onStart, onDelete }: { vault: Vault; onEdit: (id: string) => void; onCreate: () => void; onStart: (item: Character) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const items = vault.characters.filter((item) => `${item.name} ${item.bio}`.toLowerCase().includes(query))
  return <><EntityToolbar label="Characters" onCreate={onCreate} onQuery={setQuery} /><div className="entity-list">{items.map((character) => <article className="entity-row character-row" key={character.id}><Avatar item={character} large /><div className="entity-copy"><div className="entity-heading"><h3>{character.name}</h3><span>{character.loreIds.length} lore {character.loreIds.length === 1 ? 'module' : 'modules'}</span></div><p>{character.bio}</p><blockquote>{character.greeting || 'No default greeting—the user speaks first.'}</blockquote></div><div className="entity-actions"><button className="row-primary" onClick={() => onStart(character)}><MessageCircle size={16} /> Chat</button><IconButton label="Edit" onClick={() => onEdit(character.id)}><SquarePen size={17} /></IconButton><IconButton label="Delete" danger onClick={() => onDelete(character.id)}><Trash2 size={17} /></IconButton></div></article>)}</div></>
}

function LorePage({ vault, onEdit, onCreate, onDelete }: { vault: Vault; onEdit: (id: string) => void; onCreate: () => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const items = vault.lore.filter((item) => `${item.name} ${item.summary} ${item.triggers.join(' ')} ${item.tags.join(' ')}`.toLowerCase().includes(query))
  return <><EntityToolbar label="Lore" onCreate={onCreate} onQuery={setQuery} /><div className="lore-grid">{items.map((lore) => { const connections = vault.characters.filter((item) => item.loreIds.includes(lore.id)).length + vault.scenarios.filter((item) => item.loreIds.includes(lore.id)).length + vault.rooms.filter((item) => item.loreIds.includes(lore.id)).length; return <article className="lore-card" key={lore.id}><div className="lore-top"><span className="lore-icon"><Archive size={20} /></span><div className="hover-actions"><IconButton label="Edit" onClick={() => onEdit(lore.id)}><SquarePen size={16} /></IconButton><IconButton label="Delete" danger onClick={() => onDelete(lore.id)}><Trash2 size={16} /></IconButton></div></div><h3>{lore.name}</h3><p>{lore.summary}</p><div className="trigger-list">{lore.triggers.slice(0, 4).map((trigger) => <span key={trigger}>{trigger}</span>)}</div><footer><span><Radio size={14} /> {connections} connection{connections === 1 ? '' : 's'}</span><button onClick={() => onEdit(lore.id)}>Open <ChevronRight size={14} /></button></footer></article> })}</div></>
}

function ScenariosPage({ vault, onEdit, onCreate, onStart, onDelete }: { vault: Vault; onEdit: (id: string) => void; onCreate: () => void; onStart: (id: string) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const items = vault.scenarios.filter((item) => `${item.name} ${item.description} ${item.opening}`.toLowerCase().includes(query))
  return <><EntityToolbar label="Scenarios" onCreate={onCreate} onQuery={setQuery} /><div className="scenario-list">{items.map((scenario, index) => <article className="scenario-row" key={scenario.id}><div className={`scenario-art art-${index % 3}`}><Compass size={28} /><span>{String(index + 1).padStart(2, '0')}</span></div><div className="scenario-copy"><span className="entity-type">World scenario · {scenario.loreIds.length} lore modules</span><h3>{scenario.name}</h3><p>{scenario.description}</p><blockquote>{scenario.opening}</blockquote></div><div className="entity-actions"><button className="row-primary" onClick={() => onStart(scenario.id)}><WandSparkles size={16} /> Enter world</button><IconButton label="Edit" onClick={() => onEdit(scenario.id)}><SquarePen size={17} /></IconButton><IconButton label="Delete" danger onClick={() => onDelete(scenario.id)}><Trash2 size={17} /></IconButton></div></article>)}</div></>
}

function RoomsPage({ vault, onEdit, onCreate, onStart, onDelete }: { vault: Vault; onEdit: (id: string) => void; onCreate: () => void; onStart: (item: Room) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const items = vault.rooms.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query))
  return <><EntityToolbar label="Rooms" onCreate={onCreate} onQuery={setQuery} /><div className="entity-list">{items.map((room) => <article className="entity-row room-row" key={room.id}><div className="avatar-stack">{room.characterIds.slice(0, 3).map((id, index) => { const character = vault.characters.find((item) => item.id === id); return character ? <Avatar item={character} key={id} style={{ zIndex: 3 - index }} /> : null })}</div><div className="entity-copy"><div className="entity-heading"><h3>{room.name}</h3><span>{room.characterIds.length} speakers</span></div><p>{room.description}</p><div className="cast-line">{room.characterIds.map((id) => vault.characters.find((item) => item.id === id)?.name).filter(Boolean).join(' · ') || 'Add characters to begin'}</div></div><div className="entity-actions"><button className="row-primary" disabled={!room.characterIds.length} onClick={() => onStart(room)}><Users size={16} /> Open room</button><IconButton label="Edit" onClick={() => onEdit(room.id)}><SquarePen size={17} /></IconButton><IconButton label="Delete" danger onClick={() => onDelete(room.id)}><Trash2 size={17} /></IconButton></div></article>)}</div></>
}

function ThreadsPage({ vault, setVault, openThread }: { vault: Vault; setVault: (updater: (value: Vault) => Vault) => void; openThread: (id: string) => void }) {
  const rename = (thread: StoryThread) => { const value = window.prompt('Name this thread', thread.name)?.trim(); if (value) setVault((current) => ({ ...current, threads: current.threads.map((item) => item.id === thread.id ? { ...item, name: value, updatedAt: new Date().toISOString() } : item) })) }
  const remove = (id: string) => { if (window.confirm('Delete this thread and all of its messages?')) setVault((current) => ({ ...current, threads: current.threads.filter((item) => item.id !== id) })) }
  return <div className="thread-page">{vault.threads.length ? [...vault.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((thread) => <div className="thread-management-row" key={thread.id}><ThreadRow thread={thread} vault={vault} onClick={() => openThread(thread.id)} /><div className="thread-controls"><IconButton label="Rename" onClick={() => rename(thread)}><SquarePen size={16} /></IconButton><IconButton label="Delete" danger onClick={() => remove(thread.id)}><Trash2 size={16} /></IconButton></div></div>) : <EmptyState icon={MessageCircle} title="No threads yet" description="Start a character chat, scenario, or room. Every journey is saved automatically." />}</div>
}

function ThreadRow({ thread, vault, onClick }: { thread: StoryThread; vault: Vault; onClick: () => void }) {
  const last = thread.messages.at(-1)
  const icon = thread.kind === 'character' ? Sparkles : thread.kind === 'scenario' ? Compass : Users
  const Icon = icon
  return <button className="thread-row" onClick={onClick}><span className={`thread-icon ${thread.kind}`}><Icon size={19} /></span><span className="thread-copy"><strong>{thread.name}</strong><small>{last ? `${last.speakerName}: ${last.content}` : 'The room is quiet. Begin when you’re ready.'}</small></span><span className="thread-meta"><small>{thread.kind}</small><time>{relativeDate(thread.updatedAt)}</time></span><ChevronRight size={17} /></button>
}

function ChatPage({ vault, setVault, threadId, onBack }: { vault: Vault; setVault: (updater: (value: Vault) => Vault) => void; threadId: string; onBack: () => void }) {
  const thread = vault.threads.find((item) => item.id === threadId)
  const [draft, setDraft] = useState('')
  const [speakerId, setSpeakerId] = useState('narrator')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!thread) return
    setSpeakerId(thread.kind === 'character' ? thread.subjectId : thread.kind === 'room' ? thread.characterIds[0] || 'narrator' : 'narrator')
  }, [threadId])
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [thread?.messages.length, generating])

  if (!thread) return <EmptyState icon={MessageCircle} title="Thread not found" description="It may have been deleted." />
  const speakers = thread.kind === 'character' ? thread.characterIds : thread.kind === 'scenario' ? ['narrator', ...thread.characterIds] : thread.characterIds
  const currentLore = activeLore({ vault, thread, speakerId })

  const generate = async (sourceThread: StoryThread) => {
    setGenerating(true); setError('')
    try {
      const built = buildGenerationPrompt({ vault: { ...vault, threads: vault.threads.map((item) => item.id === sourceThread.id ? sourceThread : item) }, thread: sourceThread, speakerId })
      const response = await window.starling.codex.generate({ prompt: built.prompt })
      const message: Message = { id: createId('message'), role: 'assistant', speakerId, speakerName: built.speakerName, content: response.text, activatedLoreIds: built.loreIds, createdAt: new Date().toISOString() }
      setVault((current) => ({ ...current, threads: current.threads.map((item) => item.id === sourceThread.id ? { ...item, messages: [...item.messages, message], updatedAt: message.createdAt } : item) }))
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Luna could not respond.') }
    finally { setGenerating(false) }
  }

  const send = async () => {
    if (!draft.trim() || generating) return
    const message: Message = { id: createId('message'), role: 'user', speakerName: vault.userName || 'You', content: draft.trim(), createdAt: new Date().toISOString() }
    const updated = { ...thread, messages: [...thread.messages, message], updatedAt: message.createdAt }
    setDraft('')
    setVault((current) => ({ ...current, threads: current.threads.map((item) => item.id === thread.id ? updated : item) }))
    await generate(updated)
  }

  return <div className="chat-layout">
    <section className="chat-workspace">
      <header className="chat-header"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /></button><div><span>{thread.kind} thread</span><h1>{thread.name}</h1></div><span className="model-badge"><span className="live-dot" /> Luna 5.6 · low</span></header>
      <div className="message-scroll">
        {thread.messages.length === 0 && <div className="quiet-room"><Users size={28} /><h2>The room is listening.</h2><p>Write a message or invite one character to take the first turn.</p></div>}
        {thread.messages.map((message) => <MessageBubble key={message.id} message={message} vault={vault} />)}
        {generating && <div className="message assistant generating-message"><span className="message-avatar"><LoaderCircle className="spin" size={18} /></span><div><strong>{speakerName(speakerId, vault)} is composing…</strong><span className="typing"><i /><i /><i /></span></div></div>}
        {error && <div className="chat-error"><Info size={17} /><span>{error}</span><button onClick={() => generate(thread)}>Try again</button></div>}
        <div ref={endRef} />
      </div>
      <div className="composer-wrap">
        {speakers.length > 1 && <div className="speaker-picker"><span>Next response</span>{speakers.map((id) => <button className={speakerId === id ? 'active' : ''} key={id} onClick={() => setSpeakerId(id)}>{id === 'narrator' ? <Compass size={14} /> : <span className="tiny-avatar" style={{ background: vault.characters.find((item) => item.id === id)?.color }} />}{speakerName(id, vault)}</button>)}</div>}
        <div className="composer"><textarea aria-label="Your message" rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={`Message ${thread.kind === 'scenario' ? 'the world' : speakerName(speakerId, vault)}…`} /><div className="composer-actions"><button className="continue-button" disabled={generating || thread.messages.length === 0} onClick={() => generate(thread)} title="Generate exactly one turn without adding a user message"><RefreshCw size={15} /> Take one turn</button><button className="send-button" disabled={!draft.trim() || generating} onClick={send}><Send size={18} /></button></div></div>
        <small className="pace-note"><Radio size={12} /> One response at a time. You always choose who speaks next.</small>
      </div>
    </section>
    <aside className="context-panel"><div className="context-heading"><span>Story context</span><MoreHorizontal size={18} /></div><ContextSubject thread={thread} vault={vault} /><div className="context-block"><h3>Cast</h3><div className="context-cast">{thread.characterIds.map((id) => { const character = vault.characters.find((item) => item.id === id); return character ? <div key={id}><Avatar item={character} /><span><strong>{character.name}</strong><small>{character.bio.slice(0, 48)}…</small></span></div> : null })}{!thread.characterIds.length && <p>Solo exploration</p>}</div></div><div className="context-block"><h3>Active lore <span>{currentLore.length}</span></h3>{currentLore.length ? <div className="active-lore">{currentLore.map((item) => <div key={item.id}><Archive size={15} /><span><strong>{item.name}</strong><small>{item.summary}</small></span></div>)}</div> : <p>Lore appears here when a trigger is mentioned.</p>}</div></aside>
  </div>
}

function MessageBubble({ message, vault }: { message: Message; vault: Vault }) {
  const character = vault.characters.find((item) => item.id === message.speakerId)
  return <motion.article className={`message ${message.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span className="message-avatar" style={{ background: character?.color }}>{message.role === 'user' ? (vault.userName || 'Y').slice(0, 1).toUpperCase() : character ? character.name.slice(0, 1) : <Compass size={17} />}</span><div className="message-body"><header><strong>{message.speakerName}</strong><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></header><p>{message.content}</p>{message.activatedLoreIds?.length ? <span className="lore-used"><Archive size={12} /> {message.activatedLoreIds.length} lore active</span> : null}</div></motion.article>
}

function ContextSubject({ thread, vault }: { thread: StoryThread; vault: Vault }) {
  const subject = thread.kind === 'character' ? vault.characters.find((item) => item.id === thread.subjectId) : thread.kind === 'scenario' ? vault.scenarios.find((item) => item.id === thread.subjectId) : vault.rooms.find((item) => item.id === thread.subjectId)
  return <div className="context-subject"><span className="context-symbol">{thread.kind === 'character' ? <Sparkles size={21} /> : thread.kind === 'scenario' ? <Compass size={21} /> : <Users size={21} />}</span><div><strong>{subject?.name || thread.name}</strong><p>{subject && 'description' in subject ? subject.description : subject && 'bio' in subject ? subject.bio : ''}</p></div></div>
}

function SettingsPage({ vault, setVault }: { vault: Vault; setVault: (updater: (value: Vault) => Vault) => void }) {
  const [status, setStatus] = useState<CodexStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState('')
  const check = async () => { setChecking(true); setStatus(await window.starling.codex.status()); setChecking(false) }
  useEffect(() => { check() }, [])
  const exportData = async () => { const path = await window.starling.database.export(); if (path) setNotice(`Archive exported to ${path}`) }
  const importData = async () => { const data = await window.starling.database.import(); if (data) { setVault(() => data); setNotice('Archive imported successfully.') } }
  return <div className="settings-layout"><section className="settings-section"><div className="settings-heading"><div><h2>Codex connection</h2><p>Starling calls the local Codex CLI with a locked model and reasoning profile.</p></div><span className={`status-pill ${status?.available && status.authenticated ? 'ok' : 'warn'}`}>{status?.available && status.authenticated ? <><Check size={14} /> Ready</> : 'Needs attention'}</span></div><div className="connection-readout"><div><span>Intelligence</span><strong>gpt-5.6-luna</strong></div><div><span>Reasoning</span><strong>Low</strong></div><div><span>Codex CLI</span><strong>{status?.version || 'Not detected'}</strong></div></div><label className="field-label">Codex executable</label><div className="binary-row"><code>{status?.binary || 'codex'}</code><button className="secondary-button" onClick={async () => { await window.starling.codex.chooseBinary(); check() }}>Choose…</button><button className="secondary-button" onClick={check} disabled={checking}>{checking ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} Check</button></div>{status && !status.available && <p className="inline-warning">Install the Codex CLI, then choose its executable here. Run <code>codex login</code> once before chatting.</p>}{status?.available && !status.authenticated && <p className="inline-warning">Codex is installed but does not appear to be signed in. Run <code>codex login</code> in a terminal.</p>}</section><section className="settings-section"><div className="settings-heading"><div><h2>Your profile</h2><p>This name appears beside your messages and can be referenced by characters.</p></div></div><label className="field-label" htmlFor="user-name">Display name</label><input id="user-name" className="text-input compact-input" value={vault.userName} onChange={(event) => setVault((current) => ({ ...current, userName: event.target.value }))} /></section><section className="settings-section"><div className="settings-heading"><div><h2>Archive data</h2><p>Characters, lore, worlds, rooms, and threads are stored locally on this computer.</p></div></div><div className="button-row"><button className="secondary-button" onClick={exportData}><Download size={16} /> Export archive</button><button className="secondary-button" onClick={importData}><Import size={16} /> Import archive</button></div>{notice && <p className="success-note"><Check size={15} /> {notice}</p>}</section><PrivacyNote /></div>
}

function PrivacyNote() {
  return <aside className="privacy-note"><Bot size={23} /><div><strong>Local-first by design</strong><p>Your archive stays on this device. When you generate a turn, only the assembled story context for that turn is sent through your authenticated Codex session.</p></div></aside>
}

function AboutPage() {
  const [open, setOpen] = useState(0)
  const guides = [
    ['Create a character', 'Open Characters, choose New Character, then add a name, persona bio, and default greeting. Connect any lore modules the character should know. Save, then choose Chat.'],
    ['Build and share lore', 'Open Lore Library and create one focused module per person, place, artifact, rule, or event. Add key terms and phrases as triggers. Connect the same module to any number of characters, scenarios, or rooms.'],
    ['Start a scenario', 'Create a scenario with a world premise, opening passage, and director notes. Choose Enter World, then explore alone or select characters to bring along. Pick Narrator or a cast member before each response.'],
    ['Direct a room', 'Create a room, select at least two characters, and optionally add shared lore or a scenario backdrop. In the room, choose the next speaker and generate one turn at a time—characters never run away in an endless loop.'],
    ['Manage threads', 'Every conversation is saved automatically. Open Threads to resume, rename, or delete one. Export the whole archive from Settings whenever you want a portable backup.'],
    ['Connect Luna', 'Install the Codex CLI and sign in once with codex login. Starling automatically uses gpt-5.6-luna at low reasoning. If Codex is not found, choose its executable in Settings.'],
  ]
  return <div className="about-layout"><section className="about-intro"><div className="about-orbit"><BrandMark /><span /><span /></div><div><h2>A private stage for impossible conversations.</h2><p>Starling Archive is a local-first desktop studio for creating AI characters, modular lore, ensemble rooms, and explorable role-playing worlds. It combines the immediacy of character chat with the freedom of open-ended adventures, while keeping you in control of the cast and pace.</p><div className="about-principles"><span><Check size={15} /> Local archive</span><span><Check size={15} /> Shared modular lore</span><span><Check size={15} /> One directed turn at a time</span><span><Check size={15} /> Luna 5.6 intelligence</span></div></div></section><section className="about-steps"><SectionTitle eyebrow="Field guide" title="How to use Starling" /><div className="accordion">{guides.map(([title, body], index) => <button key={title} className={open === index ? 'open' : ''} onClick={() => setOpen(index)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><AnimatePresence initial={false}>{open === index && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{body}</motion.p>}</AnimatePresence></div><ChevronRight size={18} /></button>)}</div></section><section className="about-details"><div><span className="eyebrow">How intelligence works</span><h2>Canon in. Character out.</h2><p>For each turn, Starling combines the active speaker’s persona, the recent conversation, the scenario direction, and only the lore whose triggers have appeared. Codex Luna receives that focused context and returns one in-world response.</p></div><div className="context-flow"><span>Persona</span><i>+</i><span>Recent story</span><i>+</i><span>Triggered lore</span><ChevronRight size={17} /><strong>Luna</strong></div></section><section className="about-footer"><div><Github size={22} /><span><strong>Open source</strong><small>Built for Windows and macOS under the MIT License.</small></span></div><button className="secondary-button" onClick={() => window.starling.app.openExternal('https://github.com/jetblackrlsh/starling-archive')}>View on GitHub <ChevronRight size={15} /></button></section></div>
}

function EntityEditor({ vault, setVault, type, id, onClose }: { vault: Vault; setVault: (updater: (value: Vault) => Vault) => void; type: 'character' | 'lore' | 'scenario' | 'room'; id?: string; onClose: () => void }) {
  const existing = type === 'character' ? vault.characters.find((item) => item.id === id) : type === 'lore' ? vault.lore.find((item) => item.id === id) : type === 'scenario' ? vault.scenarios.find((item) => item.id === id) : vault.rooms.find((item) => item.id === id)
  const [draft, setDraft] = useState<any>(() => existing ? structuredClone(existing) : blankEntity(type))
  const update = (key: string, value: unknown) => setDraft((current: any) => ({ ...current, [key]: value }))
  const toggle = (key: string, value: string) => update(key, draft[key].includes(value) ? draft[key].filter((item: string) => item !== value) : [...draft[key], value])
  const save = (event: FormEvent) => {
    event.preventDefault()
    const time = new Date().toISOString()
    const item = { ...draft, id: existing?.id || createId(type), createdAt: existing?.createdAt || time, updatedAt: time }
    setVault((current) => {
      const key = type === 'character' ? 'characters' : type === 'lore' ? 'lore' : type === 'scenario' ? 'scenarios' : 'rooms'
      const collection = current[key] as any[]
      return { ...current, [key]: existing ? collection.map((entry) => entry.id === existing.id ? item : entry) : [item, ...collection] }
    })
    onClose()
  }
  const title = `${existing ? 'Edit' : 'New'} ${type}`
  return <Modal onClose={onClose}><form className="editor-modal" onSubmit={save}><header><div><span>{existing ? 'Update your archive' : 'Add to your archive'}</span><h2>{title}</h2></div><IconButton label="Close" onClick={onClose}><X size={19} /></IconButton></header><div className="editor-scroll">
    {type === 'character' && <><Field label="Character name" required><input className="text-input" required value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Lyra Vale" /></Field><Field label="Persona bio" hint="Write identity, personality, voice, habits, boundaries, and relationship to the user."><textarea className="text-input" required rows={7} value={draft.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Lyra is a sharp-witted cartographer…" /></Field><Field label="Default greeting" hint="The opening message in every new chat."><textarea className="text-input" rows={5} value={draft.greeting} onChange={(event) => update('greeting', event.target.value)} placeholder="*Lyra unfolds a shimmering map.* There you are…" /></Field><Field label="Character color"><div className="color-picker">{colors.map((color) => <button type="button" aria-label={color} key={color} className={draft.color === color ? 'active' : ''} style={{ background: color }} onClick={() => update('color', color)}>{draft.color === color && <Check size={14} />}</button>)}</div></Field><ConnectionPicker title="Lore this character knows" items={vault.lore} selected={draft.loreIds} onToggle={(value) => toggle('loreIds', value)} empty="Create lore modules first, then return to connect them." /></>}
    {type === 'lore' && <><Field label="Module name" required><input className="text-input" required value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="The Morrow Key" /></Field><Field label="Short summary"><input className="text-input" value={draft.summary} onChange={(event) => update('summary', event.target.value)} placeholder="A gold key that unlocks tomorrow." /></Field><Field label="Lore entry" hint="Write the exact canonical facts Luna should remember when this module activates."><textarea className="text-input" required rows={9} value={draft.content} onChange={(event) => update('content', event.target.value)} /></Field><Field label="Trigger words & phrases" hint="Separate triggers with commas or new lines. Matching is not case-sensitive."><textarea className="text-input" required rows={4} value={draft.triggers.join(', ')} onChange={(event) => update('triggers', splitList(event.target.value))} placeholder="Morrow Key, gold key, seven stars" /></Field><Field label="Tags"><input className="text-input" value={draft.tags.join(', ')} onChange={(event) => update('tags', splitList(event.target.value))} placeholder="artifact, mystery" /></Field></>}
    {type === 'scenario' && <><Field label="Scenario name" required><input className="text-input" required value={draft.name} onChange={(event) => update('name', event.target.value)} /></Field><Field label="World description"><textarea className="text-input" required rows={4} value={draft.description} onChange={(event) => update('description', event.target.value)} /></Field><Field label="Opening passage" hint="This is the first message in each new adventure."><textarea className="text-input" required rows={7} value={draft.opening} onChange={(event) => update('opening', event.target.value)} /></Field><Field label="Director notes" hint="Define perspective, tone, pacing, and how much agency the narrator should leave the player."><textarea className="text-input" rows={6} value={draft.directorNotes} onChange={(event) => update('directorNotes', event.target.value)} /></Field><ConnectionPicker title="World lore" items={vault.lore} selected={draft.loreIds} onToggle={(value) => toggle('loreIds', value)} empty="Create lore modules first, then return to connect them." /></>}
    {type === 'room' && <><Field label="Room name" required><input className="text-input" required value={draft.name} onChange={(event) => update('name', event.target.value)} /></Field><Field label="What happens here?"><textarea className="text-input" rows={4} value={draft.description} onChange={(event) => update('description', event.target.value)} /></Field><ConnectionPicker title="Characters in this room" items={vault.characters} selected={draft.characterIds} onToggle={(value) => toggle('characterIds', value)} empty="Create characters first, then return to build a room." /><Field label="Optional scenario backdrop"><select className="text-input" value={draft.scenarioId || ''} onChange={(event) => update('scenarioId', event.target.value || undefined)}><option value="">No scenario—open conversation</option>{vault.scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.name}</option>)}</select></Field><ConnectionPicker title="Shared room lore" items={vault.lore} selected={draft.loreIds} onToggle={(value) => toggle('loreIds', value)} empty="No lore modules yet." /></>}
  </div><footer><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Save size={16} /> Save {type}</button></footer></form></Modal>
}

function StartScenarioDialog({ vault, scenarioId, onClose, onStart }: { vault: Vault; scenarioId: string; onClose: () => void; onStart: (scenario: Scenario, characterIds: string[]) => void }) {
  const scenario = vault.scenarios.find((item) => item.id === scenarioId)!
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  return <Modal onClose={onClose}><div className="start-dialog"><header><span className="scenario-glyph"><Compass size={22} /></span><div><span>Begin a new adventure</span><h2>{scenario.name}</h2></div><IconButton label="Close" onClick={onClose}><X size={19} /></IconButton></header><p>{scenario.description}</p><div className="cast-choice"><div><strong>Who travels with you?</strong><small>Choose no one for a solo adventure, or add any of your characters.</small></div>{vault.characters.map((character) => <button key={character.id} onClick={() => toggle(character.id)} className={selected.includes(character.id) ? 'selected' : ''}><Avatar item={character} /><span><strong>{character.name}</strong><small>{character.bio.slice(0, 68)}…</small></span><span className="selection-check">{selected.includes(character.id) && <Check size={14} />}</span></button>)}</div><footer><span>{selected.length ? `${selected.length} companion${selected.length === 1 ? '' : 's'} selected` : 'Solo adventure'}</span><button className="primary-button" onClick={() => onStart(scenario, selected)}><WandSparkles size={16} /> Enter world</button></footer></div></Modal>
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><motion.div initial={{ opacity: 0, scale: .97, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 8 }} transition={{ duration: .18 }}>{children}</motion.div></motion.div>
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <label className="form-field"><span>{label}{required && <i>Required</i>}</span>{children}{hint && <small>{hint}</small>}</label>
}

function ConnectionPicker({ title, items, selected, onToggle, empty }: { title: string; items: Array<{ id: string; name: string; summary?: string; bio?: string }>; selected: string[]; onToggle: (id: string) => void; empty: string }) {
  return <div className="connection-picker"><div><strong>{title}</strong><small>Select any number. Modules remain independent and reusable.</small></div>{items.length ? <div className="connection-options">{items.map((item) => <button type="button" key={item.id} className={selected.includes(item.id) ? 'selected' : ''} onClick={() => onToggle(item.id)}><span className="selection-check">{selected.includes(item.id) && <Check size={13} />}</span><span><strong>{item.name}</strong><small>{item.summary || item.bio?.slice(0, 84)}</small></span></button>)}</div> : <p className="empty-inline">{empty}</p>}</div>
}

function IconButton({ children, label, onClick, danger }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" className={`icon-button ${danger ? 'danger' : ''}`} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

function Avatar({ item, large, style }: { item: Character; large?: boolean; style?: React.CSSProperties }) {
  return <span className={`avatar ${large ? 'large' : ''}`} style={{ background: `linear-gradient(145deg, ${item.color}, color-mix(in srgb, ${item.color} 55%, #090910))`, ...style }}>{item.name.slice(0, 1).toUpperCase()}</span>
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Compass; title: string; description: string }) {
  return <div className="empty-state"><span><Icon size={25} /></span><h2>{title}</h2><p>{description}</p></div>
}

function blankEntity(type: 'character' | 'lore' | 'scenario' | 'room') {
  if (type === 'character') return { name: '', bio: '', greeting: '', color: colors[0], loreIds: [] }
  if (type === 'lore') return { name: '', summary: '', content: '', triggers: [], tags: [] }
  if (type === 'scenario') return { name: '', description: '', opening: '', directorNotes: 'Write immersive second-person role-play. Advance one beat at a time. Never decide the player’s actions or feelings.', loreIds: [] }
  return { name: '', description: '', characterIds: [], loreIds: [], scenarioId: undefined }
}

function splitList(value: string) { return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))] }
function speakerName(id: string, vault: Vault) { return id === 'narrator' ? 'Narrator' : vault.characters.find((item) => item.id === id)?.name || 'Character' }
function relativeDate(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.floor(diff / 60000); if (minutes < 1) return 'Now'; if (minutes < 60) return `${minutes}m`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h`; const days = Math.floor(hours / 24); if (days < 7) return `${days}d`; return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' }) }

export default App
