import { BenefitCard } from "@/components/landing/BenefitCard";
import { BetaForm } from "@/components/landing/BetaForm";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { SectionHeader } from "@/components/landing/SectionHeader";

const features = [
  {
    title: "Materials",
    description:
      "Keep headshots, resumes, reels, and links organized so your key assets are always ready to share.",
  },
  {
    title: "Availability",
    description:
      "Stay ready for fast-moving opportunities with up-to-date availability that reflects your schedule in real time.",
  },
  {
    title: "Professional profile",
    description:
      "Present yourself with a polished, current profile that makes it easier to be considered and booked.",
  },
  {
    title: "Industry workflow",
    description:
      "Help teams and reps get what they need faster by keeping your information current and accessible in one place.",
  },
];

const benefits = [
  {
    title: "Get early access",
    description:
      "Be among the first to use Motiion while we continue refining the platform.",
  },
  {
    title: "Help shape the product",
    description:
      "Your feedback will directly influence the workflows and features we prioritize next.",
  },
  {
    title: "Set up your profile early",
    description:
      "Build your professional presence now so you are ready as the platform expands.",
  },
  {
    title: "Join the founding community",
    description:
      "Connect with early adopters helping define a new standard for dance career organization.",
  },
];

const faqs = [
  {
    question: "What is Motiion?",
    answer:
      "Motiion is a professional platform for dancers to manage headshots, resumes, reels, availability, and professional updates in one place.",
  },
  {
    question: "Who is the beta for?",
    answer:
      "The beta is built for dancers first, while also supporting choreographers, creative directors, casting teams, agencies, and managers who collaborate with talent.",
  },
  {
    question: "Is Motiion free during beta?",
    answer:
      "Yes. Early beta access is free while we work with users to improve the product and validate core workflows.",
  },
  {
    question: "When will full access launch?",
    answer:
      "We are rolling out access in phases during beta. A broader launch timeline will be shared as we incorporate feedback from early users.",
  },
];

export default function Home() {
  return (
    <div id="top" className="bg-[var(--paper)]">
      <Navbar />

      <main>
        <Hero />

        <section id="problem" className="section-wrap border-t border-[var(--line)]">
          <SectionHeader
            title="The dance industry still runs on scattered tools"
            description="Professional dancers are expected to stay ready at all times - but their materials, availability, and communication often live across folders, notes, screenshots, texts, and last-minute updates."
          />
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
            Motiion brings that workflow into one place so talent can stay
            organized, current, and easier to book.
          </p>
        </section>

        <section id="product" className="section-wrap border-t border-[var(--line)]">
          <SectionHeader
            eyebrow="Product"
            title="Everything you need, structured for real industry pace"
            description="A focused system for keeping your professional profile clear, current, and ready for every opportunity."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section id="beta" className="section-wrap border-t border-[var(--line)]">
          <SectionHeader
            eyebrow="Private Beta"
            title="Built with the industry, not just for it"
            description="We’re opening Motiion in beta to work closely with dancers and industry professionals as we shape the product. Early users will help test workflows, share feedback, and influence what comes next."
          />
        </section>

        <section className="section-wrap border-t border-[var(--line)]">
          <SectionHeader
            title="Why join the beta"
            description="Early participants get direct access and a voice in how Motiion evolves."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {benefits.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </section>

        <section id="signup" className="section-wrap border-t border-[var(--line)]">
          <SectionHeader
            eyebrow="Join Beta"
            title="Request beta access"
            description="We’re currently inviting a limited number of early users."
          />
          <div className="mt-10">
            <BetaForm />
          </div>
        </section>

        <section id="faq" className="section-wrap border-t border-[var(--line)]">
          <SectionHeader
            title="Frequently asked questions"
            description="Everything you need to know before requesting access."
          />
          <div className="mt-10">
            <FAQAccordion items={faqs} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
