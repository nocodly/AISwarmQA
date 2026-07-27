type BrandIconName =
  | "agent"
  | "browser"
  | "bug"
  | "interaction"
  | "console"
  | "accessibility"
  | "mobile"
  | "evidence"
  | "screenshot"
  | "github"
  | "duplicate"
  | "private"
  | "issue"
  | "complete";

const details: Record<BrandIconName, string> = {
  agent: "M28 16 L44 25 L44 43 L28 52 L12 43 L12 25 Z M22 34 L34 34",
  browser: "M12 18 H44 V48 H12 Z M12 27 H44 M20 22 H21",
  bug: "M28 19 C36 19 41 26 41 35 C41 45 36 51 28 51 C20 51 15 45 15 35 C15 26 20 19 28 19 Z M11 29 H45 M15 41 H8 M41 41 H48",
  interaction: "M16 42 C21 25 32 20 43 16 M35 15 L43 16 L40 24 M18 45 L30 35 L39 49",
  console: "M12 17 H44 V49 H12 Z M18 28 L25 35 L18 42 M29 42 H39",
  accessibility: "M28 14 A4 4 0 1 0 28 22 A4 4 0 1 0 28 14 M14 28 H42 M28 29 V50 M20 50 L28 36 L36 50",
  mobile: "M18 12 H38 C41 12 42 14 42 17 V51 C42 54 41 56 38 56 H18 C15 56 14 54 14 51 V17 C14 14 15 12 18 12 Z M24 49 H32",
  evidence: "M14 17 H42 V49 H14 Z M20 25 H36 M20 33 H32 M20 41 H38",
  screenshot: "M13 20 V15 H25 M31 15 H43 V27 M43 33 V45 H31 M25 45 H13 V33 M21 32 L27 38 L37 26",
  github: "M18 42 C12 36 13 24 22 20 C25 13 38 13 41 21 C49 25 49 37 41 43 M24 43 V37 M36 43 V37 M23 31 H37",
  duplicate: "M18 18 H40 V40 H18 Z M12 28 H28 V50 H12 Z",
  private: "M17 29 H39 V50 H17 Z M22 29 V22 C22 14 34 14 34 22 V29 M28 37 V43",
  issue: "M28 13 L44 22 V40 L28 51 L12 40 V22 Z M28 23 V34 M28 40 V42",
  complete: "M12 31 L24 43 L45 17"
};

type BrandTone = "lime" | "purple" | "magenta" | "cyan" | "orange";

export function BrandIcon({ name, label, tone = "cyan" }: { name: BrandIconName; label?: string; tone?: BrandTone }) {
  return (
    <span className={`brand-icon tone-${tone}`} aria-label={label}>
      <svg aria-hidden={label ? "false" : "true"} viewBox="0 0 56 64">
        <path className="icon-shell" d="M28 4 L51 17 V47 L28 60 L5 47 V17 Z" />
        <path className="icon-detail" d={details[name]} />
      </svg>
    </span>
  );
}

export function GitHubLogo({ label = "GitHub" }: { label?: string }) {
  return (
    <span className="github-logo" role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 6C17.7 6 6 17.7 6 32c0 11.4 7.4 21.1 17.7 24.6 1.3.2 1.8-.6 1.8-1.3v-5c-7.2 1.6-8.7-3.1-8.7-3.1-1.2-3-2.9-3.8-2.9-3.8-2.4-1.6.2-1.6.2-1.6 2.6.2 4 2.7 4 2.7 2.3 4 6.1 2.8 7.6 2.2.2-1.7.9-2.8 1.7-3.5-5.8-.7-11.9-2.9-11.9-12.8 0-2.8 1-5.1 2.7-6.9-.3-.7-1.2-3.5.3-6.9 0 0 2.2-.7 7.1 2.7 2.1-.6 4.3-.9 6.5-.9s4.4.3 6.5.9c4.9-3.4 7.1-2.7 7.1-2.7 1.5 3.4.6 6.2.3 6.9 1.7 1.8 2.7 4.1 2.7 6.9 0 10-6.1 12.1-11.9 12.8.9.8 1.8 2.4 1.8 4.9v7.2c0 .7.5 1.5 1.8 1.3C50.6 53.1 58 43.4 58 32 58 17.7 46.3 6 32 6Z" />
      </svg>
    </span>
  );
}
