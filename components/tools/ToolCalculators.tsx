"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator } from "@/components/calculator/Calculator";
import {
  addToDate,
  calculateAge,
  calculateLoan,
  calculatePercentage,
  calculateTip,
  convertUnit,
  daysBetween,
  daysUntilBirthday,
  unitOptions,
  type PercentageMode,
  type UnitCategory,
} from "@/lib/tools/calculations";
import type { ToolKind } from "@/lib/tools/catalog";
import styles from "./tools.module.css";

const today = () => new Date().toISOString().slice(0, 10);
const number = (value: string) => Number(value || 0);
const neat = (value: number, maximumFractionDigits = 6) => new Intl.NumberFormat("en", { maximumFractionDigits }).format(value);
const money = (value: number, currency = "USD") => new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

function Field({ label, value, onChange, type = "number", min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string }) {
  return <label className={styles.field}><span>{label}</span><input type={type} value={value} min={min} step={step} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function Result({ label, children, detail }: { label: string; children: React.ReactNode; detail?: React.ReactNode }) {
  return <div className={styles.result} aria-live="polite"><span>{label}</span><strong>{children}</strong>{detail && <small>{detail}</small>}</div>;
}

function AgeCalculator() {
  const [birth, setBirth] = useState("2000-01-15");
  const [on, setOn] = useState(today());
  const result = useMemo(() => { try { return calculateAge(birth, on); } catch { return null; } }, [birth, on]);
  return <div className={styles.form}><div className={styles.twoCols}><Field label="Date of birth" type="date" value={birth} onChange={setBirth} /><Field label="Age on" type="date" value={on} onChange={setOn} /></div><Result label="Exact age">{result ? `${result.years} years, ${result.months} months, ${result.days} days` : "Check the dates"}</Result></div>;
}

function PercentageCalculator() {
  const [mode, setMode] = useState<PercentageMode>("percentOf");
  const [first, setFirst] = useState("20");
  const [second, setSecond] = useState("150");
  const result = useMemo(() => { try { return calculatePercentage(mode, number(first), number(second)); } catch { return null; } }, [mode, first, second]);
  const labels = mode === "percentOf" ? ["Percentage", "Number"] : mode === "whatPercent" ? ["First number", "Second number"] : ["Starting value", "New value"];
  return <div className={styles.form}><Select label="Calculation" value={mode} onChange={(value) => setMode(value as PercentageMode)}><option value="percentOf">What is X% of Y?</option><option value="whatPercent">X is what percent of Y?</option><option value="change">Percentage change</option></Select><div className={styles.twoCols}><Field label={labels[0]} value={first} onChange={setFirst} /><Field label={labels[1]} value={second} onChange={setSecond} /></div><Result label="Result">{result === null ? "Check the values" : `${neat(result)}${mode === "percentOf" ? "" : "%"}`}</Result></div>;
}

function LoanCalculator() {
  const [principal, setPrincipal] = useState("200000");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("30");
  const result = useMemo(() => { try { return calculateLoan(number(principal), number(rate), number(years)); } catch { return null; } }, [principal, rate, years]);
  return <div className={styles.form}><Field label="Loan amount" value={principal} onChange={setPrincipal} min="1" /><div className={styles.twoCols}><Field label="Annual interest (%)" value={rate} onChange={setRate} min="0" step="0.1" /><Field label="Term (years)" value={years} onChange={setYears} min="1" /></div><Result label="Estimated monthly payment">{result ? money(result.monthlyPayment) : "Check the values"}{result && <span className={styles.resultGrid}><span>Total paid <b>{money(result.totalPayment)}</b></span><span>Total interest <b>{money(result.totalInterest)}</b></span></span>}</Result></div>;
}

function DateCalculator() {
  const [mode, setMode] = useState("add");
  const [first, setFirst] = useState(today());
  const [second, setSecond] = useState(today());
  const [offset, setOffset] = useState("10");
  const result = mode === "add" ? addToDate(first, number(offset)) : `${Math.abs(daysBetween(first, second))} days`;
  return <div className={styles.form}><Select label="Calculation" value={mode} onChange={setMode}><option value="add">Add or subtract days</option><option value="between">Days between dates</option></Select><div className={styles.twoCols}><Field label="Starting date" type="date" value={first} onChange={setFirst} />{mode === "add" ? <Field label="Days (use a negative number to subtract)" value={offset} onChange={setOffset} /> : <Field label="Ending date" type="date" value={second} onChange={setSecond} />}</div><Result label="Result">{result}</Result></div>;
}

function UnitConverter() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [value, setValue] = useState("1");
  const options = unitOptions[category];
  const [from, setFrom] = useState(options[0]);
  const [to, setTo] = useState(options[1]);
  const changeCategory = (value: string) => { const nextCategory = value as UnitCategory; const next = unitOptions[nextCategory]; setCategory(nextCategory); setFrom(next[0]); setTo(next[1]); };
  const result = convertUnit(category, number(value), from, to);
  return <div className={styles.form}><Select label="Category" value={category} onChange={changeCategory}><option value="length">Length</option><option value="weight">Weight</option><option value="volume">Volume</option><option value="temperature">Temperature</option></Select><Field label="Value" value={value} onChange={setValue} /><div className={styles.twoCols}><Select label="From" value={from} onChange={setFrom}>{options.map((item) => <option key={item}>{item}</option>)}</Select><Select label="To" value={to} onChange={setTo}>{options.map((item) => <option key={item}>{item}</option>)}</Select></div><Result label="Converted value">{neat(result)} {to}</Result></div>;
}

