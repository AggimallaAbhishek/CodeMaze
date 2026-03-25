import { useEffect, useMemo, useState } from "react";

const TARGET_TEXT = "CODEMAZE";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SCRAMBLE_TICK_MS = 64;
const REVEAL_INTERVAL_MS = 330;
const LOOP_HOLD_MS = 2200;
const START_DELAY_MS = 260;

function randomCharacter() {
  const index = Math.floor(Math.random() * SCRAMBLE_CHARS.length);
  return SCRAMBLE_CHARS[index];
}

function buildFrame(resolvedCount) {
  return TARGET_TEXT.split("")
    .map((char, index) => (index < resolvedCount ? char : randomCharacter()))
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
    let scrambleIntervalId = null;
    let revealIntervalId = null;
    let startTimeoutId = null;
    let holdTimeoutId = null;
    let cycle = 0;

    const runCycle = () => {
      if (!active) {
        return;
      }

      cycle += 1;
      let resolvedCount = 0;
      console.debug("home_codemaze_cipher_cycle_started", { cycle });
      setResolvedCount(0);
      setDisplayText(buildFrame(0));

      scrambleIntervalId = window.setInterval(() => {
        if (!active) {
          return;
        }
        setDisplayText(buildFrame(resolvedCount));
      }, SCRAMBLE_TICK_MS);

      revealIntervalId = window.setInterval(() => {
        if (!active) {
          return;
        }

        resolvedCount += 1;
        setResolvedCount(resolvedCount);
        setDisplayText(buildFrame(resolvedCount));

        if (resolvedCount >= TARGET_TEXT.length) {
          if (revealIntervalId) {
            window.clearInterval(revealIntervalId);
            revealIntervalId = null;
          }
          if (scrambleIntervalId) {
            window.clearInterval(scrambleIntervalId);
            scrambleIntervalId = null;
          }
          setDisplayText(TARGET_TEXT);
          setResolvedCount(TARGET_TEXT.length);
          console.debug("home_codemaze_cipher_cycle_completed", { cycle });
          holdTimeoutId = window.setTimeout(runCycle, LOOP_HOLD_MS);
        }
      }, REVEAL_INTERVAL_MS);
    };

    setDisplayText(buildFrame(0));
    setResolvedCount(0);
    startTimeoutId = window.setTimeout(runCycle, START_DELAY_MS);

    return () => {
      active = false;
      if (scrambleIntervalId) {
        window.clearInterval(scrambleIntervalId);
      }
      if (revealIntervalId) {
        window.clearInterval(revealIntervalId);
      }
      if (startTimeoutId) {
        window.clearTimeout(startTimeoutId);
      }
      if (holdTimeoutId) {
        window.clearTimeout(holdTimeoutId);
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
