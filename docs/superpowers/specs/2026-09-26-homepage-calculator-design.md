# SoloCalculator homepage and calculator design

The supplied desktop and mobile mockup is the visual source of truth. This slice reproduces its header, hero copy, normal calculator, expandable scientific controls, popular calculator cards, and quick tools.

The build uses Next.js App Router, TypeScript, CSS Modules, and a reducer-style calculator engine. Pointer and keyboard input share one command path. The engine owns arithmetic, memory, percentage semantics, repeated equals, scientific functions, formatting, and recoverable errors.

Desktop uses a contained two-column hero with the calculator on the right. Mobile keeps the headline, supporting line, and calculator above the fold, then shows a compact 3-by-2 tool grid and stacked quick tools. Decorative shapes are CSS or SVG, sit behind content, and reduce on small screens.

The palette uses deep navy, cobalt blue, coral, yellow, mint, lilac, warm white, and pale sky. Controls use thin blue outlines, soft shadows, and large rounded hit areas. Nunito Sans provides the rounded typography and tabular calculator figures.

Tests cover arithmetic, contextual percentages, memory, repeated equals, scientific operations, errors, recovery, and formatting. Verification includes tests, lint, production build, and screenshots at desktop and mobile widths.

## Phase two

The main calculator adds a compact expression line above the result so every digit, operator, decimal, sign change, percentage, and scientific action remains visible during entry. Dedicated routes share the approved header, palette, tactile form controls, worked examples, related links, and unique metadata.

Pure TypeScript functions handle age, percentages, loans, date arithmetic, unit conversion, tips, and birthday countdowns. Currency conversion uses Frankfurter v2 through a server route so browser code does not depend on third-party CORS behaviour. Search and mobile navigation expose all tools without adding a separate search backend.
