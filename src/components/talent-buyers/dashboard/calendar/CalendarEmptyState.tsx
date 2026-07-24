"use client";

import { BuyerEmptyIntro } from "../BuyerEmptyIntro";
import { CreateActivityButton } from "../CreateActivityButton";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];

const GHOST_EVENTS: Array<{ day: number; top: string; height: string }> = [
  { day: 1, top: "12%", height: "14%" },
  { day: 2, top: "28%", height: "10%" },
  { day: 3, top: "18%", height: "18%" },
  { day: 4, top: "42%", height: "12%" },
  { day: 5, top: "22%", height: "16%" },
];

export function CalendarEmptyState({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={`buyer-empty bd-cal-empty${embedded ? " bd-cal-empty--embedded" : ""}`}>
      <BuyerEmptyIntro
        title="Your schedule will live here"
        lede="Book sessions, classes, and shoot days — they'll show up on the grid."
      >
        <CreateActivityButton
          triggerClassName="buyer-chrome-bar__cta"
          triggerLabel="Create activity"
          showPlusIcon
        />
      </BuyerEmptyIntro>

      <div className="bd-cal-empty__toolbar" aria-hidden>
        <div className="bd-cal-empty__toolbar-start">
          <span className="buyer-empty__bone bd-cal-empty__chip-bone" />
          <span className="buyer-empty__bone bd-cal-empty__chip-bone" />
          <span className="buyer-empty__bone bd-cal-empty__chip-bone" />
        </div>
        <div className="bd-cal-empty__toolbar-center">
          <span className="buyer-empty__bone bd-cal-empty__title-bone" />
        </div>
        <div className="bd-cal-empty__toolbar-end">
          <span className="buyer-empty__bone bd-cal-empty__nav-bone" />
        </div>
      </div>

      <div className="bd-cal-empty__panel" aria-hidden>
        <div className="bd-cal-empty__grid">
          <div className="bd-cal-empty__header">
            <span className="bd-cal-empty__gutter-spacer" />
            {WEEKDAYS.map((day) => (
              <span key={day} className="bd-cal-empty__day-header">
                <span className="buyer-empty__bone bd-cal-empty__weekday-bone" />
                <span className="buyer-empty__bone bd-cal-empty__daynum-bone" />
              </span>
            ))}
          </div>

          <div className="bd-cal-empty__body">
            <div className="bd-cal-empty__gutter">
              {HOURS.map((hour) => (
                <span key={hour} className="bd-cal-empty__hour">
                  <span className="buyer-empty__bone bd-cal-empty__hour-bone" />
                </span>
              ))}
            </div>

            {WEEKDAYS.map((_, dayIndex) => (
              <div key={dayIndex} className="bd-cal-empty__column">
                {HOURS.map((hour) => (
                  <div key={hour} className="bd-cal-empty__cell" />
                ))}
                {GHOST_EVENTS.filter((event) => event.day === dayIndex).map((event, index) => (
                  <span
                    key={index}
                    className="bd-cal-empty__event"
                    style={{ top: event.top, height: event.height }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
