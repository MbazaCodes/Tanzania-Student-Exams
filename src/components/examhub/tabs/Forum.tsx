import { useEffect, useState, useCallback, useRef } from 'react'
import {
  MessageSquare, ChevronRight, ArrowLeft, Plus, Heart, Reply,
  CheckCircle2, Loader2, Send, Trash2, Pin, Lock, Unlock,
  Eye, ThumbsUp, ImageIcon, Paperclip, X, Star, Search,
  Users, BookOpen, Shield, Clock,
} from 'lucide-react'
import {
  Button, Input, Textarea, Badge, Card, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/index'
import {
  listForumChannels, listForumTopics, getForumTopic, createForumTopic,
  deleteForumTopic, updateForumTopic, listForumPosts, createForumPost,
  deleteForumPost, markPostAsSolution, toggleForumLike, uploadForumAttachment,
  subscribeToForumPosts, subscribeToForumTopics,
  type ForumChannel, type ForumTopic, type ForumPost,
} from '@/lib/api'
import { LEVELS, levelLabel, type User } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type View = 'channels' | 'topics' | 'thread'

const LEVEL_COLORS: Record<string, string> = {
  general:     'bg-gray-100 text-gray-700 border-gray-200',
  standard_4:  'bg-green-100 text-green-700 border-green-200',
  standard_7:  'bg-teal-100 text-teal-700 border-teal-200',
  form_2:      'bg-sky-100 text-sky-700 border-sky-200',
  form_4:      'bg-blue-100 text-blue-700 border-blue-200',
  form_6:      'bg-purple-100 text-purple-700 border-purple-200',
}
const LEVEL_BG: Record<string, string> = {
  general:     'from-gray-500 to-gray-700',
  standard_4:  'from-green-500 to-green-700',
  standard_7:  'from-teal-500 to-teal-700',
  form_2:      'from-sky-500 to-sky-700',
  form_4:      'from-blue-600 to-blue-800',
  form_6:      'from-purple-600 to-purple-800',
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`
  return new Date(ts).toLocaleDateString()
}

function Avatar({ user, size = 8 }: { user?: User | null; size?: number }) {
  const s = `h-${size} w-${size}`
  const initials = (user?.name ?? '?')[0].toUpperCase()
  const isTeacher = user?.role === 'teacher'
  const isAdmin   = user?.role === 'super_admin'
  const bg = isAdmin ? 'var(--navy)' : isTeacher ? 'var(--gold)' : 'var(--green)'
  return (
    <div className={cn('shrink-0 flex items-center justify-center rounded-full font-bold text-white text-xs', s)}
      style={{ background: bg, minWidth: `${size*4}px`, minHeight: `${size*4}px` }}>
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role?: string }) {
  if (role === 'super_admin') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--navy)', color: '#fff' }}>Admin</span>
  if (role === 'teacher')     return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--gold)', color: '#000' }}>Teacher</span>
  return null
}

// ═══════════════════════════════════════════════════════════
// MAIN FORUM COMPONENT
// ═══════════════════════════════════════════════════════════
export function Forum({ user }: { user: User }) {
  const [view, setView]             = useState<View>('channels')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [channels, setChannels]     = useState<ForumChannel[]>([])
  const [activeChannel, setActiveChannel] = useState<ForumChannel | null>(null)
  const [activeTopic, setActiveTopic]     = useState<ForumTopic | null>(null)
  const [loading, setLoading]       = useState(true)

  const loadChannels = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listForumChannels(levelFilter !== 'all' ? levelFilter : undefined)
      setChannels(data)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [levelFilter])

  useEffect(() => { loadChannels() }, [loadChannels])

  const openChannel = (ch: ForumChannel) => { setActiveChannel(ch); setView('topics') }
  const openTopic   = (t: ForumTopic)   => { setActiveTopic(t);   setView('thread') }
  const goBack = () => {
    if (view === 'thread')   { setView('topics'); setActiveTopic(null) }
    else if (view === 'topics') { setView('channels'); setActiveChannel(null) }
  }

  // Group channels by level
  const grouped = channels.reduce<Record<string, ForumChannel[]>>((acc, ch) => {
    const key = ch.level; if (!acc[key]) acc[key] = []; acc[key].push(ch); return acc
  }, {})

  const levelOrder = ['general','standard_4','standard_7','form_2','form_4','form_6']

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {view !== 'channels' && (
            <button onClick={goBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm">
              <ArrowLeft className="h-4 w-4"/>Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary"/>
              {view === 'channels' ? 'Discussion Forums' : view === 'topics' ? activeChannel?.subject : activeTopic?.title}
            </h1>
            {view === 'channels' && <p className="text-sm text-muted-foreground mt-0.5">Join subject discussions, ask questions, share resources.</p>}
            {view === 'topics' && activeChannel && (
              <p className="text-sm text-muted-foreground mt-0.5">
                <Badge variant="outline" className={cn('text-xs mr-2', LEVEL_COLORS[activeChannel.level])}>{levelLabel(activeChannel.level)}</Badge>
                {activeChannel.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── CHANNELS VIEW ── */}
      {view === 'channels' && (
        <>
          {/* Level filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLevelFilter('all')}
              className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', levelFilter==='all' ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
              All Levels
            </button>
            <button onClick={() => setLevelFilter('general')}
              className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', levelFilter==='general' ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
              General
            </button>
            {LEVELS.map(l => (
              <button key={l.value} onClick={() => setLevelFilter(l.value)}
                className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', levelFilter===l.value ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
                {l.short}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading forums…
            </div>
          ) : (
            <div className="space-y-6">
              {levelOrder.filter(lv => grouped[lv]?.length).map(lv => (
                <div key={lv}>
                  {/* Level header */}
                  <div className={cn('flex items-center gap-3 rounded-xl p-3 mb-3 bg-gradient-to-r text-white', LEVEL_BG[lv])}>
                    <BookOpen className="h-5 w-5 shrink-0"/>
                    <div>
                      <p className="font-bold text-sm">{lv === 'general' ? 'General Discussion' : levelLabel(lv)}</p>
                      <p className="text-xs text-white/70">{grouped[lv].length} subject{grouped[lv].length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped[lv].map(ch => (
                      <button key={ch.id} onClick={() => openChannel(ch)}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold bg-gradient-to-br', LEVEL_BG[ch.level])}>
                          {ch.subject.slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate group-hover:text-primary">{ch.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{ch.description ?? `${levelLabel(ch.level)} discussions`}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary"/>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TOPICS VIEW ── */}
      {view === 'topics' && activeChannel && (
        <TopicsView channel={activeChannel} user={user} onOpenTopic={openTopic}/>
      )}

      {/* ── THREAD VIEW ── */}
      {view === 'thread' && activeTopic && (
        <ThreadView topic={activeTopic} user={user} onTopicUpdate={setActiveTopic}/>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TOPICS VIEW
// ═══════════════════════════════════════════════════════════
function TopicsView({ channel, user, onOpenTopic }: {
  channel: ForumChannel; user: User; onOpenTopic: (t: ForumTopic) => void
}) {
  const [topics, setTopics]     = useState<ForumTopic[]>([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [saving, setSaving]     = useState(false)
  const canCreate = ['teacher','super_admin'].includes(user.role)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTopics(await listForumTopics(channel.id)) }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [channel.id])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToForumTopics(channel.id, load)
    return () => { unsub() }
  }, [channel.id, load])

  const submit = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Title and body are required'); return }
    setSaving(true)
    try {
      const t = await createForumTopic({ channel_id: channel.id, title: title.trim(), body: body.trim() })
      setTitle(''); setBody(''); setShowNew(false)
      toast.success('Topic created!')
      onOpenTopic(t)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handlePin = async (t: ForumTopic) => {
    try { await updateForumTopic(t.id, { is_pinned: !t.is_pinned }); load() }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }
  const handleLock = async (t: ForumTopic) => {
    try { await updateForumTopic(t.id, { is_locked: !t.is_locked }); load() }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }
  const handleDelete = async (t: ForumTopic) => {
    if (!confirm(`Delete "${t.title}"?`)) return
    try { await deleteForumTopic(t.id); load(); toast.success('Deleted') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const isAdmin = ['teacher','super_admin'].includes(user.role)

  return (
    <div className="space-y-4">
      {/* New topic button */}
      {canCreate && !showNew && (
        <Button onClick={() => setShowNew(true)} style={{ background: 'var(--green)' }}>
          <Plus className="mr-2 h-4 w-4"/>Start New Topic
        </Button>
      )}

      {/* New topic form */}
      {showNew && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/>New Topic</h3>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic title — be specific and clear"/>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              placeholder="Describe the topic, question or concept you want to discuss. You can add resources, examples or questions for students."/>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving} style={{ background: 'var(--green)' }}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}Post Topic
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading topics…
        </div>
      ) : topics.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground"/>
          <p className="font-medium">No topics yet</p>
          <p className="text-sm text-muted-foreground">
            {canCreate ? 'Start the first topic for students to discuss.' : 'Your teacher hasn\'t started any topics yet. Check back soon.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {topics.map(t => (
            <div key={t.id}
              className={cn('flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer', t.is_pinned && 'border-amber-300 bg-amber-50/40')}>
              {/* Clickable area */}
              <div className="flex-1 min-w-0" onClick={() => onOpenTopic(t)}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {t.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0"/>}
                  {t.is_locked && <Lock className="h-3.5 w-3.5 text-red-400 shrink-0"/>}
                  <h3 className="font-semibold text-sm hover:text-primary transition-colors">{t.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Avatar user={t.author as User} size={5}/>
                    <span>{t.author?.name ?? '—'}</span>
                    <RoleBadge role={t.author?.role}/>
                  </div>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3"/>{t.views}</span>
                  <span className="flex items-center gap-1"><Reply className="h-3 w-3"/>{t.reply_count} repl{t.reply_count === 1 ? 'y' : 'ies'}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{timeAgo(t.last_reply_at)}</span>
                </div>
              </div>
              {/* Admin actions */}
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handlePin(t)} title={t.is_pinned ? 'Unpin' : 'Pin'}
                    className={cn('p-1.5 rounded-lg hover:bg-accent', t.is_pinned ? 'text-amber-500' : 'text-muted-foreground')}>
                    <Pin className="h-3.5 w-3.5"/>
                  </button>
                  <button onClick={() => handleLock(t)} title={t.is_locked ? 'Unlock' : 'Lock'}
                    className={cn('p-1.5 rounded-lg hover:bg-accent', t.is_locked ? 'text-red-400' : 'text-muted-foreground')}>
                    {t.is_locked ? <Unlock className="h-3.5 w-3.5"/> : <Lock className="h-3.5 w-3.5"/>}
                  </button>
                  {(user.role === 'super_admin' || t.author_id === user.id) && (
                    <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5"/>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// THREAD VIEW
// ═══════════════════════════════════════════════════════════
function ThreadView({ topic, user, onTopicUpdate }: {
  topic: ForumTopic; user: User; onTopicUpdate: (t: ForumTopic) => void
}) {
  const [posts, setPosts]         = useState<ForumPost[]>([])
  const [loading, setLoading]     = useState(true)
  const [fullTopic, setFullTopic] = useState<ForumTopic>(topic)
  const [replyTo, setReplyTo]     = useState<ForumPost | null>(null)
  const [body, setBody]           = useState('')
  const [file, setFile]           = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [sending, setSending]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const isAdmin   = ['teacher','super_admin'].includes(user.role)

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([getForumTopic(topic.id), listForumPosts(topic.id)])
      setFullTopic(t); onTopicUpdate(t); setPosts(p)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [topic.id])

  useEffect(() => { setLoading(true); load() }, [load])

  // Realtime
  useEffect(() => {
    const unsub = subscribeToForumPosts(topic.id, load)
    return () => { unsub() }
  }, [topic.id, load])

  // Scroll to bottom on new post
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts.length, loading])

  const onPickFile = (f: File | null) => {
    setFile(f)
    if (f && f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setFilePreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setFilePreview(null)
    }
  }

  const send = async () => {
    if (!body.trim() && !file) { toast.error('Write something or attach a file'); return }
    if (fullTopic.is_locked && !isAdmin) { toast.error('This topic is locked'); return }
    setSending(true)
    try {
      let image_url: string | undefined
      let file_url: string | undefined
      let file_name: string | undefined

      if (file) {
        const att = await uploadForumAttachment(file)
        if (file.type.startsWith('image/')) { image_url = att.url }
        else { file_url = att.url; file_name = att.name }
      }

      await createForumPost({
        topic_id: topic.id,
        body: body.trim(),
        parent_id: replyTo?.id,
        image_url, file_url, file_name,
      })
      setBody(''); setFile(null); setFilePreview(null); setReplyTo(null)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSending(false) }
  }

  const handleLike = async (postId: string) => {
    try {
      const { liked, like_count } = await toggleForumLike(postId)
      setPosts(ps => ps.map(p => {
        if (p.id === postId) return { ...p, liked_by_me: liked, like_count }
        if (p.replies) return { ...p, replies: p.replies.map(r => r.id === postId ? { ...r, liked_by_me: liked, like_count } : r) }
        return p
      }))
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleSolution = async (postId: string) => {
    try { await markPostAsSolution(postId, topic.id); load() }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try { await deleteForumPost(postId); load(); toast.success('Post deleted') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading discussion…
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Topic header card */}
      <Card className={cn('border-2', fullTopic.is_pinned ? 'border-amber-300' : 'border-border')}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar user={fullTopic.author as User} size={10}/>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold">{fullTopic.author?.name ?? '—'}</span>
                <RoleBadge role={(fullTopic.author as User | undefined)?.role}/>
                <span className="text-xs text-muted-foreground">{timeAgo(fullTopic.created_at)}</span>
                {fullTopic.is_pinned && <span className="flex items-center gap-1 text-xs text-amber-600"><Pin className="h-3 w-3"/>Pinned</span>}
                {fullTopic.is_locked && <span className="flex items-center gap-1 text-xs text-red-500"><Lock className="h-3 w-3"/>Locked</span>}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{fullTopic.body}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-2">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3"/>{fullTopic.views} views</span>
            <span className="flex items-center gap-1"><Reply className="h-3 w-3"/>{fullTopic.reply_count} replies</span>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          No replies yet. Be the first to respond!
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} user={user} isAdmin={isAdmin}
              onLike={() => handleLike(post.id)}
              onReply={() => { setReplyTo(post); document.getElementById('reply-box')?.focus() }}
              onSolution={() => handleSolution(post.id)}
              onDelete={() => handleDeletePost(post.id)}
              depth={0}/>
          ))}
        </div>
      )}
      <div ref={bottomRef}/>

      {/* Reply composer */}
      {!fullTopic.is_locked || isAdmin ? (
        <Card className="sticky bottom-0 border-primary/20 shadow-lg">
          <CardContent className="p-4 space-y-3">
            {replyTo && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Reply className="h-3.5 w-3.5 text-primary shrink-0"/>
                <span>Replying to <strong className="text-foreground">{replyTo.author?.name}</strong>: {replyTo.body.slice(0,60)}…</span>
                <button onClick={() => setReplyTo(null)} className="ml-auto"><X className="h-3.5 w-3.5"/></button>
              </div>
            )}
            {filePreview && (
              <div className="relative w-24 h-24">
                <img src={filePreview} alt="preview" className="w-24 h-24 object-cover rounded-lg border"/>
                <button onClick={() => onPickFile(null)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <X className="h-3 w-3"/>
                </button>
              </div>
            )}
            {file && !filePreview && (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-primary"/>
                <span className="truncate">{file.name}</span>
                <button onClick={() => onPickFile(null)} className="ml-auto"><X className="h-3.5 w-3.5"/></button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Avatar user={user} size={8}/>
              <div className="flex-1">
                <Textarea id="reply-box" value={body} onChange={e => setBody(e.target.value)} rows={2}
                  placeholder={fullTopic.is_locked ? 'Topic is locked — only admins can reply' : 'Write your reply… Use @name to mention someone'}
                  className="resize-none text-sm"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }}/>
                <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter to send</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => fileRef.current?.click()}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors" title="Attach image or file">
                  <ImageIcon className="h-4 w-4 text-muted-foreground"/>
                </button>
                <button onClick={send} disabled={sending}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--green)' }} title="Send (Ctrl+Enter)">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                onChange={e => onPickFile(e.target.files?.[0] ?? null)}/>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Lock className="h-4 w-4"/> This topic is locked. No new replies allowed.
        </CardContent></Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// POST CARD
// ═══════════════════════════════════════════════════════════
function PostCard({ post, user, isAdmin, onLike, onReply, onSolution, onDelete, depth }: {
  post: ForumPost; user: User; isAdmin: boolean
  onLike: () => void; onReply: () => void
  onSolution: () => void; onDelete: () => void
  depth: number
}) {
  const isOwn    = post.author_id === user.id
  const canAdmin = isAdmin || isOwn

  return (
    <div className={cn('space-y-2', depth > 0 && 'ml-10 border-l-2 border-border pl-4')}>
      <div className={cn(
        'rounded-xl border p-4 transition-colors',
        post.is_solution ? 'border-green-300 bg-green-50/40' : 'border-border bg-card',
        depth > 0 && 'rounded-l-none'
      )}>
        {/* Author row */}
        <div className="flex items-start gap-3">
          <Avatar user={post.author as User} size={8}/>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-semibold text-sm">{post.author?.name ?? '—'}</span>
              <RoleBadge role={(post.author as User | undefined)?.role}/>
              {post.is_solution && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3"/>Official Answer
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.created_at)}</span>
            </div>

            {/* Reply-to preview */}
            {post.parent_id && post.parent && (
              <div className="mb-2 rounded-lg bg-muted/50 border-l-2 border-primary/30 px-3 py-1.5 text-xs text-muted-foreground">
                <Reply className="h-3 w-3 inline mr-1"/>
                <strong>{(post.parent as ForumPost).author?.name}</strong>: {(post.parent as ForumPost).body?.slice(0,80)}…
              </div>
            )}

            {/* Body */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>

            {/* Image attachment */}
            {post.image_url && (
              <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                <img src={post.image_url} alt="attachment" className="max-h-64 rounded-lg border border-border object-contain cursor-zoom-in hover:opacity-90 transition-opacity"/>
              </a>
            )}

            {/* File attachment */}
            {post.file_url && post.file_name && (
              <a href={post.file_url} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent transition-colors w-fit">
                <Paperclip className="h-3.5 w-3.5 text-primary"/>
                <span>{post.file_name}</span>
              </a>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              <button onClick={onLike}
                className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  post.liked_by_me ? 'bg-red-100 text-red-600' : 'hover:bg-muted text-muted-foreground')}>
                <Heart className={cn('h-3.5 w-3.5', post.liked_by_me && 'fill-red-500')}/>
                {post.like_count > 0 && <span>{post.like_count}</span>}
              </button>
              {depth === 0 && (
                <button onClick={onReply}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                  <Reply className="h-3.5 w-3.5"/>Reply
                </button>
              )}
              {isAdmin && depth === 0 && !post.is_solution && (
                <button onClick={onSolution}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-green-50 hover:text-green-700 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5"/>Mark as Answer
                </button>
              )}
              {canAdmin && (
                <button onClick={onDelete}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors ml-auto">
                  <Trash2 className="h-3.5 w-3.5"/>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Threaded replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="space-y-2">
          {post.replies.map(r => (
            <PostCard key={r.id} post={r} user={user} isAdmin={isAdmin}
              onLike={() => {}} onReply={() => {}}
              onSolution={() => {}} onDelete={onDelete}
              depth={depth + 1}/>
          ))}
        </div>
      )}
    </div>
  )
}
