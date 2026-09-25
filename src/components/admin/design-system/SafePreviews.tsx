"use client";

import {
  AuthButton,
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthCardTitle,
  AuthError,
  AuthField,
  AuthInput,
  AuthMuted,
} from "@/components/auth/ui";
import { AuthDivider } from "@/components/auth/oauth-buttons";
import { ProChip } from "@/components/talent-buyers/billing/ProChip";
import "@/components/talent-buyers/billing/upgrade-pro.css";
import { EmptyState as TalentEmptyState } from "@/components/talent/EmptyState";
import { SectionHeader as TalentSectionHeader } from "@/components/talent/SectionHeader";
import { VerificationBadge } from "@/components/talent/VerificationBadge";
import { EmptyState as BuyerEmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { BuyerTalentCard } from "@/components/talent-buyers/dashboard/BuyerTalentCard";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { SectionHeader as LandingSectionHeader } from "@/components/landing/SectionHeader";
import { HeightPicker } from "@/components/onboarding/HeightPicker";
import { TalentCard as SearchTalentCard } from "@/components/search/TalentCard";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { Divider } from "@/components/ui/Divider";
import { Field, Input, Select, TextArea } from "@/components/ui/Field";
import { Radio } from "@/components/ui/Radio";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import type { CatalogSampleProfile } from "@/lib/design-system/sample-media";
import type { SearchProfileRecord } from "@/types/search";
import type { BuyerTalentSummary } from "@/types/talent-buyer-dashboard";
import { useState } from "react";
import { PreviewFrame } from "./PreviewFrame";
export function ButtonsSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Shared button classes from globals.css. Prefer these over one-off button styles.
      </p>
      <PreviewFrame title="Light surface" path="globals.css" surface="light">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary">
            Primary
          </button>
          <button type="button" className="btn-secondary">
            Secondary
          </button>
          <button type="button" className="btn-outline">
            Outline
          </button>
          <button type="button" className="btn-primary" disabled>
            Disabled
          </button>
        </div>
      </PreviewFrame>
      <PreviewFrame title="Dark surface" path="globals.css (.btn-*-on-dark)">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary btn-on-dark">
            On dark
          </button>
          <button type="button" className="btn-outline btn-outline-on-dark">
            Outline on dark
          </button>
          <button type="button" className="btn-hero-pill btn-hero-pill-accent">
            Hero pill
          </button>
        </div>
      </PreviewFrame>
    </div>
  );
}

export function AuthSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Shared auth card chrome from auth/ui.tsx.
      </p>
      <PreviewFrame title="Auth card" path="auth/ui.tsx" surface="light">
        <AuthCard className="max-w-md">
          <AuthCardHeader>
            <AuthCardTitle>Sign in</AuthCardTitle>
            <AuthMuted>Sample auth card for the design catalog.</AuthMuted>
          </AuthCardHeader>
          <AuthCardContent>
            <AuthError>Something went wrong (sample).</AuthError>
            <AuthField label="Email">
              <AuthInput type="email" defaultValue="jaymtellis@gmail.com" readOnly />
            </AuthField>
            <div className="flex flex-wrap gap-2">
              <AuthButton variant="primary">Continue</AuthButton>
              <AuthButton variant="secondary">Secondary</AuthButton>
              <AuthButton variant="ghost">Ghost</AuthButton>
            </div>
          </AuthCardContent>
        </AuthCard>
      </PreviewFrame>
    </div>
  );
}

export function EmptyStatesSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Two presentational empty-state variants used in talent and buyer surfaces.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <PreviewFrame title="Talent" path="talent/EmptyState.tsx">
          <TalentEmptyState
            title="No projects yet"
            description="When you join a project it will show up here."
            action={{ href: "#", label: "Browse open calls" }}
          />
        </PreviewFrame>
        <PreviewFrame title="Buyer" path="talent-buyers/dashboard/EmptyState.tsx" surface="light">
          <BuyerEmptyState
            title="No collections yet"
            description="Save talent into a collection to compare later."
            actionLabel="Create collection"
            onAction={() => undefined}
          />
        </PreviewFrame>
      </div>
    </div>
  );
}

export function HeadersSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Section headers for product and marketing surfaces.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <PreviewFrame title="Talent" path="talent/SectionHeader.tsx">
          <TalentSectionHeader title="Portfolio" subtitle="Credits, media, and links" />
        </PreviewFrame>
        <PreviewFrame title="Landing" path="landing/SectionHeader.tsx" surface="light">
          <LandingSectionHeader
            eyebrow="Product"
            title="One place for the work"
            description="Marketing section header used on landing pages."
          />
        </PreviewFrame>
      </div>
    </div>
  );
}

