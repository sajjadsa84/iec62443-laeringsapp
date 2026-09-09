import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** Teller mykt opp/ned mot en ny målverdi i stedet for å hoppe rett til den. */
export function useAnimatedNumber(target: number, duration = 0.6): number {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const from = prevTarget.current;
    prevTarget.current = target;

    const controls = animate(from, target, {
      duration,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(value),
    });
    return () => controls.stop();
  }, [target, duration]);

  return display;
}
