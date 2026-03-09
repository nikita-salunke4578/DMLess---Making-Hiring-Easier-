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
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ violation: false, message: "No image provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ violation: false, message: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a proctoring AI for online tests. Analyze the webcam image and detect violations. 
Respond ONLY with a JSON object: {"violation": boolean, "message": string}

Violations to detect:
- No face visible / face not in frame
- Multiple people visible
- Person looking away from screen consistently (looking to the side or down, like reading from another device)
- Phone or secondary device visible
- Someone else in the background helping

If the person is looking at the screen normally, respond with {"violation": false, "message": "OK"}.
Be lenient with minor head movements. Only flag clear violations.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image },
              },
              {
                type: "text",
                text: "Analyze this proctoring frame. Is there a violation?",
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ violation: false, message: "Analysis unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify({ violation: !!parsed.violation, message: parsed.message || "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ violation: false, message: "OK" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Proctor analyze error:", error);
    return new Response(
      JSON.stringify({ violation: false, message: "Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
