'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Send, Plus, Phone, Link2 } from 'lucide-react';

interface Msg {
  id: string; role: string; content: string; citations: string | null; safetyLevel: string; createdAt: string;
}
interface Conv { id: string; title: string; updatedAt: string; messages: Msg[] }

export function AssistantView() {
  const { t, locale, features } = useApp();
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/ai/conversations').then((r) => r.json()).catch(() => null);
    if (res) {
      setConvs(res.conversations ?? []);
      if (!activeId && res.conversations?.length) {
        setActiveId(res.conversations[0].id);
        setMessages(res.conversations[0].messages ?? []);
      }
    }
    setLoading(false);
  }, [activeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const newChat = async () => {
    const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    if (res.ok) {
      const data = await res.json();
      await load();
      setActiveId(data.id);
      setMessages([]);
    }
  };

  const selectConv = (id: string) => {
    const c = convs.find((x) => x.id === id);
    setActiveId(id);
    setMessages(c?.messages ?? []);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    let convId = activeId;
    if (!convId) {
      const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      convId = data.id;
      setActiveId(convId);
    }
    setInput('');
    setBusy(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, role: 'USER', content, citations: null, safetyLevel: 'NORMAL', createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, message: content, lang: locale }),
      });
      const data = await res.json();
      if (res.status === 402 && data.limitReached) {
        toast({ description: t('assist.limitReached'), variant: 'destructive' });
        return;
      }
      if (!res.ok) {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
        return;
      }
      setMessages((m) => [...m, {
        id: data.id, role: 'ASSISTANT', content: data.content,
        citations: data.citations?.length ? JSON.stringify(data.citations) : null,
        safetyLevel: data.safetyLevel, createdAt: new Date().toISOString(),
      }]);
      await load();
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const citationsOf = (m: Msg): Array<{ title: string; citation: string; url?: string }> => {
    if (!m.citations) return [];
    try { return JSON.parse(m.citations) as Array<{ title: string; citation: string; url?: string }>; } catch { return []; }
  };

  const limit = features?.aiMessagesPerDay ?? 5;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-11rem)] min-h-[480px]">
      {/* Conversation list */}
      <aside className="hidden lg:flex flex-col gap-2 niva-card rounded-xl border p-3" aria-label={t('assist.newChat')}>
        <Button onClick={newChat} variant="outline" className="min-h-11 justify-start">
          <Plus className="h-4 w-4 me-2" />{t('assist.newChat')}
        </Button>
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-1">
            {convs.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConv(c.id)}
                className={`w-full text-start text-sm rounded-lg px-3 py-2.5 truncate transition-colors min-h-10 ${activeId === c.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground">{limit < 0 ? '∞' : `${limit}/day`} · {t('assist.disclaimer')}</p>
      </aside>

      {/* Chat */}
      <Card className="niva-card flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <h1 className="font-semibold text-sm">{t('assist.title')}</h1>
            <p className="text-[10px] text-muted-foreground truncate">{t('assist.sub')}</p>
          </div>
          <Button onClick={newChat} variant="ghost" size="icon" className="ms-auto lg:hidden min-h-9 w-9" aria-label={t('assist.newChat')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-3 max-w-2xl mx-auto">
            {loading ? <Skeleton className="h-24 w-3/4" /> : messages.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <span className="mx-auto grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></span>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{t('assist.sub')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['assist.suggested1', 'assist.suggested2', 'assist.suggested3'].map((k) => (
                    <Button key={k} variant="outline" size="sm" className="min-h-9 text-xs" onClick={() => send(t(k))}>
                      {t(k)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2 ${
                  m.role === 'USER' ? 'bg-primary text-primary-foreground rounded-ee-md' : 'bg-muted rounded-es-md'
                }`}>
                  {m.safetyLevel === 'EMERGENCY' && (
                    <Alert className="border-destructive/40 bg-destructive/10 mb-2">
                      <Phone className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-xs font-semibold text-destructive num">{t('safety.iran')}</AlertDescription>
                    </Alert>
                  )}
                  <p className="whitespace-pre-wrap" dir="auto">{m.content}</p>
                  {citationsOf(m).length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" />{t('assist.citations')}</p>
                      {citationsOf(m).map((c, i) => (
                        <div key={i} className="text-[10px] text-muted-foreground">
                          [{i + 1}] {c.title} — {c.citation}{c.url && <> · <a href={c.url} target="_blank" rel="noreferrer" className="underline">source</a></>}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.role === 'ASSISTANT' && <Badge variant="outline" className="text-[9px]">{t('assist.disclaimer')}</Badge>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-es-md px-4 py-3">
                  <span className="flex gap-1" aria-label={t('common.loading')}>
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.3s]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <CardContent className="p-3 border-t">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 max-w-2xl mx-auto"
            aria-label={t('assist.title')}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('assist.placeholder')}
              className="flex-1 rounded-xl border bg-transparent px-4 py-3 text-sm min-h-11"
              aria-label={t('assist.placeholder')}
              maxLength={2000}
            />
            <Button type="submit" size="icon" className="min-h-11 w-11 shrink-0" disabled={busy || !input.trim()} aria-label={t('assist.send')}>
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
