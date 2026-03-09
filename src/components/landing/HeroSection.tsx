import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 mb-8">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Skill-first hiring platform</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-6"
          >
            Stop reading{" "}
            <span className="text-gradient">200 resumes.</span>
            <br />
            Start meeting{" "}
            <span className="text-gradient">the right 5.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            DMless puts a short skill challenge before every resume.
            Only candidates who prove competence get through. No DMs. No ghosting. No wasted time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button variant="hero" size="lg" className="gap-2 px-8 py-6 text-base">
              Create your first hiring link
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="hero-outline" size="lg" className="px-8 py-6 text-base">
              See how it works
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {[
              { icon: Clock, label: "5-min setup", desc: "Create & share a hiring link in minutes" },
              { icon: Shield, label: "Skill-gated", desc: "Only qualified candidates reach you" },
              { icon: TrendingUp, label: "70% faster", desc: "Cut screening time dramatically" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 card-shadow">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
