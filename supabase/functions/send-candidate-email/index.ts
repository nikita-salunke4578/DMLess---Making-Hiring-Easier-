import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { candidateEmail, candidateName, testTitle, type, score, totalQuestions, knockoutReason, passingScore, recruiterId, hiringLinkSlug, interviewDate, meetingLink } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!candidateEmail || !candidateName || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    let subject = "";
    let html = "";

    const footer = `
      <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by DMless</p>
      </div>`;

    const wrapper = (headerBg: string, headerText: string, body: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, ${headerBg}); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${headerText}</h1>
        </div>
        <div style="padding: 32px;">${body}</div>
        ${footer}
      </div>`;

    const scoreBlock = `
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #059669; font-size: 36px; font-weight: bold; margin: 0;">${score}/${totalQuestions}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Score: ${percentage}%</p>
      </div>`;

    if (type === "interview_scheduled") {
      const iDate = new Date(interviewDate);
      const formattedDate = iDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = iDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      subject = `📅 Interview Scheduled — ${testTitle}`;
      html = wrapper("#6366f1, #4f46e5", "📅 Interview Scheduled",
        `<p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi <strong>${candidateName}</strong>,</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Great news! You've been selected for an interview for <strong>"${testTitle}"</strong>.
         </p>
         <div style="background: #eef2ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
           <table style="width: 100%; border-collapse: collapse;">
             <tr>
               <td style="color: #6b7280; font-size: 13px; padding: 8px 0;">📅 Date</td>
               <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
             </tr>
             <tr>
               <td style="color: #6b7280; font-size: 13px; padding: 8px 0;">🕐 Time</td>
               <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formattedTime}</td>
             </tr>
           </table>
         </div>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
             Join Meeting
           </a>
         </div>
         <p style="color: #6b7280; font-size: 13px; text-align: center;">
           Or copy this link: <a href="${meetingLink}" style="color: #6366f1;">${meetingLink}</a>
         </p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 16px;">
           Please join the meeting on time. If you need to reschedule, please contact the recruiter directly.
         </p>`);
    } else if (type === "qualified") {
      subject = `🎉 Congratulations! You Qualified — ${testTitle}`;
      html = wrapper("#10b981, #059669", "🎉 You Qualified!",
        `<p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi <strong>${candidateName}</strong>,</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Great news! You have passed the assessment <strong>"${testTitle}"</strong> with flying colors!
         </p>
         ${scoreBlock}
         <p style="color: #059669; font-size: 14px; font-weight: 600; margin: 16px 0 8px;">Minimum required: ${passingScore}/${totalQuestions}</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Please make sure to upload your resume through the test portal. The recruiter will review your application and get back to you soon!
         </p>`);
    } else if (type === "not_qualified") {
      subject = `📋 Test Results — ${testTitle}`;
      html = wrapper("#6b7280, #4b5563", "📋 Test Results",
        `<p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi <strong>${candidateName}</strong>,</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Thank you for completing the assessment <strong>"${testTitle}"</strong>.
         </p>
         ${scoreBlock}
         <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
           <p style="color: #991b1b; font-size: 14px; margin: 0;">Minimum required score: ${passingScore}/${totalQuestions}</p>
         </div>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Unfortunately, your score did not meet the minimum requirement for this position. We appreciate your time and effort. Don't be discouraged — keep improving and try again in the future!
         </p>`);
    } else if (type === "completed") {
      subject = `✅ Test Completed — ${testTitle}`;
      html = wrapper("#10b981, #059669", "🎉 Test Completed!",
        `<p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi <strong>${candidateName}</strong>,</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           You have successfully completed the assessment <strong>"${testTitle}"</strong>. Here's a summary:
         </p>
         ${scoreBlock}
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           The recruiter will review your submission and get back to you. Thank you for your effort!
         </p>`);
    } else {
      subject = `⚠️ Test Ended — ${testTitle}`;
      html = wrapper("#ef4444, #dc2626", "⚠️ Test Ended Early",
        `<p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi <strong>${candidateName}</strong>,</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Unfortunately, your assessment <strong>"${testTitle}"</strong> was ended due to a policy violation.
         </p>
         <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
           <p style="color: #991b1b; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Reason:</p>
           <p style="color: #dc2626; font-size: 14px; margin: 0;">${knockoutReason || "Policy violation detected"}</p>
         </div>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           If you believe this was an error, please contact the recruiter directly. We appreciate your time.
         </p>`);
    }

    // Determine recipient — for recruiter notifications, look up recruiter email
    let recipientEmail = candidateEmail;

    if (type === "recruiter_qualified" && recruiterId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      // Check for custom notification email in profile first
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("notification_email")
        .eq("user_id", recruiterId)
        .single();

      let recruiterEmail = profile?.notification_email;

      // Fall back to auth email if no custom notification email
      if (!recruiterEmail) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(recruiterId);
        recruiterEmail = userData?.user?.email;
      }

      if (!recruiterEmail) {
        console.error("Could not find recruiter email for id:", recruiterId);
        return new Response(JSON.stringify({ error: "Recruiter email not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      recipientEmail = recruiterEmail;

      const testLink = `https://dmless.com/test/${hiringLinkSlug || ""}`;
      subject = `🎉 New Qualified Candidate — ${testTitle}`;
      html = wrapper("#10b981, #059669", "🎉 New Qualified Candidate!",
        `<p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi there,</p>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Great news! A new candidate has qualified for your assessment <strong>"${testTitle}"</strong>.
         </p>
         <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
           <table style="width: 100%; border-collapse: collapse;">
             <tr>
               <td style="color: #6b7280; font-size: 13px; padding: 6px 0;">Candidate</td>
               <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${candidateName}</td>
             </tr>
             <tr>
               <td style="color: #6b7280; font-size: 13px; padding: 6px 0;">Email</td>
               <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${candidateEmail}</td>
             </tr>
             <tr>
               <td style="color: #6b7280; font-size: 13px; padding: 6px 0;">Score</td>
               <td style="color: #059669; font-size: 14px; font-weight: 600; text-align: right;">${score}/${totalQuestions} (${totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%)</td>
             </tr>
             <tr>
               <td style="color: #6b7280; font-size: 13px; padding: 6px 0;">Passing Score</td>
               <td style="color: #111827; font-size: 14px; text-align: right;">${passingScore}/${totalQuestions}</td>
             </tr>
           </table>
         </div>
         <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
           Log in to your DMless dashboard to review this candidate's submission and resume.
         </p>`);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DMless <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: "Failed to send email", details: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send email error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
