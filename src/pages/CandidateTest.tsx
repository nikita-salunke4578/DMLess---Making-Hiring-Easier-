import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Clock, AlertTriangle, Shield, CheckCircle, XCircle, Eye, Camera, CameraOff, Upload, FileText, Loader2, Video, Square, RotateCcw } from "lucide-react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Phase = "register" | "camera_setup" | "test" | "completed" | "qualified" | "video_intro" | "knocked_out" | "loading" | "not_found";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  is_knockout: boolean;
  sort_order: number;
}

interface HiringLink {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  max_tab_switches: number;
  passing_score: number;
  company_name: string | null;
  company_logo_url: string | null;
  recruiter_id: string;
}

interface RecruiterProfile {
  company_name: string | null;
  logo_url: string | null;
}

const CandidateTest = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [hiringLink, setHiringLink] = useState<HiringLink | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [knockoutReason, setKnockoutReason] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Video intro state
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [videoTimeLeft, setVideoTimeLeft] = useState(60);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoIntroRef = useRef<HTMLVideoElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // Camera proctoring state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proctorWarnings, setProctorWarnings] = useState(0);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proctorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const proctorWarningsRef = useRef(0);

  const tabSwitchRef = useRef(0);
  const knockedOutRef = useRef(false);

  const MAX_PROCTOR_WARNINGS = 3;

  // Load hiring link
  useEffect(() => {
    if (!slug) { setPhase("not_found"); return; }
    (async () => {
      const { data: link } = await supabase
        .from("hiring_links")
        .select("id, title, description, time_limit_minutes, max_tab_switches, passing_score, company_name, company_logo_url, recruiter_id")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!link) { setPhase("not_found"); return; }

      // Fetch recruiter profile for fallback branding
      let brandName = link.company_name;
      let brandLogo = link.company_logo_url;

      if (!brandName || !brandLogo) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name, logo_url")
          .eq("user_id", link.recruiter_id)
          .single();

        if (profile) {
          if (!brandName) brandName = profile.company_name;
          if (!brandLogo) brandLogo = profile.logo_url;
        }
      }

      setHiringLink({ ...link, company_name: brandName, company_logo_url: brandLogo });

      // Load reCAPTCHA script if site key configured
      if (RECAPTCHA_SITE_KEY && !document.getElementById("recaptcha-script")) {
        const script = document.createElement("script");
        script.id = "recaptcha-script";
        script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
        document.head.appendChild(script);
      }

      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_option, is_knockout, sort_order")
        .eq("hiring_link_id", link.id)
        .order("sort_order");

      setQuestions((qs as Question[]) || []);
      setPhase("register");
    })();
  }, [slug]);

  // Camera setup
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      setCameraStream(stream);
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError("Camera access denied. Camera is required for this test.");
    }
  };

  // Attach stream to video element when it mounts
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, phase]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
    };
  }, [cameraStream]);

  // Proctor: periodic frame analysis
  useEffect(() => {
    if (phase !== "test" || !cameraStream || knockedOutRef.current) return;

    const captureAndAnalyze = async () => {
      if (!videoRef.current || !canvasRef.current || knockedOutRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 240;
      ctx.drawImage(video, 0, 0, 320, 240);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.5);

      try {
        const { data, error } = await supabase.functions.invoke("proctor-analyze", {
          body: { image: dataUrl },
        });

        if (error || !data) return;

        if (data.violation) {
          const newWarnings = proctorWarningsRef.current + 1;
          proctorWarningsRef.current = newWarnings;
          setProctorWarnings(newWarnings);
          setWarningMessage(data.message || "Suspicious behavior detected");
          setShowWarningBanner(true);

          toast({
            title: `⚠️ Proctoring Warning (${newWarnings}/${MAX_PROCTOR_WARNINGS})`,
            description: data.message || "Please look at the screen and stay focused.",
            variant: "destructive",
          });

          setTimeout(() => setShowWarningBanner(false), 5000);

          if (newWarnings >= MAX_PROCTOR_WARNINGS) {
            handleKnockout(`Camera proctoring: ${data.message || "Multiple violations detected"}`);
          }
        }
      } catch {
        // Silently fail on analysis errors
      }
    };

    // Analyze every 10 seconds
    proctorIntervalRef.current = setInterval(captureAndAnalyze, 10000);
    // Initial check after 5 seconds
    const timeout = setTimeout(captureAndAnalyze, 5000);

    return () => {
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
      clearTimeout(timeout);
    };
  }, [phase, cameraStream]);

  // Anti-cheat: visibility change detection
  useEffect(() => {
    if (phase !== "test") return;

    const handleVisibility = () => {
      if (document.hidden && !knockedOutRef.current) {
        const newCount = tabSwitchRef.current + 1;
        tabSwitchRef.current = newCount;
        setTabSwitchCount(newCount);

        if (hiringLink && newCount > hiringLink.max_tab_switches) {
          knockedOutRef.current = true;
          handleKnockout(`Tab switched ${newCount} times (max: ${hiringLink.max_tab_switches})`);
        } else {
          toast({
            title: "⚠️ Tab switch detected!",
            description: `Warning ${newCount}/${hiringLink?.max_tab_switches}. You will be disqualified if you switch again.`,
            variant: "destructive",
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase, hiringLink]);

  // Anti-cheat: prevent copy/paste/right-click
  useEffect(() => {
    if (phase !== "test") return;

    const prevent = (e: Event) => {
      e.preventDefault();
      toast({ title: "Action blocked", description: "Copy/paste is not allowed during the test.", variant: "destructive" });
    };

    const preventContext = (e: Event) => { e.preventDefault(); };

    const preventKeyboard = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ["c", "v", "a", "u", "s"].includes(e.key.toLowerCase())) ||
        (e.metaKey && ["c", "v", "a", "u", "s"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        toast({ title: "Action blocked", description: "This action is not allowed during the test.", variant: "destructive" });
      }
    };

    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("contextmenu", preventContext);
    document.addEventListener("keydown", preventKeyboard);

    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("contextmenu", preventContext);
      document.removeEventListener("keydown", preventKeyboard);
    };
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "test" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleKnockout("Time expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  const handleKnockout = useCallback(async (reason: string) => {
    knockedOutRef.current = true;
    setKnockoutReason(reason);
    setPhase("knocked_out");

    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());

    if (submissionId) {
      await supabase.from("candidate_submissions").update({
        status: "knocked_out",
        knocked_out: true,
        knockout_reason: reason,
        tab_switch_count: tabSwitchRef.current,
        answers,
        completed_at: new Date().toISOString(),
      }).eq("id", submissionId);
    }

    // Send knockout email
    try {
      await supabase.functions.invoke("send-candidate-email", {
        body: {
          candidateEmail,
          candidateName,
          testTitle: hiringLink?.title || "Assessment",
          type: "knocked_out",
          score,
          totalQuestions: questions.length,
          knockoutReason: reason,
        },
      });
    } catch {
      // best-effort
    }
  }, [submissionId, answers, cameraStream, candidateEmail, candidateName, hiringLink, score, questions]);

  const handleCameraReady = () => {
    if (!cameraStream) return;
    if (!hiringLink) return;
    setTimeLeft(hiringLink.time_limit_minutes * 60);
    setPhase("test");
  };

  const startTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiringLink) return;

    // Honeypot check (should be empty)
    if (honeypot) {
      toast({ title: "Error", description: "Submission blocked.", variant: "destructive" });
      return;
    }

    // Get reCAPTCHA token if configured
    let recaptchaToken = "";
    if (RECAPTCHA_SITE_KEY && window.grecaptcha) {
      try {
        recaptchaToken = await new Promise<string>((resolve) => {
          window.grecaptcha!.ready(() => {
            window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action: "submit_test" }).then(resolve);
          });
        });
      } catch {
        toast({ title: "Verification failed", description: "Please refresh and try again.", variant: "destructive" });
        return;
      }
    }

    // Submit through edge function with anti-spam checks
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("submit-candidate", {
        body: {
          hiring_link_id: hiringLink.id,
          candidate_name: candidateName.trim(),
          candidate_email: candidateEmail.trim(),
          total_questions: questions.length,
          honeypot,
          recaptcha_token: recaptchaToken || undefined,
        },
      });

      if (fnError) {
        toast({ title: "Error", description: fnError.message || "Submission failed.", variant: "destructive" });
        return;
      }

      if (fnData?.error) {
        toast({ title: "Blocked", description: fnData.error, variant: "destructive" });
        return;
      }

      setSubmissionId(fnData.id);
      setPhase("camera_setup");
      startCamera();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const selectAnswer = (questionId: string, optionIndex: number) => {
    if (knockedOutRef.current) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const nextQuestion = () => {
    const q = questions[currentQ];
    const selected = answers[q.id];

    if (q.is_knockout && selected !== undefined && selected !== q.correct_option) {
      handleKnockout(`Wrong answer on knockout question: "${q.question_text}"`);
      return;
    }

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishTest();
    }
  };

  const sendCandidateEmail = async (type: "completed" | "knocked_out" | "qualified" | "not_qualified", finalScore?: number, reason?: string) => {
    try {
      await supabase.functions.invoke("send-candidate-email", {
        body: {
          candidateEmail,
          candidateName,
          testTitle: hiringLink?.title || "Assessment",
          type,
          score: finalScore ?? score,
          totalQuestions: questions.length,
          knockoutReason: reason,
          passingScore: hiringLink?.passing_score || 0,
        },
      });
    } catch {
      // Email is best-effort, don't block the flow
    }
  };

  const finishTest = async () => {
    let finalScore = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correct_option) finalScore++;
    }
    setScore(finalScore);

    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());

    const passingPct = hiringLink?.passing_score || 0;
    const requiredCorrect = passingPct > 0 ? Math.ceil((passingPct / 100) * questions.length) : 0;
    const isQualified = requiredCorrect > 0 && finalScore >= requiredCorrect;

    const finalStatus = isQualified ? "qualified" : "completed";

    if (submissionId) {
      await supabase.from("candidate_submissions").update({
        status: finalStatus,
        score: finalScore,
        answers,
        tab_switch_count: tabSwitchRef.current,
        completed_at: new Date().toISOString(),
      }).eq("id", submissionId);
    }

    if (isQualified) {
      setPhase("video_intro");
      sendCandidateEmail("qualified", finalScore);
      // Notify recruiter about the new qualified candidate
      try {
        await supabase.functions.invoke("send-candidate-email", {
          body: {
            candidateEmail,
            candidateName,
            testTitle: hiringLink?.title || "Assessment",
            type: "recruiter_qualified",
            score: finalScore,
            totalQuestions: questions.length,
            passingScore: hiringLink?.passing_score || 0,
            recruiterId: hiringLink?.recruiter_id,
            hiringLinkSlug: slug,
          },
        });
      } catch {
        // Recruiter notification is best-effort
      }
    } else if (requiredCorrect > 0) {
      setPhase("completed");
      sendCandidateEmail("not_qualified", finalScore);
    } else {
      setPhase("completed");
      sendCandidateEmail("completed", finalScore);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !submissionId) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or Word document.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setResumeUploading(true);
    try {
      const filePath = `${submissionId}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      await supabase.from("candidate_submissions").update({ resume_url: filePath }).eq("id", submissionId);
      setResumeUploaded(true);
      toast({ title: "Resume uploaded!", description: "Your resume has been submitted successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setResumeUploading(false);
    }
  };

  // Video intro functions
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: true,
      });
      setVideoStream(stream);
      if (videoIntroRef.current) {
        videoIntroRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") 
          ? "video/webm;codecs=vp9" 
          : "video/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      };

      mediaRecorder.start(1000);
      setVideoRecording(true);
      setVideoTimeLeft(60);
    } catch {
      toast({ title: "Camera/mic error", description: "Please allow camera and microphone access.", variant: "destructive" });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setVideoRecording(false);
  };

  const retakeVideo = () => {
    setVideoBlob(null);
    setVideoUploaded(false);
    setVideoTimeLeft(60);
  };

  const uploadVideoIntro = async () => {
    if (!videoBlob || !submissionId) return;
    setVideoUploading(true);
    try {
      const filePath = `${submissionId}/video-intro.webm`;
      const { error: uploadError } = await supabase.storage
        .from("video-intros")
        .upload(filePath, videoBlob, { contentType: "video/webm" });
      if (uploadError) throw uploadError;

      await supabase.from("candidate_submissions")
        .update({ video_intro_url: filePath })
        .eq("id", submissionId);

      setVideoUploaded(true);
      toast({ title: "Video uploaded!", description: "Your video introduction has been submitted." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setVideoUploading(false);
    }
  };

  // Video recording timer
  useEffect(() => {
    if (!videoRecording || videoTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setVideoTimeLeft((prev) => {
        if (prev <= 1) {
          stopVideoRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [videoRecording, videoTimeLeft]);

  // Attach video stream to video element
  useEffect(() => {
    if (videoIntroRef.current && videoStream) {
      videoIntroRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Set video preview when blob is ready
  useEffect(() => {
    if (videoPreviewRef.current && videoBlob) {
      videoPreviewRef.current.src = URL.createObjectURL(videoBlob);
    }
  }, [videoBlob]);


  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "not_found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border bg-card text-center p-8">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Link Not Found</h2>
          <p className="text-muted-foreground">This hiring link is invalid or has been deactivated.</p>
        </Card>
      </div>
    );
  }

  if (phase === "register") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative z-10">
          {/* Company Branding */}
          {(hiringLink?.company_logo_url || hiringLink?.company_name) && (
            <div className="flex flex-col items-center gap-2 mb-6">
              {hiringLink.company_logo_url && (
                <img src={hiringLink.company_logo_url} alt={hiringLink.company_name || "Company"} className="h-16 w-16 rounded-xl object-cover border border-border" />
              )}
              {hiringLink.company_name && (
                <span className="text-sm font-medium text-muted-foreground">{hiringLink.company_name}</span>
              )}
            </div>
          )}

          {!hiringLink?.company_logo_url && !hiringLink?.company_name && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="h-7 w-7 text-primary" />
              <span className="font-display text-2xl font-bold text-foreground">DM<span className="text-primary">less</span></span>
            </div>
          )}

          <Card className="border-border bg-card card-shadow">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-foreground mb-1">{hiringLink?.title}</h1>
                {hiringLink?.description && <p className="text-muted-foreground text-sm">{hiringLink.description}</p>}
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Time limit: {hiringLink?.time_limit_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{questions.length} questions • Anti-cheat enabled</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Camera proctoring required</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Tab switching, copy/paste, & behavior monitored</span>
                </div>
              </div>

              <form onSubmit={startTest} className="space-y-4">
                {/* Honeypot field - hidden from real users */}
                <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                  <label htmlFor="website_url">Website</label>
                  <input
                    id="website_url"
                    name="website_url"
                    type="text"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Full Name *</Label>
                  <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="John Doe" className="bg-background border-border" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Email *</Label>
                  <Input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="john@example.com" className="bg-background border-border" required />
                </div>
                <Button type="submit" variant="hero" className="w-full gap-2">
                  Start Challenge <Zap className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === "camera_setup") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border bg-card card-shadow">
            <CardContent className="pt-6 space-y-6 text-center">
              <Camera className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-xl font-display font-bold text-foreground">Camera Setup</h2>
              <p className="text-muted-foreground text-sm">
                This test requires camera access for proctoring. Please allow camera access and make sure your face is clearly visible.
              </p>

              {cameraError ? (
                <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm flex items-center gap-2">
                  <CameraOff className="h-5 w-5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              ) : cameraStream ? (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden border-2 border-primary/30 mx-auto w-fit">
                    <video ref={videoRef} autoPlay muted playsInline className="w-64 h-48 object-cover transform -scale-x-100" />
                  </div>
                  <p className="text-xs text-muted-foreground">✓ Camera is working. Click below to begin.</p>
                  <Button variant="hero" onClick={handleCameraReady} className="w-full gap-2">
                    Begin Test <Zap className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-3">Waiting for camera access...</p>
                </div>
              )}

              {cameraError && (
                <Button variant="outline" onClick={startCamera} className="gap-2">
                  <Camera className="h-4 w-4" /> Retry Camera Access
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === "knocked_out") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <Card className="border-destructive/30 bg-card text-center p-8">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Disqualified</h2>
            <p className="text-muted-foreground mb-4">{knockoutReason}</p>
            <p className="text-sm text-muted-foreground">Your submission has been recorded. The recruiter will be notified.</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === "video_intro") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full">
          <Card className="border-primary/30 bg-card p-8">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">🎉 You Qualified!</h2>
               <p className="text-muted-foreground text-sm">
                Score: {score}/{questions.length} (minimum: {Math.ceil(((hiringLink?.passing_score || 0) / 100) * questions.length)}/{questions.length})
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">Record a 60-second Video Intro</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Introduce yourself briefly — your background, why you're interested, and what makes you a great fit. This replaces a phone screening call.
              </p>
            </div>

            {!videoBlob && !videoRecording && (
              <Button variant="hero" onClick={startVideoRecording} className="w-full gap-2 mb-4">
                <Video className="h-4 w-4" /> Start Recording
              </Button>
            )}

            {videoRecording && (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border-2 border-primary/30 mx-auto">
                  <video ref={videoIntroRef} autoPlay muted playsInline className="w-full aspect-video object-cover transform -scale-x-100" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                    <span className="text-sm font-mono font-bold text-foreground">Recording — {formatTime(videoTimeLeft)}</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={stopVideoRecording} className="gap-1">
                    <Square className="h-3 w-3" /> Stop
                  </Button>
                </div>
                <Progress value={((60 - videoTimeLeft) / 60) * 100} className="h-1.5" />
              </div>
            )}

            {videoBlob && !videoUploaded && (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border-2 border-border mx-auto">
                  <video ref={videoPreviewRef} controls className="w-full aspect-video object-cover" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={retakeVideo} className="flex-1 gap-1" disabled={videoUploading}>
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                  <Button variant="hero" onClick={uploadVideoIntro} className="flex-1 gap-1" disabled={videoUploading}>
                    {videoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {videoUploading ? "Uploading..." : "Submit Video"}
                  </Button>
                </div>
              </div>
            )}

            {videoUploaded && (
              <div className="bg-primary/10 rounded-xl p-4 flex items-center justify-center gap-2 text-primary mb-4">
                <Video className="h-5 w-5" />
                <span className="font-medium">Video intro uploaded!</span>
              </div>
            )}

            <div className="mt-4">
              <Button
                variant={videoUploaded ? "hero" : "outline"}
                onClick={() => setPhase("qualified")}
                className="w-full"
              >
                {videoUploaded ? "Continue to Resume Upload →" : "Skip Video & Continue"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === "qualified") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <Card className="border-primary/30 bg-card text-center p-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">🎉 You Qualified!</h2>
            <p className="text-muted-foreground mb-4">
              You scored {score}/{questions.length} (minimum: {Math.ceil(((hiringLink?.passing_score || 0) / 100) * questions.length)}/{questions.length})
            </p>
            <p className="text-sm text-foreground font-medium mb-4">Please upload your resume to complete your application.</p>

            {resumeUploaded ? (
              <div className="bg-primary/10 rounded-xl p-4 flex items-center justify-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                <span className="font-medium">Resume uploaded successfully!</span>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" disabled={resumeUploading} />
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 hover:border-primary/60 hover:bg-primary/5 transition-all">
                  {resumeUploading ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-foreground font-medium">Click to upload resume</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF or Word • Max 5MB</p>
                    </>
                  )}
                </div>
              </label>
            )}

            {tabSwitchCount > 0 && (
              <p className="text-xs text-muted-foreground mt-4">Tab switches recorded: {tabSwitchCount}</p>
            )}
            <p className="text-sm text-muted-foreground mt-4">You'll receive a confirmation email shortly.</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === "completed") {
    const requiredCorrect = (hiringLink?.passing_score || 0) > 0 ? Math.ceil(((hiringLink?.passing_score || 0) / 100) * questions.length) : 0;
    const didNotPass = requiredCorrect > 0;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <Card className={`${didNotPass ? "border-muted" : "border-primary/30"} bg-card text-center p-8`}>
            {didNotPass ? (
              <>
                <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Test Completed</h2>
                <p className="text-muted-foreground mb-4">
                  You scored {score}/{questions.length} (minimum required: {requiredCorrect}/{questions.length})
                </p>
                <p className="text-sm text-muted-foreground">Unfortunately, you did not meet the minimum score. You'll receive a notification email shortly.</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">Test Completed!</h2>
                <p className="text-muted-foreground mb-4">You scored {score}/{questions.length}</p>
                {tabSwitchCount > 0 && <p className="text-xs text-muted-foreground">Tab switches recorded: {tabSwitchCount}</p>}
                <p className="text-sm text-muted-foreground mt-4">The recruiter will review your submission and reach out if you're a good fit.</p>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  // Test phase
  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const isUrgent = timeLeft < 60;

  return (
    <div className="min-h-screen bg-background select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Proctor warning banner */}
      {showWarningBanner && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-3 px-4 text-center text-sm font-medium flex items-center justify-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          {warningMessage} — Warning {proctorWarnings}/{MAX_PROCTOR_WARNINGS}
        </motion.div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <div className={`border-b border-border bg-card sticky top-0 z-50 ${showWarningBanner ? "mt-10" : ""}`}>
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-display text-lg font-bold text-foreground">DM<span className="text-primary">less</span></span>
            </div>
            <span className="text-sm text-muted-foreground">Q{currentQ + 1}/{questions.length}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Camera indicator */}
            <div className="flex items-center gap-1">
              <div className="relative">
                <video ref={videoRef} autoPlay muted playsInline className="w-10 h-8 object-cover rounded border border-border transform -scale-x-100" />
                <div className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            </div>

            {proctorWarnings > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" />
                {proctorWarnings}/{MAX_PROCTOR_WARNINGS}
              </div>
            )}

            {tabSwitchCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <Eye className="h-3 w-3" />
                <span>{tabSwitchCount}/{hiringLink?.max_tab_switches}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isUrgent ? "text-destructive animate-pulse" : "text-foreground"}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Question */}
      <div className="container max-w-2xl py-12">
        <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <div className="mb-2 flex items-center gap-2">
            {q.is_knockout && (
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">
                Knockout Question
              </span>
            )}
          </div>

          <h2 className="text-xl font-display font-semibold text-foreground mb-6">{q.question_text}</h2>

          <div className="space-y-3">
            {(q.options as string[]).map((opt: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectAnswer(q.id, idx)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[q.id] === idx
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50"
                }`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full mr-3 text-sm font-bold ${
                  answers[q.id] === idx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <Button
              variant="hero"
              onClick={nextQuestion}
              disabled={answers[q.id] === undefined}
              className="gap-2"
            >
              {currentQ === questions.length - 1 ? "Submit Test" : "Next Question"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CandidateTest;
