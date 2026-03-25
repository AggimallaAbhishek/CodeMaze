import { useEffect, useRef, useState } from "react";

export function useElementWidth(defaultWidth = 320) {
  const ref = useRef(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    function updateWidth(nextWidth) {
      const safeWidth = Math.floor(nextWidth);
      if (safeWidth > 0) {
        setWidth((currentWidth) => (currentWidth === safeWidth ? currentWidth : safeWidth));
      }
    }

    function measure() {
      updateWidth(element.getBoundingClientRect().width);
    }

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        window.removeEventListener("resize", measure);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [defaultWidth]);

  return [ref, width];
}
