"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const LINKS = [
  { href: "/about", label: "Overview", icon: "info" },
  { href: "/monitor", label: "Monitor", icon: "monitor" },
  { href: "/replay", label: "Timelines", icon: "replay" },
  { href: "/research", label: "Research", icon: "table" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="SepsisWatch home">
          <span className="brand-mark"><Icon name="activity" size={23} /></span>
          <span>Sepsis<span className="brand-light">Watch</span></span>
        </Link>
        <nav aria-label="Main" className="main-nav">
          {LINKS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="nav-link"><Icon name={icon} size={17} />{label}</Link>;
          })}
        </nav>
        <div className="workspace-label"><span className="workspace-symbol" aria-hidden="true">SW</span><span>SepsisWatch<span className="workspace-subtitle">Patient monitoring workspace</span></span></div>
      </div>
    </header>
  );
}
