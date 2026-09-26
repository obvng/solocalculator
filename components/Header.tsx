"use client";

import { useState } from "react";
import { CaretDown, List, MagnifyingGlass, X } from "@phosphor-icons/react";
import Link from "next/link";
import { tools } from "@/lib/tools/catalog";
import { BrandMark } from "./BrandMark";
import styles from "./Header.module.css";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = tools.filter((tool) => `${tool.title} ${tool.description}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  return (
    <header className={styles.header}>
      <Link href="/" aria-label="SoloCalculator home"><BrandMark /></Link>
      <nav aria-label="Main navigation">
        <Link href="/calculator">Calculators <CaretDown weight="bold" /></Link>
        <Link href="/unit-converter">Convert <CaretDown weight="bold" /></Link>
        <Link href="/calculator#how-to-use">Learn <CaretDown weight="bold" /></Link>
      </nav>
      <div className={styles.actions}>
        <button type="button" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}>{searchOpen ? <X weight="bold" /> : <MagnifyingGlass weight="bold" />}</button>
        <button className={styles.menu} type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X weight="bold" /> : <List weight="bold" />}</button>
      </div>
      {searchOpen && <div className={styles.searchPanel}><label><MagnifyingGlass /><input autoFocus type="search" placeholder="Search calculators" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div>{matches.map((tool) => <Link href={`/${tool.slug}`} key={tool.slug} onClick={() => setSearchOpen(false)}><strong>{tool.shortTitle}</strong><span>{tool.description}</span></Link>)}</div></div>}
      {menuOpen && <nav className={styles.mobileNav} aria-label="Mobile navigation"><Link href="/calculator">Calculator</Link><Link href="/scientific-calculator">Scientific</Link><Link href="/unit-converter">Convert</Link><Link href="/age-calculator">Age</Link><Link href="/percentage-calculator">Percentage</Link><Link href="/loan-calculator">Loan</Link></nav>}
    </header>
  );
}
