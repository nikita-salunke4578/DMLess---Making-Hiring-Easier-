import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Sparkles, Users, FileText, Loader2, ThumbsUp, ThumbsDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import ReactMarkdown from "react-markdown";
import type { Json } from "@/integrations/supabase/types";

interface Submission {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  score: number;
  total_questions: number;
  knocked_out: boolean;
  knockout_reason: string | null;
  tab_switch_count: number;
  answers: Json;
  started_at: string;
  completed_at: string | null;
  resume_url: string | null;
}

interface Question {
  id: string;
  question_text: string;
  options: Json;
  correct_option: number;
  is_knockout: boolean;
  sort_order: number;
}

type Message = { role: "user" | "assistant"; content: string; feedback?: "up" | "down" | null };

interface AIAssistantPanelProps {
  submissions: Submission[];
  questions: Question[];
  linkTitle: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recruiter`;

async function streamAI({
  body,
  onDelta,
  onDone,
  onError,
}: {
  body: Record<string, any>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Request failed (${resp.status})`);
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") break;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

const QUICK_ACTIONS = [
  { label: "Top candidates", query: "Show me the top 5 candidates by score with their key stats", icon: Users },
  { label: "Red flags", query: "Which candidates had tab switches or suspicious behavior?", icon: FileText },
  { label: "Summary", query: "Give me a brief summary of all submissions - how many passed, average score, and any notable patterns", icon: Sparkles },
];

const AIAssistantPanel = ({ submissions, questions, linkTitle }: AIAssistantPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "compare">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    await streamAI({
      body: { action: "query", submissions, questions, linkTitle, query: queryText },
      onDelta: updateAssistant,
      onDone: () => setIsLoading(false),
      onError: (msg) => {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
        setIsLoading(false);
      },
    });
  };

  const summarizeCandidate = async (sub: Submission) => {
    const queryText = `Summarize candidate ${sub.candidate_name}`;
    const userMsg: Message = { role: "user", content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    await streamAI({
      body: { action: "summarize_resume", submissions, questions, linkTitle, candidateIds: [sub.id] },
      onDelta: updateAssistant,
      onDone: () => setIsLoading(false),
      onError: (msg) => {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
        setIsLoading(false);
      },
    });
  };

  const runComparison = async () => {
    if (selectedForCompare.length < 2) return;
    setCompareLoading(true);
    setCompareResult("");

    let content = "";
    await streamAI({
      body: { action: "compare", submissions, questions, linkTitle, candidateIds: selectedForCompare },
      onDelta: (chunk) => {
        content += chunk;
        setCompareResult(content);
      },
      onDone: () => setCompareLoading(false),
      onError: (msg) => {
        setCompareResult(`❌ ${msg}`);
        setCompareLoading(false);
      },
    });
  };

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              variant="hero"
              size="lg"
              className="rounded-full h-14 w-14 p-0 shadow-lg"
            >
              <Bot className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[440px] max-h-[600px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-foreground text-sm">AI Recruiter Assistant</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["chat", "compare"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "chat" ? "💬 Ask AI" : "⚖️ Compare"}
                </button>
              ))}
            </div>

            {/* Suggestion disclaimer */}
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/5 border-b border-border">
              <Info className="h-3 w-3 text-primary shrink-0" />
              <p className="text-[10px] text-muted-foreground">AI suggestions only — you make the final decisions.</p>
            </div>

            {tab === "chat" ? (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">Ask me anything about your candidates</p>
                      <div className="space-y-2">
                        {QUICK_ACTIONS.map((qa) => (
                          <button
                            key={qa.label}
                            onClick={() => sendQuery(qa.query)}
                            className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <qa.icon className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-xs font-medium text-foreground">{qa.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Quick candidate summaries */}
                      {submissions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Quick Summaries</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {submissions.slice(0, 5).map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => summarizeCandidate(sub)}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-2"
                              >
                                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold shrink-0">
                                  {sub.candidate_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs text-foreground truncate">{sub.candidate_name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{sub.score}/{sub.total_questions}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                        <div
                          className={`rounded-xl px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/70 text-foreground"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        {/* Feedback buttons for assistant messages */}
                        {msg.role === "assistant" && msg.content && !isLoading && (
                          <div className="flex items-center gap-1 mt-1 ml-1">
                            <button
                              onClick={() => {
                                setMessages((prev) =>
                                  prev.map((m, idx) => idx === i ? { ...m, feedback: m.feedback === "up" ? null : "up" } : m)
                                );
                              }}
                              className={`p-1 rounded transition-colors ${
                                msg.feedback === "up"
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              }`}
                              title="Helpful"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                setMessages((prev) =>
                                  prev.map((m, idx) => idx === i ? { ...m, feedback: m.feedback === "down" ? null : "down" } : m)
                                );
                              }}
                              className={`p-1 rounded transition-colors ${
                                msg.feedback === "down"
                                  ? "text-destructive bg-destructive/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              }`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                            {msg.feedback === "down" && (
                              <span className="text-[10px] text-muted-foreground ml-1">Thanks for the feedback</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-secondary/70 rounded-xl px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendQuery(input);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. Show me candidates who scored above 80%..."
                      className="bg-background border-border text-sm"
                      disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              /* Compare Tab */
              <div className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[460px]">
                <p className="text-xs text-muted-foreground mb-3">Select 2-3 candidates to compare side-by-side</p>

                <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                  {submissions.map((sub) => (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedForCompare.includes(sub.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Checkbox
                        checked={selectedForCompare.includes(sub.id)}
                        onCheckedChange={() => toggleCompare(sub.id)}
                        disabled={!selectedForCompare.includes(sub.id) && selectedForCompare.length >= 3}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">{sub.candidate_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {sub.score}/{sub.total_questions} • {sub.knocked_out ? "Knocked Out" : sub.status}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>

                <Button
                  onClick={runComparison}
                  disabled={selectedForCompare.length < 2 || compareLoading}
                  className="w-full gap-2 mb-4"
                  variant="hero"
                  size="sm"
                >
                  {compareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {compareLoading ? "Comparing..." : `Compare ${selectedForCompare.length} Candidates`}
                </Button>

                {compareResult && (
                  <Card className="border-border bg-secondary/30">
                    <CardContent className="p-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1">
                        <ReactMarkdown>{compareResult}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistantPanel;
