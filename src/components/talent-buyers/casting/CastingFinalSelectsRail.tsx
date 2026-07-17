"use client";

import { Building2, Mail, User } from "lucide-react";

import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import {
  buildBookingMailto,
  buildFinalSelectBookingCards,
  buildPersonBookingMailto,
} from "@/lib/talent-buyers/casting/casting-booking-drafts";
import { castingStatusLabel } from "@/lib/talent-buyers/casting/casting-statuses";

export function CastingFinalSelectsRail({
  candidates,
  roles,
  castingTitle,
  isPending,
  onRequestAvailability,
  onFinalize,
  canFinalize,
  selectionsLocked,
}: {
  candidates: CastingCandidate[];
  roles: CastingRole[];
  castingTitle: string;
  isPending?: boolean;
  onRequestAvailability: (candidate: CastingCandidate) => void;
  onFinalize: () => void;
  canFinalize: boolean;
  selectionsLocked?: boolean;
}) {
  const cards = buildFinalSelectBookingCards({ candidates, roles });

  return (
    <section
      className="casting-find-talent-invited-panel casting-final-selects-rail"
      aria-labelledby="casting-final-selects-heading"
    >
      <div className="casting-find-talent-board__section-header">
        <h3 id="casting-final-selects-heading">Final Selects ({candidates.length})</h3>
        {selectionsLocked ? (
          <p className="casting-final-selects-rail__locked-note">Finalized — selections locked</p>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <div className="casting-find-talent-dropzone">
          <p>Check talent in the table to add them here for booking.</p>
        </div>
      ) : (
        <ul className="casting-final-selects-rail__cards">
          {cards.map((card) => {
            const mailto = buildBookingMailto(card, castingTitle);
            return (
              <li key={card.id} className="casting-final-selects-rail__card">
                <div className="casting-final-selects-rail__card-header">
                  <div className="casting-final-selects-rail__card-identity">
                    <span className="casting-final-selects-rail__card-avatar" aria-hidden>
                      {card.isDirect ? (
                        <User className="size-3.5" />
                      ) : (
                        <Building2 className="size-3.5" />
                      )}
                    </span>
                    <div className="casting-final-selects-rail__card-copy">
                      <strong>{card.displayName}</strong>
                      <span>
                        {card.people.length} {card.people.length === 1 ? "person" : "people"}
                      </span>
                    </div>
                  </div>
                  {mailto ? (
                    <a href={mailto} className="bd-btn-secondary casting-final-selects-rail__book">
                      <Mail className="size-3.5" aria-hidden />
                      Book
                    </a>
                  ) : (
                    <span className="casting-final-selects-rail__book-missing">No email</span>
                  )}
                </div>

                <ul className="casting-final-selects-rail__people">
                  {card.people.map(({ candidate, role }) => {
                    const personMailto = buildPersonBookingMailto({ candidate, role }, castingTitle);
                    return (
                      <li key={candidate.id} className="casting-final-selects-rail__person">
                        {candidate.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.headshotUrl}
                            alt=""
                            className="casting-final-selects-rail__person-avatar"
                          />
                        ) : (
                          <span className="casting-final-selects-rail__person-avatar casting-final-selects-rail__person-avatar--empty">
                            {candidate.displayName[0]?.toUpperCase() ?? "?"}
                          </span>
                        )}
                        <div className="casting-final-selects-rail__person-main">
                          <strong>{candidate.displayName}</strong>
                          <span>
                            {role?.name ? `${role.name} · ` : ""}
                            {castingStatusLabel(candidate.status)}
                          </span>
                        </div>
                        <div className="casting-final-selects-rail__person-actions">
                          {candidate.status === "selected" && !selectionsLocked ? (
                            <button
                              type="button"
                              className="casting-final-selects-rail__text-btn"
                              disabled={isPending}
                              onClick={() => onRequestAvailability(candidate)}
                            >
                              Availability
                            </button>
                          ) : null}
                          {personMailto ? (
                            <a href={personMailto} className="casting-final-selects-rail__text-btn">
                              Book
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <div className="casting-final-selects-rail__footer">
        <button
          type="button"
          className="bd-btn-accent"
          disabled={!canFinalize || isPending || candidates.length === 0}
          onClick={onFinalize}
        >
          Finalize casting
        </button>
      </div>
    </section>
  );
}
