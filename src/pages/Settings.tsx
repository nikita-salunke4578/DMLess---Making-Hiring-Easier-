import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Upload, Building2, Briefcase, ArrowLeft, Save, Loader2, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { INDUSTRIES } from "@/lib/constants";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingProfile(true);
    supabase
      .from("profiles")
      .select("display_name, company_name, industry, logo_url, notification_email")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setCompanyName(data.company_name || "");
          setIndustry(data.industry || "");
          setNotificationEmail((data as any).notification_email || "");
          setLogoUrl(data.logo_url || null);
          if (data.logo_url) setLogoPreview(data.logo_url);
        }
        setLoadingProfile(false);
      });
  }, [user]);

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
      let newLogoUrl = logoUrl;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const filePath = `${user.id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("company-logos")
          .upload(filePath, logoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
        newLogoUrl = urlData.publicUrl;
      }

      const updates: Record<string, any> = {
        display_name: displayName.trim() || null,
        company_name: companyName.trim(),
        industry,
        notification_email: notificationEmail.trim() || null,
      };
      if (newLogoUrl) updates.logo_url = newLogoUrl;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Settings saved!", description: "Your profile has been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

      <div className="container max-w-2xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your profile and company details.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Info (read-only) */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p className="text-foreground text-sm">{user?.email}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-foreground">Notification Email</Label>
                  <Input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder={user?.email || "your@email.com"}
                    className="bg-background border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Receive candidate notifications here. Defaults to your sign-up email if left empty.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Profile */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="bg-background border-border"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Logo */}
                <div className="flex items-center gap-5">
                  <label
                    htmlFor="settings-logo-upload"
                    className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/50 hover:border-primary/50 transition-colors overflow-hidden shrink-0"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </label>
                  <input id="settings-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Company Logo</p>
                    <p className="text-xs text-muted-foreground">Shown on candidate test pages. Max 2MB.</p>
                  </div>
                </div>

                <Separator />

                {/* Company Name */}
                <div className="space-y-2">
                  <Label className="text-foreground">Company Name *</Label>
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
                  <Label className="text-foreground">Industry *</Label>
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
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
