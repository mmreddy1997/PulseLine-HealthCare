import type { Ref } from "react";

export function PulseMark() {
  return (
    <svg className="pulse-mark" viewBox="0 0 32 16" aria-hidden="true">
      <path
        d="M1 8 H8 L10.5 8 L12 3 L14.5 13 L16.5 8 H31"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="pulse-accent"
        d="M12 3 L14.5 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader({
  page = "explore",
  onExplore,
  onAbout,
  onPitch,
}: {
  page?: "explore" | "about";
  onExplore?: () => void;
  onAbout?: () => void;
  onPitch?: () => void;
  closeLabel?: string;
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href="#hospitals"
        onClick={(event) => {
          if (!onExplore) return;
          event.preventDefault();
          onExplore();
        }}
      >
        <PulseMark />
        <span>PulseLine</span>
      </a>
      <nav className="site-nav" aria-label="Site">
        <a
          href="#hospitals"
          aria-current={page === "explore" ? "page" : undefined}
          onClick={(event) => {
            if (!onExplore) return;
            event.preventDefault();
            onExplore();
          }}
        >
          Explorer
        </a>
        <a
          href="#about"
          aria-current={page === "about" ? "page" : undefined}
          onClick={(event) => {
            if (!onAbout) return;
            event.preventDefault();
            onAbout();
          }}
        >
          About PulseLine
        </a>
        <a
          href="#about-pitch"
          onClick={(event) => {
            if (!onPitch && !onAbout) return;
            event.preventDefault();
            (onPitch ?? onAbout)?.();
          }}
        >
          Pitch
        </a>
      </nav>
    </header>
  );
}
