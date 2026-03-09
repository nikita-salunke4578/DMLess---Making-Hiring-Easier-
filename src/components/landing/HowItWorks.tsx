import { motion } from "framer-motion";
import { Link2, Brain, UserCheck } from "lucide-react";

const steps = [
  {
    icon: Link2,
    step: "01",
    title: "Create a hiring link",
    desc: "Add your job title, description, and build a 5–10 question MCQ challenge with knockout logic. Takes under 10 minutes.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Candidates prove their skills",
    desc: "Share your link anywhere — LinkedIn, WhatsApp, email. Candidates take the challenge. No signup required. Instant pass/fail.",
  },
  {
    icon: UserCheck,
    step: "03",
    title: "Review only the best",
    desc: "Your dashboard shows only qualified candidates, ranked by score, with resumes attached. Go straight to interviews.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">How it works</span>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground">
            Three steps. Zero DMs.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative group"
            >
              <div className="rounded-2xl border border-border bg-card p-8 card-shadow h-full transition-all duration-300 hover:border-primary/30 hover:glow-border">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-display text-3xl font-bold text-primary/20">{s.step}</span>
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
