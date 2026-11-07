import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Globe,
  Instagram,
  Link2,
  Newspaper,
  Play,
  ShoppingBag,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { AppleLogo } from "@/components/icons/AppleLogo";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import {
  DEFAULT_FEATURED_COVER,
  LINK_KIND_LABELS,
  buttonLabelFor,
  defaultCoverFor,
  defaultThumbFor,
  type LinkKind,
  type LinkTreeItem,
} from "@/lib/links/link-tree";
import { loadLinkTree } from "@/lib/links/notion-links";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

import { LinkTreeAnchor } from "./LinkTreeAnchor";
import "./links.css";

const description = "Download the Motiion app, shop merch, and follow @motiion.app.";

export const metadata: Metadata = {
  title: "Links",
  description,
  alternates: { canonical: "/links" },
  openGraph: { title: "Motiion · Links", description, url: "/links" },
  twitter: { title: "Motiion · Links", description },
};

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export const revalidate = 60;

const KIND_ICONS: Record<LinkKind, LucideIcon> = {
  app: Smartphone,
  instagram: Instagram,
  shop: ShoppingBag,
  event: CalendarDays,
  video: Play,
  article: Newspaper,
  website: Globe,
  other: Link2,
};

function isAppStore(href: string) {
  return href.startsWith("https://apps.apple.com/");
}

function KindIcon({ item, className }: { item: LinkTreeItem; className?: string }) {
  if (isAppStore(item.href)) return <AppleLogo className={className} />;
  const Icon = KIND_ICONS[item.kind];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}

function FeaturedLink({ item, position }: { item: LinkTreeItem; position: number }) {
  const cover = item.coverSrc ?? defaultCoverFor(item.kind);
  const productShot = !item.coverSrc && cover !== DEFAULT_FEATURED_COVER;

  return (
    <LinkTreeAnchor
      href={item.href}
      linkId={item.id}
      kind={item.kind}
      position={position}
      className="links-feature"
    >
      <div className={`links-feature__media${productShot ? " links-feature__media--product" : ""}`}>
        <Image
          src={cover}
          alt=""
          fill
          sizes="(max-width: 600px) 100vw, 560px"
          priority={position === 0}
        />
        {item.badge ? <span className="links-badge links-feature__badge">{item.badge}</span> : null}
      </div>
      <div className="links-feature__body">
        <p className="links-eyebrow">
          <KindIcon item={item} className="links-eyebrow__icon" />
          {LINK_KIND_LABELS[item.kind]}
        </p>
        <h2 className="links-feature__title">{item.title}</h2>
        {item.description ? <p className="links-feature__description">{item.description}</p> : null}
        <span className="mkt-btn mkt-btn--primary links-feature__cta">
          {isAppStore(item.href) ? <AppleLogo className="h-[1.05rem] w-[1.05rem] shrink-0" /> : null}
          {buttonLabelFor(item)}
        </span>
      </div>
    </LinkTreeAnchor>
  );
}

function RowLink({ item, position }: { item: LinkTreeItem; position: number }) {
  const thumb = item.coverSrc ?? defaultThumbFor(item.kind);

  return (
    <LinkTreeAnchor
      href={item.href}
      linkId={item.id}
      kind={item.kind}
      position={position}
      className="links-row"
    >
      <span className="links-row__thumb" aria-hidden>
        {thumb ? (
          <Image src={thumb} alt="" fill sizes="56px" />
        ) : (
          <KindIcon item={item} className="links-row__icon" />
        )}
      </span>
      <span className="links-row__text">
        <span className="links-row__title">
          {item.title}
          {item.badge ? <span className="links-badge">{item.badge}</span> : null}
        </span>
        {item.description ? <span className="links-row__description">{item.description}</span> : null}
      </span>
      <ArrowUpRight className="links-row__arrow" aria-hidden strokeWidth={1.75} />
    </LinkTreeAnchor>
  );
}

export default async function LinksPage() {
  const { links } = await loadLinkTree();

  return (
    <div className="marketing-root links-root">
      <MarketingBodySurface dark />
      <div className="links-backdrop" aria-hidden>
        <Image src={DEFAULT_FEATURED_COVER} alt="" fill priority sizes="100vw" />
      </div>

      <main id="main-content" className="links-page">
        <header className="links-profile">
          <span className="links-profile__avatar">
            <Image src="/motiion-icon-512.png" alt="" fill sizes="88px" priority />
          </span>
          <h1 className="links-profile__name">Motiion</h1>
          <a className="links-profile__handle" href="https://www.instagram.com/motiion.app/">
            @motiion.app
          </a>
          <p className="links-profile__tagline">Powering the dance industry.</p>
        </header>

        {links.length > 0 ? (
          <ul className="links-list">
            {links.map((item, position) => (
              <li key={item.id}>
                {item.featured ? (
                  <FeaturedLink item={item} position={position} />
                ) : (
                  <RowLink item={item} position={position} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="links-empty">New links are on the way.</p>
        )}

        <footer className="links-footer">
          <Link href="/" className="links-footer__home" aria-label="Motiion home">
            <MotiionWordmark height={14} />
          </Link>
          <p>© {new Date().getFullYear()} Motiion Ventures, Inc.</p>
        </footer>
      </main>
    </div>
  );
}
