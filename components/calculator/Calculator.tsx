"use client";

import { useEffect, useReducer, useState } from "react";
import {
  calculatorReducer,
  initialCalculatorState,
  type CalculatorAction,
  type MemoryCommand,
  type Operator,
  type ScientificCommand,
} from "@/lib/calculator/engine";
import styles from "./Calculator.module.css";

const digitRows = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

const operatorNames: Record<Operator, string> = {
  "+": "Add",
  "−": "Subtract",
  "×": "Multiply",
  "÷": "Divide",
  "^": "Power",
};

const scientificKeys: Array<{ label: string; name: string; value: ScientificCommand | "^" }> = [
  { label: "sin", name: "Sine", value: "sin" },
  { label: "cos", name: "Cosine", value: "cos" },
  { label: "tan", name: "Tangent", value: "tan" },
  { label: "sin⁻¹", name: "Inverse sine", value: "asin" },
  { label: "cos⁻¹", name: "Inverse cosine", value: "acos" },
  { label: "tan⁻¹", name: "Inverse tangent", value: "atan" },
  { label: "log", name: "Log base ten", value: "log" },
  { label: "ln", name: "Natural logarithm", value: "ln" },
  { label: "√", name: "Square root", value: "sqrt" },
  { label: "x²", name: "Square", value: "square" },
  { label: "xʸ", name: "Power", value: "^" },
  { label: "π", name: "Pi", value: "pi" },
  { label: "e", name: "Euler number", value: "e" },
];

export function Calculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);
  const [scientific, setScientific] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      let action: CalculatorAction | null = null;
      if (/^\d$/.test(event.key)) action = { type: "digit", value: event.key };
      else if (event.key === ".") action = { type: "decimal" };
      else if (event.key === "+") action = { type: "operator", value: "+" };
      else if (event.key === "-") action = { type: "operator", value: "−" };
      else if (event.key === "*") action = { type: "operator", value: "×" };
      else if (event.key === "/") action = { type: "operator", value: "÷" };
      else if (event.key === "%") action = { type: "percent" };
      else if (event.key === "Enter" || event.key === "=") action = { type: "equals" };
      else if (event.key === "Escape" || event.key === "Backspace") action = { type: "clear" };
      if (action) {
        event.preventDefault();
        dispatch(action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const memory = (value: MemoryCommand) => dispatch({ type: "memory", value });
  const operator = (value: Operator) => dispatch({ type: "operator", value });

  return (
    <section className={`${styles.shell} ${scientific ? styles.expanded : ""}`} aria-label="Calculator">
      <div className={styles.display} role="status" aria-live="polite">
        <span className={styles.expression}>{state.expression || "Ready"}</span>
        <span className={styles.result}>{state.display}</span>
      </div>

      <div className={styles.controlBar}>
        <label className={styles.modeToggle}>
          <input
            type="checkbox"
            role="switch"
            aria-label="Scientific"
            checked={scientific}
            onChange={(event) => setScientific(event.target.checked)}
          />
          <span aria-hidden="true" className={styles.track}><span /></span>
          <span>Scientific</span>
        </label>
        <div className={styles.memoryRow}>
          {(["MC", "MR", "M+", "M-"] as MemoryCommand[]).map((value) => (
            <button key={value} type="button" onClick={() => memory(value)}>{value}</button>
          ))}
        </div>
      </div>

      <div className={styles.keypad}>
        {digitRows.flatMap((row, rowIndex) => [
          ...row.map((digit) => (
            <button key={digit} className={styles.numberKey} type="button" onClick={() => dispatch({ type: "digit", value: digit })}>{digit}</button>
          )),
          <button key={`op-${rowIndex}`} className={styles.operatorKey} type="button" aria-label={operatorNames[(["÷", "×", "−"] as Operator[])[rowIndex]]} onClick={() => operator(((["÷", "×", "−"] as Operator[])[rowIndex]))}>
            {(["÷", "×", "−"] as Operator[])[rowIndex]}
          </button>,
          rowIndex === 0 ? (
            <button key="clear" className={styles.clearKey} type="button" aria-label="Clear" onClick={() => dispatch({ type: "clear" })}>C</button>
          ) : rowIndex === 1 ? (
            <button key="sign" className={styles.numberKey} type="button" aria-label="Toggle positive or negative" onClick={() => dispatch({ type: "toggle-sign" })}>±</button>
          ) : (
            <button key="percent" className={styles.numberKey} type="button" aria-label="Percent" onClick={() => dispatch({ type: "percent" })}>%</button>
          ),
        ])}
        <button className={`${styles.numberKey} ${styles.zeroKey}`} type="button" onClick={() => dispatch({ type: "digit", value: "0" })}>0</button>
        <button className={styles.numberKey} type="button" aria-label="Decimal" onClick={() => dispatch({ type: "decimal" })}>.</button>
        <button className={styles.operatorKey} type="button" aria-label="Add" onClick={() => operator("+")}>+</button>
        <button className={styles.equalsKey} type="button" aria-label="Equals" onClick={() => dispatch({ type: "equals" })}>=</button>
      </div>

      <div className={styles.scientificPanel} aria-hidden={!scientific}>
        <button type="button" aria-label="Angle mode" onClick={() => dispatch({ type: "toggle-angle" })}>{state.angleMode.toUpperCase()}</button>
        {scientificKeys.map((key) => (
          <button
            key={key.name}
            type="button"
            aria-label={key.name}
            onClick={() => key.value === "^" ? operator("^") : dispatch({ type: "scientific", value: key.value })}
          >
            {key.label}
          </button>
        ))}
      </div>
    </section>
  );
}
