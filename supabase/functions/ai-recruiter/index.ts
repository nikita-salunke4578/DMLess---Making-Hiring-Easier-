import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, submissions, questions, linkTitle, query, candidateIds, candidateNames } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "query") {
      // Natural language query over submissions
      const submissionsSummary = submissions.map((s: any) => ({
        name: s.candidate_name,
        email: s.candidate_email,
        score: s.score,
        total: s.total_questions,
        percentage: Math.round((s.score / (s.total_questions || 1)) * 100),
        status: s.knocked_out ? "knocked_out" : s.status,
        knockout_reason: s.knockout_reason,
        tab_switches: s.tab_switch_count,
        has_resume: !!s.resume_url,
        started: s.started_at,
        completed: s.completed_at,
      }));

      systemPrompt = `You are an AI recruiting assistant for DMless, a skill-first hiring platform. You help recruiters analyze candidate submissions for the job "${linkTitle}".

Here is the candidate data (${submissionsSummary.length} submissions):
${JSON.stringify(submissionsSummary, null, 2)}

The test has ${questions?.length || 0} questions.

CRITICAL RULES:
- ALL outputs are SUGGESTIONS, never decisions. Always frame recommendations with phrases like "Based on the data, I'd suggest...", "You may want to consider...", "It appears that..."
- The recruiter has final say on all hiring decisions — remind them of this when making strong recommendations
- Be concise and actionable
- Use markdown tables when showing multiple candidates
- Highlight key insights
- If filtering, show matching candidates clearly
- Reference scores as percentages when relevant
- End responses with a brief note like "💡 *This is an AI suggestion — please verify before acting.*"`;

      userPrompt = query;

    } else if (action === "summarize_resume") {
      systemPrompt = `You are an AI recruiting assistant. Analyze the candidate's test performance and provide a one-line summary of their key strengths. Frame this as a suggestion — the recruiter makes final decisions.

Job: "${linkTitle}"`;

      const candidate = submissions.find((s: any) => candidateIds?.includes(s.id));
      if (!candidate) throw new Error("Candidate not found");

      const questionDetails = questions?.map((q: any, i: number) => {
        const answers = typeof candidate.answers === "object" ? candidate.answers : {};
        const selected = answers[q.id];
        return {
          question: q.question_text,
          correct: selected === q.correct_option,
          is_knockout: q.is_knockout,
        };
      });

      userPrompt = `Candidate: ${candidate.candidate_name} (${candidate.candidate_email})
Score: ${candidate.score}/${candidate.total_questions} (${Math.round((candidate.score / (candidate.total_questions || 1)) * 100)}%)
Status: ${candidate.knocked_out ? "Knocked Out - " + candidate.knockout_reason : candidate.status}
Tab Switches: ${candidate.tab_switch_count}
Has Resume: ${candidate.resume_url ? "Yes" : "No"}

Question performance:
${JSON.stringify(questionDetails, null, 2)}

Provide a concise one-line summary of this candidate's key skills and performance, suitable for quick scanning by a recruiter.`;

    } else if (action === "compare") {
      systemPrompt = `You are an AI recruiting assistant for DMless. Compare the selected candidates side-by-side for the job "${linkTitle}".

CRITICAL RULES:
- ALL outputs are SUGGESTIONS, never decisions. Use phrases like "Based on the data, I'd suggest..." or "You may want to consider..."
- Create a clear markdown comparison table
- Highlight strengths and weaknesses of each candidate
- Provide a suggested recommendation at the end, but remind the recruiter they have final say
- Be concise but thorough
- End with "💡 *This is an AI suggestion — please verify before acting.*"`;

      const selected = submissions.filter((s: any) => candidateIds?.includes(s.id));
      if (selected.length < 2) throw new Error("Select at least 2 candidates to compare");

      const candidateDetails = selected.map((s: any) => {
        const answers = typeof s.answers === "object" ? s.answers : {};
        const questionPerf = questions?.map((q: any) => ({
          question: q.question_text,
          correct: answers[q.id] === q.correct_option,
          is_knockout: q.is_knockout,
        }));

        return {
          name: s.candidate_name,
          email: s.candidate_email,
          score: `${s.score}/${s.total_questions} (${Math.round((s.score / (s.total_questions || 1)) * 100)}%)`,
          status: s.knocked_out ? "Knocked Out" : s.status,
          knockout_reason: s.knockout_reason,
          tab_switches: s.tab_switch_count,
          has_resume: !!s.resume_url,
          question_performance: questionPerf,
        };
      });

      userPrompt = `Compare these ${selected.length} candidates:\n${JSON.stringify(candidateDetails, null, 2)}`;

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-recruiter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
