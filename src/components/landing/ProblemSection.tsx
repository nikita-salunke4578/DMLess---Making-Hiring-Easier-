import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisons = [
  { old: "Candidate sends resume first", new: "Candidate takes a skill test first" },
  { old: "Recruiter reads 100–500 resumes", new: "Recruiter only sees qualified candidates" },
  { old: "Manual screening call required", new: "Auto-graded test replaces the screening call" },
  { old: "Days to weeks for feedback", new: "Immediate pass/fail feedback" },
  { old: "Bias from resume formatting", new: "Objective score-based ranking" },
  { old: "Resume fraud is common", new: "Skills can't be faked in timed MCQs" },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="relative py-24">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Why DMless</span>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground">
            The hiring funnel is broken.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Traditional hiring wastes 40–60% of a recruiter's week on manual screening. We fix that.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Old way */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6"
          >
            <h3 className="font-display text-lg font-semibold text-destructive mb-5">Traditional Hiring</h3>
            <div className="space-y-4">
              {comparisons.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <X className="h-4 w-4 mt-0.5 shrink-0 text-destructive/70" />
                  <span className="text-sm text-muted-foreground">{c.old}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* New way */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-6"
          >
            <h3 className="font-display text-lg font-semibold text-primary mb-5">DMless Model</h3>
            <div className="space-y-4">
              {comparisons.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span className="text-sm text-secondary-foreground">{c.new}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