export function BadgesSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Verification badges and Industry Pro chip.
      </p>
      <PreviewFrame title="Badges & chips" path="VerificationBadge · ProChip">
        <div className="flex flex-wrap items-center gap-3">
          <VerificationBadge status="motiion_verified" />
          <VerificationBadge status="industry_confirmed" />
          <VerificationBadge status="talent_reported" />
          <VerificationBadge status="unverified" />
          <ProChip />
          <ProChip tone="on-active" />
        </div>
      </PreviewFrame>
    </div>
  );
}

export function TalentCardsSection({ sample }: { sample: CatalogSampleProfile }) {
  const searchProfile: SearchProfileRecord = {
    id: "catalog-sample",
    username: sample.username,
    display_name: sample.displayName,
    full_name: sample.displayName,
    headshot_url: sample.headshotUrls[0],
    headshot_urls: [...sample.headshotUrls],
    location: sample.location,
    talent_types: ["dancer"],
    styles: ["commercial", "contemporary"],
    is_verified: true,
  };

  const buyerTalent: BuyerTalentSummary = {
    id: "catalog-sample",
    name: sample.displayName,
    location: sample.location,
    avatarUrl: sample.headshotUrls[0],
    profileSlug: sample.username,
    styles: ["Commercial", "Contemporary"],
  };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Cards that need portraits use Jay Tellis headshots (jaymtellis@gmail.com).
      </p>
      <PreviewFrame title="Search TalentCard" path="search/TalentCard.tsx">
        <div className="grid max-w-sm gap-4 sm:grid-cols-2 sm:max-w-xl">
          {sample.headshotUrls.slice(0, 2).map((url, index) => (
            <SearchTalentCard
              key={url}
              profile={{
                ...searchProfile,
                headshot_url: url,
                headshot_urls: [url],
                is_verified: index === 0,
              }}
            />
          ))}
        </div>
      </PreviewFrame>
      <PreviewFrame title="BuyerTalentCard" path="talent-buyers/dashboard/BuyerTalentCard.tsx" surface="light">
        <div className="max-w-md space-y-3">
          <BuyerTalentCard talent={buyerTalent} />
          <BuyerTalentCard
            talent={{
              ...buyerTalent,
              avatarUrl: sample.headshotUrls[1] ?? buyerTalent.avatarUrl,
            }}
          />
        </div>
      </PreviewFrame>
      <PreviewFrame title="Headshot strip" path="sample media">
        <div className="flex flex-wrap gap-3">
          {sample.headshotUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="size-20 rounded-[var(--ds-radius-md)] object-cover ring-1 ring-[var(--ds-border)]"
            />
          ))}
        </div>
      </PreviewFrame>
    </div>
  );
}

/** Flat dump of all component previews (legacy). */
export function SafePreviews({ sample }: { sample: CatalogSampleProfile }) {
  return (
    <div className="space-y-12">
      <ButtonsSection />
      <AuthSection />
      <InputsSection />
      <SelectionSection />
      <PickersSection />
      <DividersSection />
      <AvatarsSection sample={sample} />
      <EmptyStatesSection />
      <HeadersSection />
      <BadgesSection />
      <TalentCardsSection sample={sample} />
    </div>
  );
}

export function InputsSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Text fields use the shared <code className="font-mono text-[11px]">.field</code> pattern
        (same as auth). Prefer these over one-off input styles.
      </p>
      <PreviewFrame title="Text fields" path="components/ui/Field.tsx" surface="light">
        <div className="mx-auto max-w-md space-y-4">
          <Field label="Email" hint="We’ll never share this.">
            <Input type="email" defaultValue="jaymtellis@gmail.com" />
          </Field>
          <Field label="Display name">
            <Input type="text" defaultValue="Jay Tellis" />
          </Field>
          <Field label="Bio">
            <TextArea defaultValue="Dancer · LA" rows={3} />
          </Field>
          <Field label="Account type">
            <Select defaultValue="talent">
              <option value="talent">Talent</option>
              <option value="hiring">Talent buyer</option>
            </Select>
          </Field>
        </div>
      </PreviewFrame>
    </div>
  );
}

