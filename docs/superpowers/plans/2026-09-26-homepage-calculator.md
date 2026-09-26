# SoloCalculator Homepage and Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved responsive homepage and a working normal/scientific calculator.

**Architecture:** A server-rendered homepage composes focused presentation sections around one client calculator. A pure reducer-style TypeScript engine owns calculator behaviour and is tested separately from the interface.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-26-homepage-calculator-design.md`

## Global constraints

- Treat `SOLOCALCULATOR-HOMEPAGE-MOCKUP.png` as the visual source of truth.
- Keep the calculator above the fold on mobile with no horizontal scrolling.
- Normal and scientific input must share the same tested engine.
- Preserve the approved copy and palette.

### Task 1: Calculator engine

**Files:**
- Create: `lib/calculator/engine.ts`
- Test: `lib/calculator/engine.test.ts`

**Interfaces:**
- Produces: `initialCalculatorState`, `calculatorReducer(state, action)`, and display formatting helpers.

- [ ] Write failing tests for digit entry, arithmetic, contextual percentage, repeated equals, sign, memory, scientific functions, and errors.
- [ ] Run the engine tests and confirm they fail because the engine does not exist.
- [ ] Implement the smallest reducer that passes those behaviours.
- [ ] Run the engine tests and confirm they pass.

### Task 2: Responsive calculator interface

**Files:**
- Create: `components/calculator/Calculator.tsx`
- Create: `components/calculator/Calculator.module.css`
- Test: `components/calculator/Calculator.test.tsx`

**Interfaces:**
- Consumes: `calculatorReducer` and `initialCalculatorState`.
- Produces: a keyboard-accessible normal calculator with expandable scientific controls.

- [ ] Write failing interaction tests for buttons, keyboard input, scientific expansion, and error recovery.
- [ ] Run the component tests and confirm the expected failure.
- [ ] Build the interface and keyboard command mapping.
- [ ] Run all tests and confirm they pass.

### Task 3: Mockup-matched homepage

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `app/page.module.css`
- Create: `components/Header.tsx`
- Create: `components/BrandMark.tsx`

**Interfaces:**
- Consumes: the calculator component.
- Produces: the complete homepage at `/`.

- [ ] Add the page metadata, font, header, hero, tool cards, quick tools, and decorations.
- [ ] Implement desktop and mobile styling from the mockup.
- [ ] Run tests, lint, and the production build.
- [ ] Capture desktop and mobile screenshots and correct visible differences.
