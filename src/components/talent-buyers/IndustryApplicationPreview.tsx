"use client";
import { projectContextQuestions, projectContextLabel } from "@/lib/talent-buyers/project-context";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { getBirthDateAge } from "@/lib/onboarding/birth-date";
import { acquisitionSourceOptions } from "@/lib/talent/copy";
import { parseIndustryProjects, industryApplicationSteps, type IndustryApplicationDraft, type IndustryApplicationStep } from "@/lib/talent-buyers/industry-application";

/** A view of the existing draft; it does not persist or request any data. */
export function IndustryApplicationPreview({ details, step }: { details: IndustryApplicationDraft; step: IndustryApplicationStep }) {
  const reduceMotion = useReducedMotion();
  const projects = parseIndustryProjects(details.hiring_projects);
  const projectSummary = [...projects.selected, ...(projects.other ? [projects.other] : [])].join(", ");
  const current = industryApplicationSteps.indexOf(step);
  const sections = [
    { title: "About you", rows: [["Name", details.full_name], ["Username", details.username ? `@${details.username}` : ""], ["Birthday · private", getBirthDateAge(details.date_of_birth) >= 0 ? details.date_of_birth : ""]] },
    { title: "Your work", rows: [["Role", details.professional_role], ["Company / independent", details.organization], ["Email", details.contact_email], ["Portfolio", details.work_url]] },
    { title: "Your projects", rows: [["Project types", projectSummary], ...projectContextQuestions.filter(question => details[question.key]).map(question => [question.label, projectContextLabel(question.key, details[question.key])])] },
    { title: "Your connection", rows: [["How you found us", acquisitionSourceOptions.find(option => option.value === details.acquisition_source)?.label ?? ""], ["More about you", details.acquisition_source_detail]] },
  ];
  return <aside className="application-preview" aria-label="Live application preview">
    <div id="application-preview-sheet" className="application-preview__sheet">
      <header className="application-preview__heading"><h2 id={step === "review" ? "application-review-title" : undefined} tabIndex={step === "review" ? -1 : undefined}>{step === "review" ? "Review Your Application" : "Industry application"}</h2>{details.avatar_url && <Image className="application-preview__photo" src={details.avatar_url} alt="" width={48} height={48} unoptimized />}</header>
      <div className="application-preview__sections">
        {sections.map((section, i) => {
          const upcoming = i > current;
          return <motion.section layout="position" transition={{ duration: reduceMotion ? 0 : .32, ease: "easeInOut" }} key={section.title} className="application-preview__section" data-section={i} data-active={i === current} data-upcoming={upcoming} aria-label={upcoming ? `${section.title}: upcoming` : section.title}>
            <h3><span>0{i + 1}</span>{section.title}{i < current && <span className="application-preview__complete" aria-label="Complete">✓</span>}</h3>
            {upcoming ? <div className="application-preview__skeleton" aria-hidden="true"><i /><i /></div> : <dl key={upcoming ? "upcoming" : "revealed"}>{section.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd title={value || undefined}>{value ? <span key={value} className="application-preview__value">{value}</span> : <span className="application-preview__empty">—</span>}</dd></div>)}</dl>}
          </motion.section>;
        })}
      </div>
      <footer className="application-preview__footer"><span>{step === "review" ? "READY FOR YOUR REVIEW" : "DRAFT · IN PROGRESS"}</span><span>01 / 01</span></footer>
    </div>
    <div className="application-preview__below"><p className="application-preview__caption">Your application, coming together.</p></div>
  </aside>;
}
