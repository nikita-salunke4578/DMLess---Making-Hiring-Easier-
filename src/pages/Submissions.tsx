import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, ArrowLeft, Users, CheckCircle, XCircle, AlertTriangle,
  Clock, Monitor, ChevronDown, ChevronUp, Search, ArrowUpDown, Trash2, FileText, Download, Video, CalendarDays,
  CheckSquare, Square, UserCheck, Briefcase, Star, Ban, BarChart3, TrendingUp, Timer, Target, Award,
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import AIAssistantPanel from "@/components/AIAssistantPanel";
import ScheduleInterviewDialog from "@/components/ScheduleInterviewDialog";

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
  video_intro_url: string | null;
}

interface Question {
  id: string;
  question_text: string;
  options: Json;
  correct_option: number;
  is_knockout: boolean;
  sort_order: number;
}

const PIPELINE_STATUSES = [
  { key: "qualified", label: "Qualified", icon: CheckCircle, color: "text-emerald-500" },
  { key: "shortlisted", label: "Shortlisted", icon: Star, color: "text-amber-500" },
  { key: "interview", label: "Interview", icon: CalendarDays, color: "text-blue-500" },
  { key: "offered", label: "Offered", icon: Briefcase, color: "text-violet-500" },
  { key: "hired", label: "Hired", icon: UserCheck, color: "text-primary" },
  { key: "rejected", label: "Rejected", icon: Ban, color: "text-destructive" },
] as const;

type FilterType = "all" | "qualified" | "shortlisted" | "interview" | "offered" | "hired" | "rejected" | "knocked_out" | "completed";
type SortType = "date_desc" | "date_asc" | "score_desc" | "score_asc" | "name_asc" | "name_desc";

const VideoPlayer = ({ videoPath }: { videoPath: string }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadVideo = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.storage.from("video-intros").download(videoPath);
      if (data) setVideoUrl(URL.createObjectURL(data));
    } catch { /* silently fail */ } finally { setLoading(false); }
  };

  if (videoUrl) return <video src={videoUrl} controls className="w-full max-w-md rounded-lg border border-border aspect-video" />;
  return (
    <Button variant="outline" size="sm" onClick={loadVideo} disabled={loading} className="gap-1.5">
      {loading ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Video className="h-4 w-4" />}
      {loading ? "Loading..." : "Play Video"}
    </Button>
  );
};

