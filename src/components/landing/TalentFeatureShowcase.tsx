import { FileText, Send, CalendarDays, MessageCircle } from "lucide-react";

import "./talent-feature-showcase.css";

const features = [
  {
    title: "Résumé import",
    icon: FileText,
    description: "Import your experience and training from your résumé, then review and make it yours.",
  },
  {
    title: "Casting submissions",
    icon: Send,
    description: "Apply with your Motiion profile, add a note, and answer the casting team’s questions.",
  },
  {
    title: "Requests & replies",
    icon: MessageCircle,
    description: "Respond to availability checks, size-sheet requests, and booking confirmations in your inbox.",
  },
  {
    title: "Your schedule",
    icon: CalendarDays,
    description: "Keep upcoming activities, past projects, and casting submissions in one place.",
  },
];

export function TalentFeatureShowcase() {
  return (
    <section id="features" className="talent-features" aria-labelledby="talent-features-heading">
      <div className="mkt-container mkt-section-y">
        <h2 id="talent-features-heading" className="mkt-heading">Features</h2>
        <div className="talent-features__grid">
          {features.map(({ title, icon: Icon, description }) => (
            <article className="talent-features__card" key={title}>
              <Icon className="talent-features__icon" size={22} strokeWidth={1.5} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
