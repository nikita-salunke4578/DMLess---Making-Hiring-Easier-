import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const CtaSection = () => {
  return (
    <section className="relative py-24">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center rounded-3xl border border-primary/20 bg-card p-12 md:p-16 glow-border"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
            Ready to hire <span className="text-gradient">smarter</span>?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create your first hiring link in minutes. No credit card required.
          </p>
          <Button variant="hero" size="lg" className="gap-2 px-10 py-6 text-base">
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="container mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border pt-8">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">
              DM<span className="text-primary">less</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 DMless. Skill-first hiring for modern teams.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