const Submissions = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("date_desc");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [interviewCandidate, setInterviewCandidate] = useState<Submission | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("candidates");

  const handleDelete = async (submissionId: string) => {
    const { error } = await supabase.from("candidate_submissions").delete().eq("id", submissionId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete submission.", variant: "destructive" });
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    setExpandedId(null);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(submissionId); return n; });
    toast({ title: "Deleted", description: "Candidate submission removed." });
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !linkId) return;
    (async () => {
      const [{ data: link }, { data: subs }, { data: qs }] = await Promise.all([
        supabase.from("hiring_links").select("title").eq("id", linkId).single(),
        supabase.from("candidate_submissions").select("*").eq("hiring_link_id", linkId).order("started_at", { ascending: false }),
        supabase.from("questions").select("*").eq("hiring_link_id", linkId).order("sort_order"),
      ]);
      setLinkTitle(link?.title || "");
      setSubmissions((subs as Submission[]) || []);
      setQuestions((qs as Question[]) || []);
      setLoading(false);
    })();
  }, [user, linkId]);

  // Status helpers
  const statusBadge = (sub: Submission) => {
    if (sub.knocked_out) return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Knocked Out</Badge>;
    const pipelineStatus = PIPELINE_STATUSES.find(p => p.key === sub.status);
    if (pipelineStatus) {
      const Icon = pipelineStatus.icon;
      return <Badge variant="outline" className={`gap-1 ${pipelineStatus.color} border-current/30`}><Icon className="h-3 w-3" />{pipelineStatus.label}</Badge>;
    }
    if (sub.status === "completed") return <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />In Progress</Badge>;
  };

  const updateStatus = async (submissionId: string, newStatus: string) => {
    const { error } = await supabase.from("candidate_submissions").update({ status: newStatus }).eq("id", submissionId);
    if (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      return;
    }
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status: newStatus } : s));
    toast({ title: "Updated", description: `Status changed to ${newStatus}.` });
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("candidate_submissions").update({ status: newStatus }).in("id", ids);
    if (error) {
      toast({ title: "Error", description: "Failed to update statuses.", variant: "destructive" });
    } else {
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: newStatus } : s));
      setSelectedIds(new Set());
      toast({ title: "Updated", description: `${ids.length} candidate(s) moved to ${newStatus}.` });
    }
    setBulkUpdating(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedSubmissions.map(s => s.id)));
    }
  };

  const answersObj = (a: Json): Record<string, number> => {
    if (typeof a === "object" && a !== null && !Array.isArray(a)) return a as Record<string, number>;
    return {};
  };

  // Analytics computations
  const analytics = useMemo(() => {
    const total = submissions.length;
    const completed = submissions.filter(s => ["completed", "qualified", "shortlisted", "interview", "offered", "hired", "rejected"].includes(s.status)).length;
    const knockedOut = submissions.filter(s => s.knocked_out).length;
    const inProgress = submissions.filter(s => s.status === "in_progress").length;
    const qualified = submissions.filter(s => ["qualified", "shortlisted", "interview", "offered", "hired"].includes(s.status) && !s.knocked_out).length;
    const hired = submissions.filter(s => s.status === "hired").length;
    const rejected = submissions.filter(s => s.status === "rejected").length;

    const completedSubs = submissions.filter(s => s.completed_at && s.started_at && !s.knocked_out);
    const avgTimeMinutes = completedSubs.length > 0
      ? completedSubs.reduce((acc, s) => acc + (new Date(s.completed_at!).getTime() - new Date(s.started_at).getTime()) / 60000, 0) / completedSubs.length
      : 0;

    const scoreSubs = submissions.filter(s => ["completed", "qualified", "shortlisted", "interview", "offered", "hired", "rejected"].includes(s.status));
    const avgScore = scoreSubs.length > 0 ? scoreSubs.reduce((a, s) => a + s.score, 0) / scoreSubs.length : 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const qualificationRate = completed > 0 ? Math.round((qualified / completed) * 100) : 0;
    const hireRate = qualified > 0 ? Math.round((hired / qualified) * 100) : 0;

    // Pipeline counts
    const pipeline = {
      qualified: submissions.filter(s => s.status === "qualified" && !s.knocked_out).length,
      shortlisted: submissions.filter(s => s.status === "shortlisted").length,
      interview: submissions.filter(s => s.status === "interview").length,
      offered: submissions.filter(s => s.status === "offered").length,
      hired: submissions.filter(s => s.status === "hired").length,
      rejected: submissions.filter(s => s.status === "rejected").length,
    };

    return { total, completed, knockedOut, inProgress, qualified, hired, rejected, avgTimeMinutes, avgScore, completionRate, qualificationRate, hireRate, pipeline };
  }, [submissions]);

  const processedSubmissions = useMemo(() => {
    let result = [...submissions];
    if (filter === "all") { /* no filter */ }
    else if (filter === "knocked_out") result = result.filter(s => s.knocked_out);
    else result = result.filter(s => s.status === filter && !s.knocked_out);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.candidate_name.toLowerCase().includes(q) || s.candidate_email.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "date_desc": return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
        case "date_asc": return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        case "score_desc": return b.score - a.score;
        case "score_asc": return a.score - b.score;
        case "name_asc": return a.candidate_name.localeCompare(b.candidate_name);
        case "name_desc": return b.candidate_name.localeCompare(a.candidate_name);
        default: return 0;
      }
    });
    return result;
  }, [submissions, filter, search, sortBy]);

  const exportCSV = () => {
    if (processedSubmissions.length === 0) {
      toast({ title: "No data", description: "No submissions to export.", variant: "destructive" });
      return;
    }
    const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const headers = ["Name", "Email", "Status", "Score", "Total Questions", "Tab Switches", "Knockout Reason", "Started At", "Completed At", "Resume"];
    const rows = processedSubmissions.map(s => [
      escapeCSV(s.candidate_name), escapeCSV(s.candidate_email), escapeCSV(s.knocked_out ? "Knocked Out" : s.status),
      s.score, s.total_questions, s.tab_switch_count, escapeCSV(s.knockout_reason || ""),
      escapeCSV(s.started_at), escapeCSV(s.completed_at || ""), escapeCSV(s.resume_url ? "Yes" : "No"),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${linkTitle || "submissions"}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: `${processedSubmissions.length} submissions exported to CSV.` });
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="font-display text-xl font-bold text-foreground">DM<span className="text-primary">less</span></span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">{linkTitle}</h1>
          <p className="text-muted-foreground mb-8">Candidate Submissions</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="candidates" className="gap-1.5"><Users className="h-4 w-4" />Candidates</TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-1.5"><TrendingUp className="h-4 w-4" />Pipeline</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
            </TabsList>

            {/* === PIPELINE TAB === */}
            <TabsContent value="pipeline">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {PIPELINE_STATUSES.map(ps => {
                  const count = analytics.pipeline[ps.key as keyof typeof analytics.pipeline] || 0;
                  const Icon = ps.icon;
                  return (
                    <Card key={ps.key} className="border-border bg-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFilter(ps.key as FilterType); setActiveTab("candidates"); }}>
                      <CardContent className="py-5 px-4 text-center">
                        <div className={`h-10 w-10 rounded-xl mx-auto mb-3 flex items-center justify-center bg-secondary ${ps.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="text-3xl font-display font-bold text-foreground">{count}</p>
                        <p className="text-xs text-muted-foreground mt-1">{ps.label}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Click a stage to filter candidates. Use bulk actions or the dropdown on each candidate to move them through the pipeline.</span>
              </div>
            </TabsContent>

            {/* === ANALYTICS TAB === */}
            <TabsContent value="analytics">
              {(() => {
                // Donut chart data
                const statusData = [
                  { name: "Qualified", value: analytics.pipeline.qualified, color: "hsl(160, 60%, 45%)" },
                  { name: "Shortlisted", value: analytics.pipeline.shortlisted, color: "hsl(38, 92%, 50%)" },
                  { name: "Interview", value: analytics.pipeline.interview, color: "hsl(217, 91%, 60%)" },
                  { name: "Offered", value: analytics.pipeline.offered, color: "hsl(263, 70%, 58%)" },
                  { name: "Hired", value: analytics.pipeline.hired, color: "hsl(174, 72%, 52%)" },
                  { name: "Rejected", value: analytics.pipeline.rejected, color: "hsl(0, 72%, 55%)" },
                  { name: "Knocked Out", value: analytics.knockedOut, color: "hsl(0, 40%, 40%)" },
                  { name: "In Progress", value: analytics.inProgress, color: "hsl(220, 14%, 40%)" },
                ].filter(d => d.value > 0);

                // Score distribution
                const scoreBuckets = (() => {
                  if (questions.length === 0) return [];
                  const total = questions.length;
                  const buckets = [
                    { range: "0-25%", min: 0, max: total * 0.25, count: 0 },
                    { range: "26-50%", min: total * 0.25, max: total * 0.5, count: 0 },
                    { range: "51-75%", min: total * 0.5, max: total * 0.75, count: 0 },
                    { range: "76-100%", min: total * 0.75, max: total + 1, count: 0 },
                  ];
                  submissions.filter(s => s.status !== "in_progress").forEach(s => {
                    const b = buckets.find(b => s.score >= b.min && s.score < b.max);
                    if (b) b.count++;
                  });
                  return buckets.map(b => ({ range: b.range, count: b.count }));
                })();

                // Daily submissions over time
                const dailyData = (() => {
                  const map = new Map<string, number>();
                  submissions.forEach(s => {
                    const day = new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    map.set(day, (map.get(day) || 0) + 1);
                  });
                  return Array.from(map.entries()).slice(-14).map(([date, count]) => ({ date, count }));
                })();

                return (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                      {[
                        { label: "Total Candidates", value: analytics.total, icon: Users, sub: "" },
                        { label: "Completion Rate", value: `${analytics.completionRate}%`, icon: Target, sub: `${analytics.completed} of ${analytics.total}` },
                        { label: "Qualification Rate", value: `${analytics.qualificationRate}%`, icon: Award, sub: `${analytics.qualified} qualified` },
                        { label: "Avg Score", value: `${analytics.avgScore.toFixed(1)}/${questions.length}`, icon: Star, sub: `${questions.length > 0 ? Math.round((analytics.avgScore / questions.length) * 100) : 0}%` },
                        { label: "Avg Completion Time", value: `${analytics.avgTimeMinutes.toFixed(0)}m`, icon: Timer, sub: analytics.avgTimeMinutes > 0 ? `${Math.floor(analytics.avgTimeMinutes / 60)}h ${Math.round(analytics.avgTimeMinutes % 60)}m` : "N/A" },
                      ].map(s => (
                        <Card key={s.label} className="border-border bg-card overflow-hidden">
                          <CardContent className="py-5 px-5">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <s.icon className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-xs text-muted-foreground">{s.label}</span>
                            </div>
                            <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                            {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Status Distribution Donut */}
                      <Card className="border-border bg-card">
                        <CardContent className="py-6 px-6">
                          <h3 className="font-display font-semibold text-foreground mb-4">Candidate Distribution</h3>
                          {statusData.length > 0 ? (
                            <div className="flex items-center gap-6">
                              <div className="w-48 h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 20%, 95%)" }} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="grid gap-2 flex-1">
                                {statusData.map(d => (
                                  <div key={d.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
                                      <span className="text-muted-foreground">{d.name}</span>
                                    </div>
                                    <span className="font-medium text-foreground">{d.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No data yet.</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Score Distribution Bar Chart */}
                      <Card className="border-border bg-card">
                        <CardContent className="py-6 px-6">
                          <h3 className="font-display font-semibold text-foreground mb-4">Score Distribution</h3>
                          {scoreBuckets.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={scoreBuckets} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                                <XAxis dataKey="range" tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RechartsTooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 20%, 95%)" }} />
                                <Bar dataKey="count" fill="hsl(174, 72%, 52%)" radius={[6, 6, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-muted-foreground text-sm">No scores yet.</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Submissions Over Time */}
                    <Card className="border-border bg-card mb-6">
                      <CardContent className="py-6 px-6">
                        <h3 className="font-display font-semibold text-foreground mb-4">Submissions Over Time</h3>
                        {dailyData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={dailyData}>
                              <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(174, 72%, 52%)" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(174, 72%, 52%)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                              <XAxis dataKey="date" tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <RechartsTooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 20%, 95%)" }} />
                              <Area type="monotone" dataKey="count" stroke="hsl(174, 72%, 52%)" fill="url(#colorCount)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-muted-foreground text-sm">No submission data yet.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pipeline Funnel + Extra Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-border bg-card">
                        <CardContent className="py-6 px-6">
                          <h3 className="font-display font-semibold text-foreground mb-4">Hiring Funnel</h3>
                          <div className="space-y-2">
                            {[
                              { label: "Started", count: analytics.total, color: "hsl(220, 14%, 40%)" },
                              { label: "Completed", count: analytics.completed, color: "hsl(174, 72%, 52%)" },
                              { label: "Qualified", count: analytics.qualified, color: "hsl(160, 60%, 45%)" },
                              { label: "Shortlisted", count: analytics.pipeline.shortlisted, color: "hsl(38, 92%, 50%)" },
                              { label: "Interview", count: analytics.pipeline.interview, color: "hsl(217, 91%, 60%)" },
                              { label: "Hired", count: analytics.pipeline.hired, color: "hsl(174, 72%, 52%)" },
                            ].map((step, i) => {
                              const pct = analytics.total > 0 ? Math.max((step.count / analytics.total) * 100, step.count > 0 ? 4 : 0) : 0;
                              const dropOff = i > 0 && analytics.total > 0 
                                ? `${Math.round(((analytics.total - step.count) / analytics.total) * 100)}% drop`
                                : "";
                              return (
                                <div key={step.label} className="group">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-20 text-right">{step.label}</span>
                                    <div className="flex-1 h-7 bg-secondary/50 rounded-md overflow-hidden relative">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                        className="h-full rounded-md"
                                        style={{ background: step.color }}
                                      />
                                      <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-foreground">
                                        {step.count}
                                        {dropOff && <span className="ml-auto text-[10px] text-muted-foreground font-normal opacity-0 group-hover:opacity-100 transition-opacity">{dropOff}</span>}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-card">
                        <CardContent className="py-6 px-6">
                          <h3 className="font-display font-semibold text-foreground mb-4">Key Insights</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Hire Rate</span></div>
                              <span className="text-lg font-bold text-foreground">{analytics.hireRate}%</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /><span className="text-sm text-muted-foreground">Knockout Rate</span></div>
                              <span className="text-lg font-bold text-foreground">{analytics.total > 0 ? Math.round((analytics.knockedOut / analytics.total) * 100) : 0}%</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-amber-500" /><span className="text-sm text-muted-foreground">Avg Tab Switches</span></div>
                              <span className="text-lg font-bold text-foreground">
                                {submissions.length > 0 ? (submissions.reduce((a, s) => a + s.tab_switch_count, 0) / submissions.length).toFixed(1) : 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2"><Ban className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Rejected</span></div>
                              <span className="text-lg font-bold text-foreground">{analytics.rejected}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                );
              })()}
            </TabsContent>

            {/* === CANDIDATES TAB === */}
            <TabsContent value="candidates">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total", value: submissions.length, icon: Users },
                  { label: "Qualified", value: analytics.qualified, icon: CheckCircle },
                  { label: "Knocked Out", value: analytics.knockedOut, icon: XCircle },
                  { label: "Avg Score", value: `${analytics.avgScore.toFixed(1)}/${questions.length}`, icon: Zap },
                ].map(s => (
                  <Card key={s.label} className="border-border bg-card">
                    <CardContent className="py-4 px-5 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-primary" /></div>
                      <div><p className="text-2xl font-display font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bulk actions bar */}
              {selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground mr-2">{selectedIds.size} selected</span>
                  {PIPELINE_STATUSES.map(ps => (
                    <Button key={ps.key} variant="outline" size="sm" onClick={() => bulkUpdateStatus(ps.key)} disabled={bulkUpdating} className="gap-1 text-xs">
                      <ps.icon className={`h-3 w-3 ${ps.color}`} />{ps.label}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs">Clear</Button>
                </motion.div>
              )}

              {/* Filters + Search + Sort */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex gap-2 flex-wrap">
                  {([
                    { key: "all" as FilterType, label: "All", count: submissions.length },
                    { key: "qualified" as FilterType, label: "Qualified", count: analytics.pipeline.qualified },
                    { key: "shortlisted" as FilterType, label: "Shortlisted", count: analytics.pipeline.shortlisted },
                    { key: "interview" as FilterType, label: "Interview", count: analytics.pipeline.interview },
                    { key: "hired" as FilterType, label: "Hired", count: analytics.pipeline.hired },
                    { key: "knocked_out" as FilterType, label: "Knocked Out", count: analytics.knockedOut },
                  ]).map(f => (
                    <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" onClick={() => setFilter(f.key)} className="gap-1.5">
                      {f.label} <span className="opacity-70">({f.count})</span>
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="h-4 w-4" /> Export CSV</Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..." className="pl-9 bg-background border-border w-56" />
                  </div>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortType)}>
                    <SelectTrigger className="w-40 bg-background border-border"><ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Newest first</SelectItem>
                      <SelectItem value="date_asc">Oldest first</SelectItem>
                      <SelectItem value="score_desc">Highest score</SelectItem>
                      <SelectItem value="score_asc">Lowest score</SelectItem>
                      <SelectItem value="name_asc">Name A-Z</SelectItem>
                      <SelectItem value="name_desc">Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Select all checkbox */}
              {processedSubmissions.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                    {selectedIds.size === processedSubmissions.length ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                  </button>
                  <span className="text-sm text-muted-foreground">Select all ({processedSubmissions.length})</span>
                </div>
              )}

              {processedSubmissions.length === 0 ? (
                <Card className="border-border bg-card p-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-display font-semibold text-foreground mb-1">
                    {submissions.length === 0 ? "No submissions yet" : "No matching submissions"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {submissions.length === 0 ? "Share your hiring link to start receiving candidates." : "Try changing the filter or search term."}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {processedSubmissions.map(sub => {
                    const isExpanded = expandedId === sub.id;
                    const isSelected = selectedIds.has(sub.id);
                    const ans = answersObj(sub.answers);
                    return (
                      <Card key={sub.id} className={`border-border bg-card overflow-hidden ${isSelected ? "ring-2 ring-primary/50" : ""}`}>
                        <div className="flex items-center">
                          {/* Checkbox */}
                          <button onClick={() => toggleSelect(sub.id)} className="pl-4 py-4 text-muted-foreground hover:text-foreground transition-colors">
                            {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                          </button>

                          <button className="flex-1" onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                            <CardContent className="flex items-center justify-between py-4 px-4">
                              <div className="flex items-center gap-4 text-left">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm">
                                  {sub.candidate_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="font-display font-semibold text-foreground">{sub.candidate_name}</h3>
                                  <p className="text-xs text-muted-foreground">{sub.candidate_email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                  <p className="text-sm font-bold text-foreground">{sub.score}/{sub.total_questions}</p>
                                  <p className="text-xs text-muted-foreground">Score</p>
                                </div>
                                {sub.tab_switch_count > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-destructive"><Monitor className="h-3 w-3" />{sub.tab_switch_count}</div>
                                )}
                                {statusBadge(sub)}
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </CardContent>
                          </button>
                        </div>

                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border">
                            <div className="px-6 py-4 space-y-4">
                              {/* Pipeline status changer */}
                              {!sub.knocked_out && sub.status !== "in_progress" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-muted-foreground mr-1">Move to:</span>
                                  {PIPELINE_STATUSES.map(ps => (
                                    <Button key={ps.key} variant={sub.status === ps.key ? "default" : "outline"} size="sm"
                                      onClick={() => updateStatus(sub.id, ps.key)} className="gap-1 text-xs"
                                      disabled={sub.status === ps.key}>
                                      <ps.icon className={`h-3 w-3 ${sub.status === ps.key ? "" : ps.color}`} />{ps.label}
                                    </Button>
                                  ))}
                                </div>
                              )}

                              {sub.knocked_out && sub.knockout_reason && (
                                <div className="bg-destructive/10 text-destructive rounded-lg p-3 flex items-center gap-2 text-sm">
                                  <AlertTriangle className="h-4 w-4 shrink-0" /><span>Knockout reason: {sub.knockout_reason}</span>
                                </div>
                              )}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Started:</span><br /><span className="text-foreground">{new Date(sub.started_at).toLocaleString()}</span></div>
                                <div><span className="text-muted-foreground">Completed:</span><br /><span className="text-foreground">{sub.completed_at ? new Date(sub.completed_at).toLocaleString() : "—"}</span></div>
                                <div><span className="text-muted-foreground">Tab Switches:</span><br /><span className={`font-bold ${sub.tab_switch_count > 0 ? "text-destructive" : "text-foreground"}`}>{sub.tab_switch_count}</span></div>
                                <div><span className="text-muted-foreground">Score:</span><br /><span className="text-foreground font-bold">{sub.score}/{sub.total_questions} ({Math.round((sub.score / (sub.total_questions || 1)) * 100)}%)</span></div>
                              </div>

                              <h4 className="font-display font-semibold text-foreground text-sm mt-4">Answer Breakdown</h4>
                              <div className="space-y-2">
                                {questions.map((q, qi) => {
                                  const selected = ans[q.id];
                                  const isCorrect = selected === q.correct_option;
                                  const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
                                  return (
                                    <div key={q.id} className="bg-secondary/30 rounded-lg p-3">
                                      <div className="flex items-start gap-2">
                                        {selected !== undefined ? (
                                          isCorrect ? <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                        ) : (
                                          <span className="h-4 w-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0 inline-block" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-foreground font-medium">
                                            Q{qi + 1}. {q.question_text}
                                            {q.is_knockout && <span className="ml-2 text-xs text-destructive">(Knockout)</span>}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Selected: <span className={isCorrect ? "text-primary" : "text-destructive"}>{selected !== undefined ? opts[selected] || "—" : "Not answered"}</span>
                                            {!isCorrect && <span className="ml-2">• Correct: <span className="text-primary">{opts[q.correct_option] || "—"}</span></span>}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Video Intro */}
                              {sub.video_intro_url && (
                                <div className="pt-2 border-t border-border">
                                  <h4 className="font-display font-semibold text-foreground text-sm mb-2 flex items-center gap-1.5">
                                    <Video className="h-4 w-4 text-primary" /> Video Introduction
                                  </h4>
                                  <VideoPlayer videoPath={sub.video_intro_url} />
                                </div>
                              )}

                              {/* Resume + Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-border">
                                {sub.resume_url ? (
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
                                      try {
                                        const { data } = await supabase.storage.from("resumes").download(sub.resume_url!);
                                        if (data) window.open(URL.createObjectURL(data), "_blank");
                                      } catch { toast({ title: "Error", description: "Failed to open resume.", variant: "destructive" }); }
                                    }}>
                                      <FileText className="h-4 w-4" />View Resume
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
                                      try {
                                        const { data } = await supabase.storage.from("resumes").download(sub.resume_url!);
                                        if (data) {
                                          const url = URL.createObjectURL(data);
                                          const a = document.createElement("a");
                                          a.href = url; a.download = sub.resume_url!.split("/").pop() || "resume"; a.click();
                                          URL.revokeObjectURL(url);
                                        }
                                      } catch { toast({ title: "Error", description: "Failed to download resume.", variant: "destructive" }); }
                                    }}>
                                      <Download className="h-4 w-4" />Download
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No resume uploaded</span>
                                )}
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="gap-1.5" onClick={e => { e.stopPropagation(); setInterviewCandidate(sub); }}>
                                    <CalendarDays className="h-4 w-4" />Schedule Interview
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                                        <Trash2 className="h-4 w-4" />Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently remove {sub.candidate_name}'s submission.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(sub.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <ScheduleInterviewDialog
        open={!!interviewCandidate}
        onOpenChange={open => !open && setInterviewCandidate(null)}
        candidateName={interviewCandidate?.candidate_name || ""}
        candidateEmail={interviewCandidate?.candidate_email || ""}
        testTitle={linkTitle}
      />
      <AIAssistantPanel submissions={submissions} questions={questions} linkTitle={linkTitle} />
    </div>
  );
};

export default Submissions;
