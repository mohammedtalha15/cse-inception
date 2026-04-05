import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { ProblemSolutionSection } from "@/components/problem-solution-section";
import { FeatureGrid } from "@/components/feature-grid";
import { AboutSection } from "@/components/about-section";
import { PricingSection } from "@/components/pricing-section";
import { GlitchMarquee } from "@/components/glitch-marquee";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <FeatureGrid />
        <AboutSection />
        <PricingSection />
        <GlitchMarquee />
      </main>
      <Footer />
    </div>
  );
}
