import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import ProblemSection from "@/components/landing/ProblemSection";
import ValueProps from "@/components/landing/ValueProps";
import CtaSection from "@/components/landing/CtaSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <ProblemSection />
      <ValueProps />
      <CtaSection />
    </div>
  );
};

export default Index;
