"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import "@/app/signup/signup-split.css";

const AUTH_SPLIT_TRANSITION_MS = 360;

type AuthSplitPhase = "idle" | "exit";

type AuthSplitTransitionContextValue = {
  navigate: (href: string) => void;
};

const AuthSplitTransitionContext = createContext<AuthSplitTransitionContextValue | null>(null);

export function AuthSplitTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const isExitingRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  // Always paint visible first — an opacity-0 enter frame was flashing the paper body.
  const [phase, setPhase] = useState<AuthSplitPhase>("idle");

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/signup");
    router.prefetch("/login");
    router.prefetch("/talent-buyers/signup");
  }, [router]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const navigate = useCallback(
    (href: string) => {
      if (isExitingRef.current) return;
      isExitingRef.current = true;

      if (reduceMotion) {
        if (href === "/") {
          sessionStorage.setItem("auth-split-home-enter", "1");
        }
        router.push(href);
        return;
      }

      setPhase("exit");
      exitTimerRef.current = window.setTimeout(() => {
        if (href === "/") {
          sessionStorage.setItem("auth-split-home-enter", "1");
        }
        router.push(href);
      }, AUTH_SPLIT_TRANSITION_MS);
    },
    [reduceMotion, router],
  );

  return (
    <AuthSplitTransitionContext value={{ navigate }}>
      <div className={`signup-split-transition signup-split-transition--${phase}`}>{children}</div>
    </AuthSplitTransitionContext>
  );
}

export function useAuthSplitTransition() {
  const context = useContext(AuthSplitTransitionContext);
  if (!context) {
    throw new Error("useAuthSplitTransition must be used within AuthSplitTransitionProvider");
  }
  return context;
}

type AuthSplitLinkProps = ComponentProps<typeof Link>;

export function AuthSplitLink({ href, ...props }: AuthSplitLinkProps) {
  const { navigate } = useAuthSplitTransition();
  const target = typeof href === "string" ? href : (href.pathname ?? "/");

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        navigate(target);
      }}
    />
  );
}
