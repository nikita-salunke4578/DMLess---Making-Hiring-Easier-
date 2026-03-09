import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Upload, Building2, Briefcase, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { INDUSTRIES } from "@/lib/constants";

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Check if onboarding already done
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("company_name, industry, logo_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.company_name && data?.industry) {
          navigate("/dashboard");
        }
      });
  }, [user, navigate]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max logo size is 2MB.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyName.trim()) {
      toast({ title: "Required", description: "Company name is required.", variant: "destructive" });
      return;
    }
    if (!industry) {
      toast({ title: "Required", description: "Please select your industry.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let logoUrl: string | null = null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const filePath = `${user.id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("company-logos").upload(filePath, logoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      const updates: Record<string, any> = {
        company_name: companyName.trim(),
        industry,
      };
      if (logoUrl) updates.logo_url = logoUrl;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Profile set up!", description: "Welcome to DMless." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-display text-2xl font-bold text-foreground">
            DM<span className="text-primary">less</span>
          </span>
        </div>

        <Card className="border-border bg-card card-shadow">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-foreground mb-1">Set up your company</h1>
              <p className="text-muted-foreground text-sm">This info will appear on your candidate-facing test pages.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Logo Upload */}
              <div className="flex flex-col items-center gap-3">
                <label
                  htmlFor="logo-upload"
                  className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/50 hover:border-primary/50 transition-colors overflow-hidden"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </label>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <p className="text-xs text-muted-foreground">Upload company logo (optional)</p>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Company Name *
                </Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="bg-background border-border"
                  required
                />
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Industry *
                </Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" variant="hero" className="w-full gap-2" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {saving ? "Saving..." : "Continue to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
