import Image from "next/image";

/** Shared circular emblem for sign-in, signup, and profile onboarding. */
export function AuthLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-auto flex size-[72px] shrink-0 items-center justify-center rounded-full bg-black shadow-[inset_0_0_0_1px_#ffffff0a] sm:size-20 ${className}`}>
      <Image src="/marketing/footer-logo.svg" alt="Motiion" width={33} height={24} priority />
    </div>
  );
}
