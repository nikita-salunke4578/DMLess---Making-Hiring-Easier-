import { motion } from "framer-motion";
import { Users, Target, Gauge, FileText, BarChart3, Link } from "lucide-react";

const features = [
  { icon: Target, title: "Knockout Logic", desc: "Mark critical questions as knockout. Wrong answer = instant elimination. No bad candidates reach you." },
  { icon: Gauge, title: "Auto-Scoring", desc: "Server-side grading with configurable pass thresholds. Candidates ranked by score automatically." },
  { icon: Link, title: "One Link, Any Channel", desc: "Share your hiring link on LinkedIn, WhatsApp, email, job boards — one unified funnel." },
  { icon: Users, title: "Zero Candidate Friction", desc: "No sign-up needed. Candidates click, test, and submit in under 10 minutes." },
  { icon: FileText, title: "Resume Gate", desc: "Only qualified candidates upload resumes. You never read an unqualified one again." },
  { icon: BarChart3, title: "Live Dashboard", desc: "Stats cards, candidate table, inline resume preview, filters, and CSV export." },
];

const ValueProps = () => {
  return (
    <section id="value" className="relative py-24">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px] pointer-events-none" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Features</span>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground">
            Everything you need to hire smarter.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6 card-shadow hover:border-primary/20 transition-colors"
            >
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
