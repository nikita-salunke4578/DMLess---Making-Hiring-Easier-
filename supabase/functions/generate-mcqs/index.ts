import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTitle, jobDescription, numberOfQuestions } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "Job title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const count = Math.min(Math.max(numberOfQuestions || 5, 1), 20);

    const systemPrompt = `You are an expert technical recruiter creating MCQ questions for candidate assessments. Generate challenging but fair multiple-choice questions that test practical knowledge relevant to the job role. Each question must have exactly 4 options with one correct answer.`;

    const userPrompt = `Generate ${count} MCQ questions for a "${jobTitle}" position.${jobDescription ? ` Job description: ${jobDescription}` : ""}

Requirements:
- Questions should test practical, job-relevant knowledge
- Each question has exactly 4 options (A, B, C, D)
- One option must be the correct answer
- Mix difficulty levels (some easy, some medium, some hard)
- Mark 1-2 questions as "knockout" (critical knowledge that a qualified candidate must know)`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate MCQ questions for a hiring assessment.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "The question text" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Exactly 4 answer options",
                        },
                        correct_option: {
                          type: "number",
                          description: "Index (0-3) of the correct option",
                        },
                        is_knockout: {
                          type: "boolean",
                          description: "Whether this is a knockout question",
                        },
                      },
                      required: ["question_text", "options", "correct_option", "is_knockout"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ questions: parsed.questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-mcqs error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
