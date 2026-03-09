import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            DM<span className="text-primary">less</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#problem" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why DMless</a>
          <a href="#value" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/auth")}>
            Log in
          </Button>
          <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
            Get Started Free
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
