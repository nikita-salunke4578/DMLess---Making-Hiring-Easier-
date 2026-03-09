import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Plus, LogOut, User, Link2, Users, Eye, Copy, ToggleLeft, ToggleRight, Settings, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HiringLink {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  submission_count?: number;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ display_name: string | null; company_name: string | null; logo_url: string | null; industry: string | null } | null>(null);
  const [hiringLinks, setHiringLinks] = useState<HiringLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, company_name, logo_url, industry")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data && (!data.company_name || !data.industry)) {
            navigate("/onboarding");
            return;
          }
          setProfile(data);
        });

      loadLinks();
    }
  }, [user]);

  const loadLinks = async () => {
    if (!user) return;
    setLinksLoading(true);
    const { data } = await supabase
      .from("hiring_links")
      .select("id, title, slug, is_active, created_at")
      .eq("recruiter_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Get submission counts
      const linksWithCounts = await Promise.all(
        data.map(async (link) => {
          const { count } = await supabase
            .from("candidate_submissions")
            .select("id", { count: "exact", head: true })
            .eq("hiring_link_id", link.id);
          return { ...link, submission_count: count || 0 };
        })
      );
      setHiringLinks(linksWithCounts);
    }
    setLinksLoading(false);
  };

  const toggleActive = async (link: HiringLink) => {
    await supabase.from("hiring_links").update({ is_active: !link.is_active }).eq("id", link.id);
    setHiringLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)));
  };

  const deleteLink = async (link: HiringLink) => {
    if (!confirm(`Delete "${link.title}"? This will also remove all associated questions and submissions.`)) return;
    const { error } = await supabase.from("hiring_links").delete().eq("id", link.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete hiring link.", variant: "destructive" });
    } else {
      setHiringLinks((prev) => prev.filter((l) => l.id !== link.id));
      toast({ title: "Deleted", description: "Hiring link removed successfully." });
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/test/${slug}`);
    toast({ title: "Copied!", description: "Hiring link copied to clipboard." });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">
              DM<span className="text-primary">less</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{profile?.display_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground gap-2">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}
              </h1>
              {profile?.company_name && (
                <p className="text-muted-foreground mt-1">{profile.company_name}</p>
              )}
            </div>
            <Button variant="hero" className="gap-2" onClick={() => navigate("/create-hiring-link")}>
              <Plus className="h-4 w-4" />
              Create Hiring Link
            </Button>
          </div>

          {linksLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hiringLinks.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-16 text-center card-shadow">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-primary/10 mb-6">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">No hiring links yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first hiring link to start receiving skill-tested candidates.
              </p>
              <Button variant="hero" className="gap-2" onClick={() => navigate("/create-hiring-link")}>
                <Plus className="h-4 w-4" />
                Create your first hiring link
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {hiringLinks.map((link) => (
                <Card key={link.id} className="border-border bg-card">
                  <CardContent className="flex items-center justify-between py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${link.is_active ? "bg-primary/10" : "bg-secondary"}`}>
                        <Link2 className={`h-5 w-5 ${link.is_active ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{link.title}</h3>
                        <p className="text-xs text-muted-foreground">/test/{link.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{link.submission_count}</span>
                      </div>

                      <Button variant="ghost" size="icon" onClick={() => navigate(`/edit-hiring-link/${link.id}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit link">
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button variant="ghost" size="icon" onClick={() => copyLink(link.slug)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Copy link">
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button variant="ghost" size="icon" onClick={() => navigate(`/submissions/${link.id}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="View submissions">
                        <Users className="h-4 w-4" />
                      </Button>

                      <Button variant="ghost" size="icon" onClick={() => navigate(`/test/${link.slug}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Preview test">
                        <Eye className="h-4 w-4" />
                      </Button>

                      <button onClick={() => toggleActive(link)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {link.is_active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6" />}
                      </button>

                      <Button variant="ghost" size="icon" onClick={() => deleteLink(link)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete link">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