export function SelectionSection() {
  const [notifications, setNotifications] = useState(true);
  const [visibility, setVisibility] = useState("public");
  const [modes, setModes] = useState({ commercial: true, contemporary: false, ballet: true });
  const [segment, setSegment] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Checkboxes, radios, switches, and segmented controls. Shared primitives live in{" "}
        <code className="font-mono text-[11px]">components/ui</code>; segmented control is the
        existing buyer control.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <PreviewFrame title="Checkbox" path="components/ui/Checkbox.tsx">
          <div className="space-y-3">
            <Checkbox
              label="Commercial"
              description="Open to commercial bookings"
              checked={modes.commercial}
              onChange={(e) => setModes((m) => ({ ...m, commercial: e.target.checked }))}
            />
            <Checkbox
              label="Contemporary"
              checked={modes.contemporary}
              onChange={(e) => setModes((m) => ({ ...m, contemporary: e.target.checked }))}
            />
            <Checkbox
              label="Ballet"
              checked={modes.ballet}
              onChange={(e) => setModes((m) => ({ ...m, ballet: e.target.checked }))}
            />
          </div>
        </PreviewFrame>

        <PreviewFrame title="Radio" path="components/ui/Radio.tsx">
          <div className="space-y-3">
            <Radio
              name="visibility"
              value="public"
              label="Public"
              description="Anyone with the link can view"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <Radio
              name="visibility"
              value="private"
              label="Private"
              description="Only people you invite"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
          </div>
        </PreviewFrame>
      </div>

      <PreviewFrame title="Switch" path="components/ui/Switch.tsx">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--ds-text-default)]">Push notifications</p>
            <p className="text-xs text-[var(--ds-text-low)]">Alerts for messages and invites</p>
          </div>
          <Switch
            checked={notifications}
            onCheckedChange={setNotifications}
            label="Push notifications"
          />
        </div>
      </PreviewFrame>

      <PreviewFrame title="SegmentedControl" path="talent-buyers/dashboard/SegmentedControl.tsx">
        <SegmentedControl
          ariaLabel="View mode"
          value={segment}
          onChange={setSegment}
          options={[
            { value: "grid", label: "Grid" },
            { value: "list", label: "List" },
          ]}
        />
      </PreviewFrame>
    </div>
  );
}

export function PickersSection() {
  const [height, setHeight] = useState("5'10\"");
  const [level, setLevel] = useState(6);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Sliders and number-style pickers. HeightPicker is the production onboarding control; Slider
        is the shared token-aligned range input.
      </p>
      <PreviewFrame title="Slider" path="components/ui/Slider.tsx">
        <Slider
          label="Intensity"
          valueLabel={level}
          min={1}
          max={10}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
        />
      </PreviewFrame>
      <PreviewFrame title="HeightPicker" path="onboarding/HeightPicker.tsx" surface="light">
        <HeightPicker value={height} onChange={setHeight} />
      </PreviewFrame>
    </div>
  );
}

export function DividersSection() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Hairline dividers. Prefer the shared Divider; AuthDivider is the labeled auth variant.
      </p>
      <PreviewFrame title="Divider" path="components/ui/Divider.tsx">
        <div className="space-y-6">
          <p className="text-sm text-[var(--ds-text-low)]">Above the rule</p>
          <Divider />
          <p className="text-sm text-[var(--ds-text-low)]">Below the rule</p>
          <Divider label="or" />
          <p className="text-sm text-[var(--ds-text-low)]">After a labeled rule</p>
        </div>
      </PreviewFrame>
      <PreviewFrame title="AuthDivider" path="auth/oauth-buttons.tsx" surface="light">
        <AuthDivider label="or continue with" />
      </PreviewFrame>
    </div>
  );
}

export function AvatarsSection({ sample }: { sample: CatalogSampleProfile }) {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ds-muted)]">
        Circular avatars with initials fallback. Sample images are Jay Tellis headshots.
      </p>
      <PreviewFrame title="Avatar sizes" path="components/ui/Avatar.tsx">
        <div className="flex flex-wrap items-end gap-4">
          <Avatar src={sample.headshotUrls[0]} name={sample.displayName} size="sm" />
          <Avatar src={sample.headshotUrls[1]} name={sample.displayName} size="md" />
          <Avatar src={sample.headshotUrls[2]} name={sample.displayName} size="lg" />
          <Avatar src={sample.headshotUrls[3]} name={sample.displayName} size="xl" />
          <Avatar name={sample.displayName} size="lg" />
        </div>
      </PreviewFrame>
      <PreviewFrame title="Avatar stack" path="components/ui/Avatar.tsx">
        <div className="flex -space-x-3">
          {sample.headshotUrls.map((url) => (
            <Avatar
              key={url}
              src={url}
              name={sample.displayName}
              size="md"
              className="ring-2 ring-[var(--ds-background)]"
            />
          ))}
        </div>
      </PreviewFrame>
    </div>
  );
}
