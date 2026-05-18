'use client';

import { useEffect, type DependencyList, type RefObject } from 'react';

// ---------------------------------------------------------------------------
// Utilidad GSAP para Next.js App Router — 100% SSR-safe
//
// REGLAS:
//  • No importa GSAP estáticamente (evita crash en SSR)
//  • Registra plugins dentro de useEffect, no en top-level
//  • Usa gsap.context() + ctx.revert() para evitar memory leaks
//  • Solo anima transform y opacity (nunca width/height/top/left/margin)
//
// TIPOS: El callback recibe (gsap: any, ST: any) por diseño.
//   El tipado estático de GSAP es demasiado complejo para replicar aquí.
//   Al usar gsap en el callback los tipos se infieren correctamente en runtime
//   porque el import dinámico resuelve los types del módulo real.
// ---------------------------------------------------------------------------

// GSAP tiene un API surface enorme — `any` es la opción pragmática aquí.
// El tipado real se infiere en runtime porque el import dinámico trae los types del módulo.
/* eslint-disable @typescript-eslint/no-explicit-any */

let _bundle: { gsap: any; ST: any } | null = null;

async function _load() {
  if (_bundle) return _bundle;

  const [mod, stMod] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger').catch(() => null),
  ]);

  const gsap = mod.default ?? mod;
  const ST = stMod?.ScrollTrigger ?? null;

  const plugins: any[] = [];
  if (ST) plugins.push(ST);

  // SplitText — opcional (Club GreenSock). Se omite silenciosamente si no existe.
  let SplitTextClass: any = null;
  try {
    const splitMod = await import('gsap/SplitText');
    if (splitMod?.SplitText) {
      plugins.push(splitMod.SplitText);
      SplitTextClass = splitMod.SplitText;
    }
  } catch {
    /* SplitText no disponible en plan gratuito */
  }

  // ScrambleTextPlugin — opcional. Efecto de desencriptación para títulos.
  let hasScrambleText = false;
  try {
    const scrambleMod = await import('gsap/ScrambleTextPlugin');
    if (scrambleMod?.ScrambleTextPlugin) {
      plugins.push(scrambleMod.ScrambleTextPlugin);
      hasScrambleText = true;
    }
  } catch {
    /* ScrambleTextPlugin no disponible */
  }

  if (plugins.length) gsap.registerPlugin(...plugins);

  // Expose plugin availability flags so callers can check before using optional plugins
  (gsap as any)._hasScrambleText = hasScrambleText;
  (gsap as any)._SplitText = SplitTextClass;

  _bundle = { gsap, ST };
  return _bundle;
}

// ---------------------------------------------------------------------------
// initGSAP — precarga explícita de GSAP + plugins
// Útil para llamar una vez en un layout padre y evitar el primer await en hijos.
// ---------------------------------------------------------------------------
export async function initGSAP() {
  const { gsap } = await _load();
  return gsap;
}

// ---------------------------------------------------------------------------
// useGSAP — hook SSR-safe con gsap.context() → cleanup automático
// ---------------------------------------------------------------------------
//
// @param callback  — (gsap, ScrollTrigger) => void | cleanupFn
//                    gsap: instancia completa de GSAP
//                    ScrollTrigger: plugin (null si no se cargó)
//                    Si retorna una función, se ejecuta al desmontar (antes de ctx.revert())
// @param deps      — Array de dependencias (igual que useEffect). [] = corre 1 vez al montar.
// @param scope     — Ref a un elemento para limitar el scope del context.
//                    Sin scope, el context aplica al componente completo.
//
// @example Uso básico con scope
//   "use client";
//   import { useRef } from "react";
//   import { useGSAP } from "@/lib/gsap";
//
//   export default function Hero() {
//     const sectionRef = useRef<HTMLElement>(null);
//
//     useGSAP((gsap, ST) => {
//       gsap.from(".hero-title", {
//         y: 60, opacity: 0, duration: 0.8, ease: "power3.out"
//       });
//       gsap.from(".hero-sub", {
//         y: 30, opacity: 0, duration: 0.6, delay: 0.2
//       });
//
//       // ScrollTrigger (si está disponible)
//       if (ST) {
//         ST.create({
//           trigger: ".card",
//           start: "top 80%",
//           animation: gsap.from(".card", { opacity: 0, y: 40 }),
//         });
//       }
//     }, [], sectionRef);
//
//     return (
//       <section ref={sectionRef}>
//         <h1 className="hero-title">Snacks 911</h1>
//         <p className="hero-sub">Tu antojo llega en 30 min</p>
//         <div className="card">...</div>
//       </section>
//     );
//   }
//
// @example Con dependencias reactivas (re-ejecuta cuando items cambia)
//   useGSAP((gsap) => {
//     gsap.from(".item", { opacity: 0, stagger: 0.1 });
//   }, [items]);
//
// @example Con cleanup manual (callback retorna una función)
//   useGSAP((gsap) => {
//     const tween = gsap.to(".bar", { width: "100%", duration: 1 });
//     return () => tween.kill();
//   }, []);
// ---------------------------------------------------------------------------

export function useGSAP(
  callback: (gsap: any, ST: any) => void | (() => void),
  deps: DependencyList = [],
  scope?: RefObject<Element | null> | null,
) {
  useEffect(() => {
    let ctx: any = null;
    let cancelled = false;
    let userCleanup: (() => void) | undefined;

    _load().then(({ gsap, ST }) => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        userCleanup = callback(gsap, ST) ?? undefined;
      }, scope?.current ?? undefined);
    });

    return () => {
      cancelled = true;
      userCleanup?.();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
