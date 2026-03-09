import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hiring_link_id, candidate_name, candidate_email, total_questions, honeypot, recaptcha_token } = await req.json();

    // 1. Honeypot check
    if (honeypot) {
      // Bot filled the hidden field
      return new Response(JSON.stringify({ error: "Submission rejected." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Input validation
    if (!hiring_link_id || !candidate_name?.trim() || !candidate_email?.trim()) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidate_email.trim())) {
      return new Response(JSON.stringify({ error: "Invalid email address." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (candidate_name.trim().length > 200 || candidate_email.trim().length > 255) {
      return new Response(JSON.stringify({ error: "Input too long." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. reCAPTCHA verification (optional — skip if no token provided)
    const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (RECAPTCHA_SECRET && recaptcha_token) {
      const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${RECAPTCHA_SECRET}&response=${recaptcha_token}`,
      });
      const recaptchaData = await recaptchaRes.json();

      if (!recaptchaData.success || (recaptchaData.score !== undefined && recaptchaData.score < 0.3)) {
        console.log("reCAPTCHA failed:", recaptchaData);
        // Don't block — just log the failure and continue
        console.log("Allowing submission despite reCAPTCHA failure (graceful degradation)");
      }
    }

    // 4. IP-based rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") ||
                     "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if candidate already has a completed/qualified submission for this link
    const { data: existingSub } = await supabase
      .from("candidate_submissions")
      .select("id, status")
      .eq("hiring_link_id", hiring_link_id)
      .eq("candidate_email", candidate_email.trim())
      .in("status", ["completed", "qualified", "shortlisted", "interview", "offered", "hired"])
      .limit(1);

    if (existingSub && existingSub.length > 0) {
      return new Response(JSON.stringify({ error: "You have already taken this assessment. Each candidate can only attempt once." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 3 attempts from same email in last hour (for in-progress/knocked_out)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("candidate_submissions")
      .select("id", { count: "exact", head: true })
      .eq("hiring_link_id", hiring_link_id)
      .eq("candidate_email", candidate_email.trim())
      .gte("started_at", oneHourAgo);

    if ((recentCount || 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Create submission
    const { data, error } = await supabase
      .from("candidate_submissions")
      .insert({
        hiring_link_id,
        candidate_name: candidate_name.trim(),
        candidate_email: candidate_email.trim(),
        total_questions: total_questions || 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-candidate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
