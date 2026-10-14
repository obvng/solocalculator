"use client";

import { useState } from "react";
import { CaretDown, List, MagnifyingGlass, X } from "@phosphor-icons/react";
import Link from "next/link";
import { tools } from "@/lib/tools/catalog";
import { BrandMark } from "./BrandMark";
import styles from "./Header.module.css";

type MenuName = "calculators" | "convert" | "learn";

const menus: Record<MenuName, { label: string; href: string }[]> = {
  calculators: [
    { label: "All calculators", href: "/calculators" },
    { label: "Standard calculator", href: "/calculator" },
    { label: "Scientific calculator", href: "/scientific-calculator" },
    { label: "Age calculator", href: "/age-calculator" },
    { label: "Percentage calculator", href: "/percentage-calculator" },
    { label: "Business days calculator", href: "/business-days-calculator" },
  ],
  convert: [
    { label: "Unit converter", href: "/unit-converter" },
    { label: "Currency converter", href: "/currency-converter" },
    { label: "Time duration calculator", href: "/time-duration-calculator" },
    { label: "Discount calculator", href: "/discount-calculator" },
  ],
  learn: [
    { label: "Calculator guides", href: "/blog" },
    { label: "How calculators work", href: "/calculator#how-to-use" },
  ],
};

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuName | null>(null);
  const [query, setQuery] = useState("");
  const matches = tools.filter((tool) => `${tool.title} ${tool.description}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  const closePanels = () => { setActiveMenu(null); setMenuOpen(false); };

  return (
    <header className={styles.header}>
      <Link href="/" aria-label="SoloCalculator home"><BrandMark /></Link>
      <nav className={styles.desktopNav} aria-label="Main navigation">
        {(["calculators", "convert", "learn"] as const).map((name) => (
          <div className={styles.navGroup} key={name}>
            <button type="button" aria-expanded={activeMenu === name} aria-controls={`${name}-menu`} onClick={() => setActiveMenu((current) => current === name ? null : name)}>
              {name[0].toUpperCase() + name.slice(1)} <CaretDown weight="bold" />
            </button>
            {activeMenu === name ? <div className={styles.dropdownPanel} id={`${name}-menu`}>
              {menus[name].map((item) => <Link href={item.href} key={item.href} onClick={closePanels}>{item.label}</Link>)}
            </div> : null}
          </div>
        ))}
      </nav>
      <div className={styles.actions}>
        <button type="button" aria-label="Search" aria-expanded={searchOpen} onClick={() => { setSearchOpen((open) => !open); setActiveMenu(null); }}>{searchOpen ? <X weight="bold" /> : <MagnifyingGlass weight="bold" />}</button>
        <button className={styles.menu} type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen((open) => !open); setSearchOpen(false); }}>{menuOpen ? <X weight="bold" /> : <List weight="bold" />}</button>
      </div>
      {searchOpen && <div className={styles.searchPanel}><label><MagnifyingGlass /><input autoFocus type="search" placeholder="Search calculators" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div>{matches.map((tool) => <Link href={`/${tool.slug}`} key={tool.slug} onClick={() => setSearchOpen(false)}><strong>{tool.shortTitle}</strong><span>{tool.description}</span></Link>)}</div></div>}
      {menuOpen && <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <Link href="/calculators" onClick={closePanels}>All calculators</Link>
        <Link href="/calculator" onClick={closePanels}>Calculator</Link>
        <Link href="/scientific-calculator" onClick={closePanels}>Scientific</Link>
        <Link href="/unit-converter" onClick={closePanels}>Unit converter</Link>
        <Link href="/currency-converter" onClick={closePanels}>Currency</Link>
        <Link href="/blog" onClick={closePanels}>Guides</Link>
      </nav>}
    </header>
  );
}
