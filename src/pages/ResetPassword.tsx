import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      // Supabase handles the session automatically
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          {success ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">Password updated</h2>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">
                Set new password
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter your new password below
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-foreground">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-background border-border" required minLength={6} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-background border-border" required minLength={6} />
                  </div>
                </div>

                <Button type="submit" variant="hero" className="w-full gap-2" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
