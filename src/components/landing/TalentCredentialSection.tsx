"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

import "./talent-credential.css";

/** Artwork and proportions mirror DigitalCredentialLayout in the iOS app. */
export function TalentCredentialSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.45 });
  // Hold each face long enough to read, with the portrait centered in the journey.
  const rotateY = useTransform(progress, [0, 0.22, 0.43, 0.57, 0.78, 1], [180, 180, 360, 360, 540, 540]);
  const rotateZ = useTransform(progress, [0, 0.45, 0.55, 1], [-7, 0, 0, 7]);
  const rotateX = useTransform(progress, [0, 0.5, 1], [8, 0, -8]);
  const shine = useTransform(progress, [0, 0.5, 1], ["-80%", "0%", "80%"]);

  return (
    <section ref={sectionRef} id="credential" className="talent-credential" aria-labelledby="credential-heading">
      <div className="talent-credential__stage mkt-container">
        <div className="talent-credential__copy">
          <p className="talent-credential__eyebrow">Your Motiion credential</p>
          <h2 id="credential-heading">Make your<br />{" "}<em>introduction.</em></h2>
          <p className="talent-credential__description">Your name. Your work. One scan away. Share a direct connection to your portfolio, wherever you meet.</p>
          <div className="talent-credential__caption"><span /> Made for the moments that connect us.</div>
        </div>

        <div className="talent-credential__visual">
          <div className="talent-credential__glow" aria-hidden="true" />
          <div className="talent-credential__perspective">
            <motion.div
              className="talent-credential__card"
              style={{ rotateY: reduceMotion ? 0 : rotateY, rotateZ: reduceMotion ? 0 : rotateZ, rotateX: reduceMotion ? 0 : rotateX }}
              aria-hidden="true"
            >
              <div className="talent-credential__face talent-credential__front">
                <Image className="talent-credential__wave" src="/marketing/credential/wave.svg" alt="" fill sizes="500px" />
                <div className="talent-credential__wash" />
                <Image className="talent-credential__logo" src="/marketing/credential/logo.svg" alt="" width={160} height={28} />
                <div className="talent-credential__portrait">
                  <Image src="/marketing/credential/j-tellis.jpg" alt="" fill sizes="(max-width: 767px) 200px, 280px" />
                </div>
                <div className="talent-credential__name">J Tellis</div>
                <div className="talent-credential__member">0000007</div>
                <motion.div className="talent-credential__shine" style={{ x: reduceMotion ? "0%" : shine }} />
              </div>

              <div className="talent-credential__face talent-credential__back">
                <div className="talent-credential__qr">
                  <Image src="/marketing/credential/qr.png" alt="" width={220} height={220} unoptimized />
                </div>
                <div className="talent-credential__wordmarks">
                  <Image src="/marketing/credential/wordmark.svg" alt="" width={2201} height={287} />
                  <Image src="/marketing/credential/wordmark.svg" alt="" width={2201} height={287} />
                </div>
                <motion.div className="talent-credential__shine" style={{ x: reduceMotion ? "0%" : shine }} />
              </div>
            </motion.div>
          </div>
          <Link className="talent-credential__profile" href="/profile/jaymtellis2" aria-label="View J Tellis's profile, member 0000007">
            <span>J Tellis</span><span>@jaymtellis2 <span aria-hidden="true">↗</span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
