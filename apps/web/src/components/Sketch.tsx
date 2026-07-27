type SketchProps = {
  className?: string;
  color?: string;
  delay?: string;
  duration?: string;
  label?: string;
  variant?: "hook" | "loop" | "zigzag" | "sweep" | "elbow" | "arc" | "orbit" | "drop" | "strike" | "curl";
};

const paths = {
  hook: "M5 64 C58 8 128 11 176 36 C195 46 204 58 214 78 M198 65 L214 78 L199 91",
  loop: "M18 74 C48 12 138 13 154 54 C168 90 107 104 86 70 C72 47 100 28 128 44",
  zigzag: "M8 46 L52 24 L82 58 L126 20 L154 50 L198 28",
  sweep: "M8 72 C62 28 129 24 214 48 M190 34 L214 48 L193 64",
  elbow: "M12 18 C55 50 92 52 128 47 C164 42 187 55 204 82 M187 79 L204 82 L194 65",
  arc: "M8 86 C32 20 156 8 210 74",
  orbit: "M28 58 C28 20 92 10 132 34 C177 61 158 110 93 105 C36 101 8 68 28 58",
  drop: "M18 8 C28 48 52 68 100 72 C146 75 180 57 210 30",
  strike: "M7 47 C68 38 123 50 194 38",
  curl: "M12 72 C42 22 98 18 114 52 C126 78 84 92 70 67 C58 45 94 36 123 42 C158 49 180 65 202 90"
};

export function SketchPath({ className = "", color = "var(--lime)", delay = "0s", duration = "0.9s", label, variant = "hook" }: SketchProps) {
  return (
    <svg className={`sketch-path ${className}`} aria-hidden="true" viewBox="0 0 220 112" style={{ "--sketch-color": color, "--sketch-delay": delay, "--sketch-duration": duration } as CSSProperties}>
      <path d={paths[variant]} />
      {label ? <text x="28" y="24">{label}</text> : null}
    </svg>
  );
}

export function SketchCircle({ className = "", color = "var(--magenta)", delay = "0.2s" }: SketchProps) {
  return (
    <svg className={`sketch-circle ${className}`} aria-hidden="true" viewBox="0 0 240 92" style={{ "--sketch-color": color, "--sketch-delay": delay } as CSSProperties}>
      <path d="M30 48 C25 11 96 4 158 15 C226 27 220 78 142 84 C73 89 18 77 30 48" />
    </svg>
  );
}

export function SketchUnderline({ className = "", color = "var(--purple)", delay = "0.1s" }: SketchProps) {
  return (
    <svg className={`sketch-underline ${className}`} aria-hidden="true" viewBox="0 0 260 48" style={{ "--sketch-color": color, "--sketch-delay": delay } as CSSProperties}>
      <path d="M8 28 C58 18 88 34 136 25 C184 16 209 30 252 19" />
      <path d="M42 38 C96 30 161 39 224 31" />
    </svg>
  );
}

export function SketchBracket({ className = "", color = "var(--cyan)", delay = "0.2s" }: SketchProps) {
  return (
    <svg className={`sketch-bracket ${className}`} aria-hidden="true" viewBox="0 0 80 180" style={{ "--sketch-color": color, "--sketch-delay": delay } as CSSProperties}>
      <path d="M66 12 C26 10 20 22 24 45 L31 74 C36 96 18 100 12 111 C24 119 38 123 32 147 L27 167 C38 174 52 174 68 169" />
    </svg>
  );
}

export function BugTrail({ className = "", color = "var(--orange)", delay = "0s" }: SketchProps) {
  return (
    <svg className={`bug-trail ${className}`} aria-hidden="true" viewBox="0 0 320 160" style={{ "--sketch-color": color, "--sketch-delay": delay } as CSSProperties}>
      <path d="M18 132 C72 90 38 43 95 36 C154 29 156 112 217 91 C258 77 262 32 306 18" />
      <circle cx="18" cy="132" r="4" />
      <circle cx="95" cy="36" r="4" />
      <circle cx="217" cy="91" r="4" />
      <circle cx="306" cy="18" r="4" />
    </svg>
  );
}

export function AnimatedCheckmark({ className = "", color = "var(--lime)", delay = "0.1s" }: SketchProps) {
  return (
    <svg className={`animated-checkmark ${className}`} aria-hidden="true" viewBox="0 0 96 72" style={{ "--sketch-color": color, "--sketch-delay": delay } as CSSProperties}>
      <path d="M12 38 L36 59 L84 12" />
    </svg>
  );
}

export function ScribbleLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`scribble-label ${className}`}>{children}</span>;
}
import type { CSSProperties, ReactNode } from "react";