const currencies = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD", "JPY", "CNY", "INR"];
function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("NGN");
  const pair = `${from}-${to}`;
  const [rateState, setRateState] = useState<{ pair: string; data: { rate: number; date: string } | null; error: string }>({ pair: "", data: null, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/rate?from=${from}&to=${to}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Rate unavailable")))
      .then((data) => setRateState({ pair: `${from}-${to}`, data, error: "" }))
      .catch((reason) => { if (reason.name !== "AbortError") setRateState({ pair: `${from}-${to}`, data: null, error: "The latest rate could not be loaded. Try again shortly." }); });
    return () => controller.abort();
  }, [from, to]);
  const loading = rateState.pair !== pair;
  const { data, error } = rateState;
  const options = currencies.map((currency) => <option key={currency}>{currency}</option>);
  return <div className={styles.form}><Field label="Amount" value={amount} onChange={setAmount} min="0" /><div className={styles.twoCols}><Select label="From" value={from} onChange={setFrom}>{options}</Select><Select label="To" value={to} onChange={setTo}>{options}</Select></div><Result label="Converted amount">{loading ? "Loading rate…" : error || !data ? error : money(number(amount) * data.rate, to)}{data && !loading && !error && <span>1 {from} = {neat(data.rate)} {to} · Rate date {data.date}</span>}</Result></div>;
}

function TipCalculator() {
  const [bill, setBill] = useState("100");
  const [tip, setTip] = useState("20");
  const [people, setPeople] = useState("4");
  const result = useMemo(() => { try { return calculateTip(number(bill), number(tip), number(people)); } catch { return null; } }, [bill, tip, people]);
  return <div className={styles.form}><Field label="Bill amount" value={bill} onChange={setBill} min="0" /><div className={styles.twoCols}><Field label="Tip (%)" value={tip} onChange={setTip} min="0" /><Field label="People" value={people} onChange={setPeople} min="1" /></div><Result label="Each person pays">{result ? money(result.perPerson) : "Check the values"}{result && <span>Tip {money(result.tip)} · Total {money(result.total)}</span>}</Result></div>;
}

function BirthdayCalculator() {
  const [birth, setBirth] = useState("1990-10-01");
  const result = daysUntilBirthday(birth, today());
  return <div className={styles.form}><Field label="Date of birth" type="date" value={birth} onChange={setBirth} /><Result label="Countdown">{result.days === 0 ? "Happy birthday!" : `${result.days} days`}{result.days > 0 && <span>Next birthday: {new Date(`${result.nextBirthday}T00:00:00`).toLocaleDateString("en", { dateStyle: "long" })}</span>}</Result></div>;
}

export function ToolCalculator({ kind }: { kind: ToolKind }) {
  if (kind === "calculator" || kind === "scientific") return <div className={styles.calculatorFrame}><Calculator /></div>;
  if (kind === "age") return <AgeCalculator />;
  if (kind === "percentage") return <PercentageCalculator />;
  if (kind === "loan") return <LoanCalculator />;
  if (kind === "date") return <DateCalculator />;
  if (kind === "unit") return <UnitConverter />;
  if (kind === "currency") return <CurrencyConverter />;
  if (kind === "tip") return <TipCalculator />;
  return <BirthdayCalculator />;
}
