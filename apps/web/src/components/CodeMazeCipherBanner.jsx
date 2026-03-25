import { useEffect, useMemo, useState } from "react";

const TARGET_TEXT = "CODEMAZE";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TICK_MS = 42;
const REVEAL_STEP = 0.34;
const LOOP_HOLD_MS = 1800;

function randomCharacter() {
  const index = Math.floor(Math.random() * SCRAMBLE_CHARS.length);
  return SCRAMBLE_CHARS[index];
}

function buildFrame(iteration) {
  return TARGET_TEXT.split("")
    .map((char, index) => (index < iteration ? char : randomCharacter()))
    .join("");
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CodeMazeCipherBanner() {
  const [displayText, setDisplayText] = useState(TARGET_TEXT);
  const [resolvedCount, setResolvedCount] = useState(TARGET_TEXT.length);
  const characters = useMemo(() => displayText.split(""), [displayText]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayText(TARGET_TEXT);
      setResolvedCount(TARGET_TEXT.length);
      return undefined;
    }

    let active = true;
    let intervalId = null;
    let timeoutId = null;
    let cycle = 0;

    const runCycle = () => {
      if (!active) {
        return;
      }

      cycle += 1;
      let iteration = 0;
      console.debug("home_codemaze_cipher_cycle_started", { cycle });

      intervalId = window.setInterval(() => {
        if (!active) {
          return;
        }

        setDisplayText(buildFrame(iteration));
        setResolvedCount(Math.max(0, Math.min(TARGET_TEXT.length, Math.floor(iteration))));
        iteration += REVEAL_STEP;

        if (iteration >= TARGET_TEXT.length + REVEAL_STEP) {
          window.clearInterval(intervalId);
          intervalId = null;
          setDisplayText(TARGET_TEXT);
          setResolvedCount(TARGET_TEXT.length);
          console.debug("home_codemaze_cipher_cycle_completed", { cycle });
          timeoutId = window.setTimeout(runCycle, LOOP_HOLD_MS);
        }
      }, TICK_MS);
    };

    setDisplayText(buildFrame(0));
    setResolvedCount(0);
    timeoutId = window.setTimeout(runCycle, 260);

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <section className="codemaze-banner-shell" aria-label="CodeMaze cipher banner">
      <h2 className="codemaze-cipher-text" aria-hidden="true">
        {characters.map((char, index) => (
          <span
            key={`${index}-${char}`}
            className={index < resolvedCount ? "codemaze-cipher-char resolved" : "codemaze-cipher-char scramble"}
          >
            {char}
          </span>
        ))}
      </h2>
      <span className="sr-only">CODEMAZE</span>
    </section>
  );
}
