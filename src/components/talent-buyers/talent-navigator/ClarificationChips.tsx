"use client";

import { useState } from "react";

import type { ClarificationQuestion } from "@/lib/talent-navigator/search-intent";

type ClarificationChipsProps = {
  questions: ClarificationQuestion[];
  dismissedIds?: string[];
  onAnswer: (questionId: string, optionIds: string[]) => void;
  onSkip?: (questionId: string) => void;
};

export function ClarificationChips({
  questions,
  dismissedIds = [],
  onAnswer,
  onSkip,
}: ClarificationChipsProps) {
  const visible = questions.filter((q) => !dismissedIds.includes(q.id)).slice(0, 3);
  if (!visible.length) return null;

  return (
    <div className="talent-navigator__clarify" aria-label="Clarification questions">
      {visible.map((question) => (
        <ClarificationCard
          key={question.id}
          question={question}
          onAnswer={onAnswer}
          onSkip={onSkip}
        />
      ))}
    </div>
  );
}

function ClarificationCard({
  question,
  onAnswer,
  onSkip,
}: {
  question: ClarificationQuestion;
  onAnswer: (questionId: string, optionIds: string[]) => void;
  onSkip?: (questionId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(
    question.recommendedOptionId ? [question.recommendedOptionId] : [],
  );

  function toggle(optionId: string) {
    if (question.multiSelect) {
      setSelected((current) =>
        current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      );
    } else {
      setSelected([optionId]);
      onAnswer(question.id, [optionId]);
    }
  }

  return (
    <div className="talent-navigator__clarify-card">
      <p className="talent-navigator__clarify-category">{question.category}</p>
      <p className="talent-navigator__clarify-question" id={`clarify-${question.id}`}>
        {question.question}
      </p>
      <p className="talent-navigator__clarify-effect">{question.effect}</p>
      {question.multiSelect ? (
        <p className="talent-navigator__clarify-hint">Multiple choices allowed.</p>
      ) : null}
      <div
        className="talent-navigator__clarify-options"
        role={question.multiSelect ? "group" : "radiogroup"}
        aria-labelledby={`clarify-${question.id}`}
      >
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          const isRecommended = question.recommendedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role={question.multiSelect ? "checkbox" : "radio"}
              aria-checked={isSelected}
              className={`talent-navigator__clarify-option${
                isSelected ? " talent-navigator__clarify-option--selected" : ""
              }${isRecommended ? " talent-navigator__clarify-option--recommended" : ""}`}
              onClick={() => toggle(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="talent-navigator__clarify-actions">
        {question.multiSelect ? (
          <button
            type="button"
            className="talent-navigator__clarify-apply"
            disabled={!selected.length}
            onClick={() => onAnswer(question.id, selected)}
          >
            Apply
          </button>
        ) : null}
        {onSkip ? (
          <button
            type="button"
            className="talent-navigator__clarify-skip"
            onClick={() => {
              if (question.recommendedOptionId) {
                onAnswer(question.id, [question.recommendedOptionId]);
              } else {
                onSkip(question.id);
              }
            }}
          >
            Skip / use default
          </button>
        ) : null}
      </div>
    </div>
  );
}
