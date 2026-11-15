import { CONTACT_HREF } from "@/lib/marketing/footer-links";

// Managed services are scoped individually; software plans use checkout.
export const projectInquiry = (offer: string) =>
  `${CONTACT_HREF}?subject=${encodeURIComponent(`Motiion: ${offer}`)}`;

export const projectPlans = [
  { id: "project_pass", name: "Project Pass", price: "$199", period: "per project", description: "A complete workspace for your next production.", features: ["One project for 90 days", "3 team members", "No monthly subscription"], cta: "Get started" },
  { id: "studio", name: "Studio", price: "$149", period: "per month", description: "For professionals with a steady rhythm of productions.", features: ["1 active project at a time", "3 team members", "Reusable rosters and project templates", "Reuse your slot when a project wraps"], cta: "Get started" },
  { id: "production_house", name: "Production House", price: "$499", period: "per month", description: "One home for the productions your team runs together.", features: ["5 active projects at a time", "10 team members", "Shared team rosters", "Company project oversight"], cta: "Get started" },
];

export const castingServices = [
  { name: "Casting Assist", price: "$1,500", description: "We source dancers, screen submissions, and deliver a shortlist.", features: ["Casting brief and project setup", "Dancer sourcing and outreach", "Initial submission screening", "Curated shortlist delivery"] },
  { name: "Managed Casting", price: "$3,500", description: "Sourcing and screening, plus audition scheduling, callbacks, and booking coordination.", features: ["Everything in Casting Assist", "Audition scheduling and coordination", "Callbacks and availability checks", "Booking coordination and production handoff"] },
  { name: "Casting + Live Audition", price: "$6,000", description: "Managed casting plus planning, check-in, and on-site coordination for one audition day.", features: ["Everything in Managed Casting", "Planning for one scoped audition day", "Participant scheduling and check-in", "On-site coordination and audition flow"] },
];
