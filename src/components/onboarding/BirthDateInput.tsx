"use client";

import { useState } from "react";

function displayDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value.slice(5, 7)}/${value.slice(8)}/${value.slice(0, 4)}`
    : value;
}

/** Material's direct-input pattern for dates in the distant past, such as birthdays. */
export function BirthDateInput({ value, onChange, invalid }: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const [text, setText] = useState(() => displayDate(value));

  return (
    <input
      type="text"
      aria-label="Date of birth"
      aria-describedby="birth-date-format birth-date-help"
      aria-invalid={invalid}
      placeholder="MM/DD/YYYY"
      inputMode="numeric"
      autoComplete="bday"
      value={text}
      className="setup-birth-date-input"
      onChange={(event) => {
        const digits = displayDate(event.target.value).replace(/\D/g, "").slice(0, 8);
        const next = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
        setText(next);
        onChange(digits.length === 8 ? `${digits.slice(4)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}` : next);
      }}
    />
  );
}
