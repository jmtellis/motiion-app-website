"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import {
  grantIndustryAccessUnlock,
  hasIndustryAccessUnlock,
  isValidIndustryAccessPassword,
} from "@/lib/talent-buyers/industry-access";

export function IndustryAccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUnlocked(hasIndustryAccessUnlock());
    setReady(true);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidIndustryAccessPassword(password)) {
      setError("Incorrect password.");
      return;
    }
    grantIndustryAccessUnlock();
    setUnlocked(true);
  }

  if (!ready) return null;
  if (unlocked) return children;

  return (
    <form className="industry-access-gate" onSubmit={submit}>
      <h1>Industry access</h1>
      <p>Enter the industry access password to add this profile.</p>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />
      </label>
      {error ? <p className="industry-access-gate__error">{error}</p> : null}
      <button type="submit" disabled={password.trim().length === 0}>
        Continue
      </button>
    </form>
  );
}
