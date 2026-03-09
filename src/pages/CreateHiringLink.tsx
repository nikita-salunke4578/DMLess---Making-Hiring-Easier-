import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Plus, Trash2, AlertTriangle, GripVertical, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  is_knockout: boolean;
}

const generateSlug = () => Math.random().toString(36).substring(2, 10);

const CreateHiringLink = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCount, setAiCount] = useState(5);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);
  const [passingScore, setPassingScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), question_text: "", options: ["", "", "", ""], correct_option: 0, is_knockout: false },
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: crypto.randomUUID(), question_text: "", options: ["", "", "", ""], correct_option: 0, is_knockout: false },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, options: q.options.map((o, i) => (i === optIndex ? value : o)) } : q
      )
    );
  };

  const handleGenerateAI = async () => {
    if (!title.trim()) {
      toast({ title: "Job title required", description: "Enter a job title first so AI can generate relevant questions.", variant: "destructive" });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mcqs", {
        body: {
          jobTitle: title.trim(),
          jobDescription: description.trim() || undefined,
          numberOfQuestions: aiCount,
        },
      });

      if (error) throw new Error(error.message || "AI generation failed");
      if (data?.error) throw new Error(data.error);

      const generated: Question[] = (data.questions || []).map((q: any) => ({
        id: crypto.randomUUID(),
        question_text: q.question_text || "",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["", "", "", ""],
        correct_option: typeof q.correct_option === "number" ? q.correct_option : 0,
        is_knockout: !!q.is_knockout,
      }));

      if (generated.length === 0) throw new Error("No questions generated");

      setQuestions(generated);
      toast({ title: "Questions generated!", description: `${generated.length} questions created. Review and edit as needed.` });
    } catch (err: any) {
      toast({ title: "AI Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      toast({ title: "Error", description: "Job title is required.", variant: "destructive" });
      return;
    }
    for (const q of questions) {
      if (!q.question_text.trim()) {
        toast({ title: "Error", description: "All questions must have text.", variant: "destructive" });
        return;
      }
      if (q.options.some((o) => !o.trim())) {
        toast({ title: "Error", description: "All options must be filled.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const slug = generateSlug();

      const { data: link, error: linkError } = await supabase
        .from("hiring_links")
        .insert({
          recruiter_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          slug,
          time_limit_minutes: timeLimitMinutes,
          max_tab_switches: maxTabSwitches,
          passing_score: passingScore,
        })
        .select("id")
        .single();

      if (linkError) throw linkError;

      const questionsToInsert = questions.map((q, i) => ({
        hiring_link_id: link.id,
        question_text: q.question_text.trim(),
        options: q.options,
        correct_option: q.correct_option,
        is_knockout: q.is_knockout,
        sort_order: i,
      }));

      const { error: qError } = await supabase.from("questions").insert(questionsToInsert);
      if (qError) throw qError;

      toast({ title: "Success!", description: "Hiring link created successfully." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">
              DM<span className="text-primary">less</span>
            </span>
          </div>
        </div>
      </nav>

      <div className="container max-w-3xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Create Hiring Link</h1>
          <p className="text-muted-foreground mb-8">Set up your job and MCQ challenge for candidates.</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Job Details */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Job Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior React Developer" className="bg-background border-border" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief job description..." className="bg-background border-border" rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Anti-Cheat Settings */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Anti-Cheat Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Time Limit (minutes)</Label>
                    <Input type="number" min={5} max={120} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Number(e.target.value))} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Max Tab Switches</Label>
                    <Input type="number" min={0} max={10} value={maxTabSwitches} onChange={(e) => setMaxTabSwitches(Number(e.target.value))} className="bg-background border-border" />
                    <p className="text-xs text-muted-foreground">Candidate is knocked out after exceeding this.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Minimum Passing Score (%)</Label>
                  <Input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="bg-background border-border" />
                  <p className="text-xs text-muted-foreground">
                    Candidates must score at least this percentage to qualify.
                    {questions.length > 0 && passingScore > 0 && (
                      <span className="text-primary font-medium"> → {Math.ceil((passingScore / 100) * questions.length)}/{questions.length} correct answers needed.</span>
                    )}
                    {" "}Set 0 to disable.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold text-foreground">MCQ Questions</h2>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1">
                    <Plus className="h-4 w-4" /> Add Question
                  </Button>
                </div>
              </div>

              {/* AI Generation Card */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Sparkles className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">AI Question Generator</p>
                        <p className="text-xs text-muted-foreground">Generate questions based on job title. You can edit them after.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={aiCount}
                        onChange={(e) => setAiCount(Number(e.target.value))}
                        className="w-16 bg-background border-border h-9 text-center"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleGenerateAI}
                        disabled={aiLoading}
                        className="gap-1.5"
                      >
                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {aiLoading ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {questions.map((q, qIndex) => (
                <Card key={q.id} className="border-border bg-card">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        <span className="font-display font-semibold text-foreground">Q{qIndex + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={q.is_knockout}
                            onCheckedChange={(v) => updateQuestion(q.id, "is_knockout", v)}
                          />
                          <Label className="text-xs text-destructive font-medium">Knockout</Label>
                        </div>
                        {questions.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Input
                      value={q.question_text}
                      onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                      placeholder="Enter your question..."
                      className="bg-background border-border"
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.id, "correct_option", optIdx)}
                            className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              q.correct_option === optIdx
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <span className="text-xs font-bold">{String.fromCharCode(65 + optIdx)}</span>
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            className="bg-background border-border"
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Click the circle to mark the correct answer. {q.is_knockout && "⚠️ Wrong answer = instant knockout."}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={loading} className="gap-2">
                {loading ? "Creating..." : "Create Hiring Link"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateHiringLink;
