import React from "react";
import { Link, NavLink } from "react-router-dom";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-full px-3 py-1.5 text-sm transition",
          isActive
            ? "bg-white/5 text-text ring-1 ring-border"
            : "text-muted hover:text-text hover:bg-white/5"
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/20">
            <span className="text-accent font-semibold">A</span>
          </span>
          <span className="text-sm font-semibold tracking-wide">GPA/CGPA CALC</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <NavItem to="/">Home</NavItem>
          <NavItem to="/gpa">Semester GPA</NavItem>
          <NavItem to="/cgpa">CGPA Calculator</NavItem>
        </nav>

        <div className="md:hidden">
          {/* Minimal: no hamburger in v1. Keep header clean */}
          <Link
            to="/gpa"
            className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-text ring-1 ring-border hover:bg-white/10"
          >
            Open
          </Link>
        </div>
      </div>
    </header>
  );
}