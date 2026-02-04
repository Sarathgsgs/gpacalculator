import React from "react";
import { Link } from "react-router-dom";
import Disclaimer from "../../components/Disclaimer.js";

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/60 p-5 shadow-glow">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="pt-4 md:pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold tracking-widest text-accent ring-1 ring-accent/20">
            ACADEMIC PRECISION TOOL
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-text md:text-6xl">
            GPA &amp; CGPA <span className="text-accent">Calculator</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            A premium, data-focused tool for engineering students. Calculate semester GPA with
            credit-weighted accuracy and compute cumulative CGPA in seconds.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/gpa"
              className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-bg shadow-glow hover:brightness-110"
            >
              Calculate GPA
            </Link>
            <Link
              to="/cgpa"
              className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-semibold text-text ring-1 ring-border hover:bg-white/10"
            >
              Calculate CGPA
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3">
        <FeatureCard
          title="Engineering Logic"
          desc="Optimized for credit-hour weighting and the standard 10-point grade scale."
        />
        <FeatureCard
          title="Fast Interaction"
          desc="Radio-style grade pills. No dropdown friction—built for result-day speed."
        />
        <FeatureCard
          title="Privacy First"
          desc="No login, no cookies, no tracking. You only fetch public course metadata."
        />
      </section>

      <Disclaimer />
    </div>
  );
}