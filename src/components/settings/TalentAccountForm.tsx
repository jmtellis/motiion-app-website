"use client";

import { useState, useTransition } from "react";

import {
  sendTalentPasswordReset,
  setTalentAccountPrivate,
  updateTalentAccount,
  updateTalentEmail,
  updateTalentPassword,
} from "@/app/settings/account-actions";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";
import { deleteTalentAccount } from "@/app/settings/actions";

export function formatMemberNumber(value: number | string | null | undefined) {
  const memberNumber = typeof value === "string" ? Number(value) : value;
  if (!memberNumber || !Number.isFinite(memberNumber) || memberNumber <= 0) return null;
  if (memberNumber < 10_000_000) return String(Math.trunc(memberNumber)).padStart(7, "0");
  return String(Math.trunc(memberNumber));
}

export function TalentAccountForm({
  firstName,
  lastName,
  username,
  dateOfBirth,
  email,
  contactEmail,
  memberNumber,
  isPrivate,
  canChangePassword,
  profileLabel,
}: {
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  email: string;
  contactEmail: string;
  memberNumber: string | null;
  isPrivate: boolean;
  canChangePassword: boolean;
  profileLabel: string;
}) {
  const [fields, setFields] = useState({
    firstName,
    lastName,
    username,
    dateOfBirth,
    contactEmail: contactEmail || email,
  });
  const [accountEmail, setAccountEmail] = useState(email);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [privateAccount, setPrivateAccount] = useState(isPrivate);
  const [privacyPrompt, setPrivacyPrompt] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const memberId = formatMemberNumber(memberNumber);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveAccount() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateTalentAccount(fields);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Account saved.");
    });
  }

  function saveEmail() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateTalentEmail(accountEmail);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.confirmationRequired
          ? "Check your inbox to confirm the new email."
          : "Email saved.",
      );
    });
  }

  function savePassword() {
    setError(null);
    setMessage(null);
    if (passwords.next !== passwords.confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await updateTalentPassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPasswords({ current: "", next: "", confirm: "" });
      setMessage("Password updated.");
    });
  }

  function sendReset() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendTalentPasswordReset();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Check your inbox for a password reset link.");
    });
  }

  function confirmPrivacy() {
    if (privacyPrompt === null) return;
    const next = privacyPrompt;
    setPrivacyPrompt(null);
    startTransition(async () => {
      const result = await setTalentAccountPrivate(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPrivateAccount(next);
      setMessage(next ? "Your account is now private." : "Your account is now public.");
    });
  }

  return (
    <div className="talent-settings-stack">
      <section className="talent-settings-card">
        <h2>Account</h2>
        <div className="talent-settings-grid">
          <label>
            First name
            <input
              value={fields.firstName}
              onChange={(event) => setFields({ ...fields, firstName: event.target.value })}
              autoComplete="given-name"
            />
          </label>
          <label>
            Last name
            <input
              value={fields.lastName}
              onChange={(event) => setFields({ ...fields, lastName: event.target.value })}
              autoComplete="family-name"
            />
          </label>
          <label>
            Username
            <input
              value={fields.username}
              onChange={(event) => setFields({ ...fields, username: event.target.value })}
              autoComplete="username"
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={fields.dateOfBirth}
              onChange={(event) => setFields({ ...fields, dateOfBirth: event.target.value })}
            />
          </label>
          <label className="talent-settings-span">
            Preferred contact
            <input
              type="email"
              value={fields.contactEmail}
              onChange={(event) => setFields({ ...fields, contactEmail: event.target.value })}
              autoComplete="email"
            />
          </label>
        </div>
        <button type="button" className="talent-settings-primary" disabled={pending} onClick={saveAccount}>
          {pending ? "Saving…" : "Save"}
        </button>
      </section>

      <section className="talent-settings-card">
        <h2>Sign-in</h2>
        <div className="talent-settings-grid">
          <label className="talent-settings-span">
            Email
            <input
              type="email"
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
        </div>
        <button type="button" className="talent-settings-secondary" disabled={pending} onClick={saveEmail}>
          Update email
        </button>
        {canChangePassword ? (
          <div className="talent-settings-grid">
            <label>
              Current password
              <input
                type="password"
                value={passwords.current}
                onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={passwords.next}
                onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                autoComplete="new-password"
              />
            </label>
            <label className="talent-settings-span">
              Confirm password
              <input
                type="password"
                value={passwords.confirm}
                onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                autoComplete="new-password"
              />
            </label>
          </div>
        ) : (
          <p>Your account uses social sign-in. Send a reset link to set or change your password.</p>
        )}
        <button
          type="button"
          className="talent-settings-secondary"
          disabled={pending}
          onClick={canChangePassword ? savePassword : sendReset}
        >
          {canChangePassword ? "Update password" : "Send reset link"}
        </button>
      </section>

      <section className="talent-settings-card">
        <h2>Membership</h2>
        <div className="talent-settings-member">
          <div>
            <p>Member ID</p>
            <strong>{memberId ?? "—"}</strong>
          </div>
          <button
            type="button"
            className="talent-settings-secondary"
            disabled={!memberId}
            onClick={() => {
              if (!memberId) return;
              void navigator.clipboard.writeText(memberId);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="talent-settings-privacy">
          <div>
            <p>Private account</p>
            <span>
              Private profiles are hidden from search. People you already share a class or session with can still see you on the roster.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={privateAccount}
            className="talent-settings-switch"
            disabled={pending}
            onClick={() => setPrivacyPrompt(!privateAccount)}
          >
            <span />
          </button>
        </div>
        {privacyPrompt !== null ? (
          <div className="talent-settings-confirm">
            <p>
              {privacyPrompt
                ? "Your profile will be hidden from search and removed from messaging groups. People you're already in a class or session with can still see you on the roster, but won't be able to view your profile."
                : "Your profile will appear in search and discover again."}
            </p>
            <div>
              <button type="button" className="talent-settings-primary" disabled={pending} onClick={confirmPrivacy}>
                {privacyPrompt ? "Make private" : "Make public"}
              </button>
              <button type="button" className="talent-settings-secondary" onClick={() => setPrivacyPrompt(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <p className="talent-settings-error">{error}</p> : null}
      {message ? <p className="talent-settings-success">{message}</p> : null}

      <section className="talent-settings-card" aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading">Delete account</h2>
        <p>Permanently remove your profile and sign-in access from Motiion. This cannot be undone.</p>
        <DeleteAccountButton deleteAccount={deleteTalentAccount} profileLabel={profileLabel} />
      </section>
    </div>
  );
}
