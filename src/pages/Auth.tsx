import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, User, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Reset link sent",
          description: "Check your email for a password reset link.",
        });
        return;
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser && companyName) {
          await supabase.from("profiles").update({ company_name: companyName }).eq("user_id", newUser.id);
        }

        toast({
          title: "Account created!",
          description: "Check your email to confirm your account, then log in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const subheading = mode === "login" ? "Log in to manage your hiring links" : mode === "signup" ? "Start hiring smarter in minutes" : "Enter your email and we'll send a reset link";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-display text-2xl font-bold text-foreground">
            DM<span className="text-primary">less</span>
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 card-shadow">
          <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {subheading}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm text-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Recruiter" className="pl-10 bg-background border-border" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm text-foreground">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." className="pl-10 bg-background border-border" />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="pl-10 bg-background border-border" required />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-background border-border" required minLength={6} />
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="text-right">
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full gap-2" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "forgot" ? (
              <button onClick={() => setMode("login")} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            ) : (
              <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
