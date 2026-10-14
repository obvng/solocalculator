"use client";

import { useMemo, useState } from "react";
import {
  addBusinessDays,
  calculateDiscount,
  calculateDiscountRate,
  calculateNewValue,
  calculatePercentageChange,
  calculatePercentageOf,
  calculateTimeDuration,
  countBusinessDays,
  type WeekendDefinition,
} from "@/lib/tools/calculations";
import styles from "./tools.module.css";

const today = () => new Date().toISOString().slice(0, 10);
const numeric = (value: string) => Number(value || 0);
const neat = (value: number, maximumFractionDigits = 6) => new Intl.NumberFormat("en", { maximumFractionDigits }).format(value);
const signed = (value: number) => `${value > 0 ? "+" : ""}${neat(value)}`;
const amount = (value: number, symbol: string) => `${symbol}${neat(value, 2)}`;

function Field({ label, value, onChange, type = "number", min, max, step }: { label: string; value: string; onChange(value: string): void; type?: string; min?: string; max?: string; step?: string }) {
  return <label className={styles.field}><span>{label}</span><input type={type} value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange(value: string): void; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function Result({ label, value, detail, error }: { label: string; value?: React.ReactNode; detail?: React.ReactNode; error?: string }) {
  return <div className={styles.result} aria-live="polite"><span>{label}</span><strong>{error || value}</strong>{!error && detail ? <small>{detail}</small> : null}</div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className={styles.calculationPanel}><legend>{title}</legend>{children}</fieldset>;
}

export function PercentageIncreaseCalculator() {
  const [original, setOriginal] = useState("0");
  const [next, setNext] = useState("0");
  const [reverseOriginal, setReverseOriginal] = useState("0");
  const [change, setChange] = useState("0");
  const comparison = useMemo(() => {
    try { return { result: calculatePercentageChange(numeric(original), numeric(next)), error: "" }; }
    catch (error) { return { result: null, error: error instanceof Error ? error.message : "Check the values." }; }
  }, [original, next]);
  const newValue = calculateNewValue(numeric(reverseOriginal), numeric(change));
  const direction = comparison.result?.direction === "no-change" ? "no change" : comparison.result?.direction;
  return <div className={styles.formStack}>
    <Panel title="Percentage change">
      <div className={styles.twoCols}><Field label="Original value" value={original} onChange={setOriginal} /><Field label="New value" value={next} onChange={setNext} /></div>
      <Result label="Change" error={comparison.error} value={`${signed(comparison.result?.percentageChange ?? 0)}% ${direction}`} detail={`Absolute difference: ${signed(comparison.result?.difference ?? 0)}`} />
    </Panel>
    <Panel title="Apply a percentage change">
      <div className={styles.twoCols}><Field label="Original value to change" value={reverseOriginal} onChange={setReverseOriginal} /><Field label="Percentage change" value={change} onChange={setChange} step="any" /></div>
      <Result label="New value" value={neat(newValue)} />
    </Panel>
  </div>;
}

function PercentageRow({ title, firstLabel, secondLabel, mode, suffix = "" }: { title: string; firstLabel: string; secondLabel: string; mode: "percentOf" | "whatPercent" | "baseFromPercent"; suffix?: string }) {
  const [first, setFirst] = useState("0");
  const [second, setSecond] = useState("0");
  let value = "";
  let error = "";
  try { value = `${neat(calculatePercentageOf(mode, numeric(first), numeric(second)))}${suffix}`; }
  catch (reason) { error = reason instanceof Error ? reason.message : "Check the values."; }
  return <Panel title={title}><div className={styles.twoCols}><Field label={firstLabel} value={first} onChange={setFirst} /><Field label={secondLabel} value={second} onChange={setSecond} /></div><Result label="Result" value={value} error={error} /></Panel>;
}

export function PercentageOfCalculator() {
  return <div className={styles.formStack}>
    <PercentageRow title="What is X% of Y?" firstLabel="Percentage (X)" secondLabel="Number (Y)" mode="percentOf" />
    <PercentageRow title="X is what percent of Y?" firstLabel="Value (X)" secondLabel="Total (Y)" mode="whatPercent" suffix="%" />
    <PercentageRow title="X is Y% of what number?" firstLabel="Value (X)" secondLabel="Percentage (Y)" mode="baseFromPercent" />
  </div>;
}

export function DiscountCalculator() {
  const [symbol, setSymbol] = useState("");
  const [original, setOriginal] = useState("0");
  const [discounts, setDiscounts] = useState(["0"]);
  const [reverseOriginal, setReverseOriginal] = useState("0");
  const [finalPrice, setFinalPrice] = useState("0");
  const updateDiscount = (index: number, value: string) => setDiscounts((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  let sale;
  let saleError = "";
  try { sale = calculateDiscount(numeric(original), discounts.map(numeric)); }
  catch (reason) { saleError = reason instanceof Error ? reason.message : "Check the values."; }
  let reverseRate = 0;
  let reverseError = "";
  try { reverseRate = calculateDiscountRate(numeric(reverseOriginal), numeric(finalPrice)); }
  catch (reason) { reverseError = reason instanceof Error ? reason.message : "Check the values."; }
  return <div className={styles.formStack}>
    <Panel title="Sale price and savings">
      <div className={styles.twoCols}><Field label="Currency symbol (optional)" type="text" value={symbol} onChange={(value) => setSymbol(value.slice(0, 4))} /><Field label="Original price" value={original} onChange={setOriginal} min="0" step="any" /></div>
      <div className={styles.discountRows}>{discounts.map((discount, index) => <div className={styles.discountRow} key={index}><Field label={`Discount ${index + 1} (%)`} value={discount} onChange={(value) => updateDiscount(index, value)} min="0" max="100" step="any" />{index > 0 ? <button type="button" className={styles.textButton} aria-label={`Remove discount ${index + 1}`} onClick={() => setDiscounts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button> : null}</div>)}</div>
      <button type="button" className={styles.addButton} onClick={() => setDiscounts((current) => [...current, "0"])}>Add another discount</button>
      <Result label="Final price" error={saleError} value={amount(sale?.finalPrice ?? 0, symbol)} detail={sale ? <>You save {amount(sale.amountSaved, symbol)} · True combined discount {neat(sale.combinedRate)}%</> : null} />
    </Panel>
    <Panel title="Find the discount percentage">
      <div className={styles.twoCols}><Field label="Original price for reverse calculation" value={reverseOriginal} onChange={setReverseOriginal} min="0" step="any" /><Field label="Final price" value={finalPrice} onChange={setFinalPrice} min="0" step="any" /></div>
      <Result label="Discount" error={reverseError} value={`${neat(reverseRate)}%`} />
    </Panel>
  </div>;
}

export function TimeDurationCalculator() {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("0");
  let result;
  let error = "";
  try { result = calculateTimeDuration({ startTime, endTime, startDate, endDate, breakMinutes: numeric(breakMinutes) }); }
  catch (reason) { error = reason instanceof Error ? reason.message : "Check the values."; }
  return <div className={styles.form}>
    <div className={styles.twoCols}><Field label="Start time" type="time" value={startTime} onChange={setStartTime} /><Field label="End time" type="time" value={endTime} onChange={setEndTime} /></div>
    <div className={styles.twoCols}><Field label="Start date (optional)" type="date" value={startDate} onChange={setStartDate} /><Field label="End date (optional)" type="date" value={endDate} onChange={setEndDate} /></div>
    <Field label="Unpaid break (minutes)" value={breakMinutes} onChange={setBreakMinutes} min="0" step="1" />
    <Result label="Paid duration" error={error} value={result ? `${result.hours} hr ${result.minutes} min` : ""} detail={result ? `${neat(result.decimalHours, 2)} decimal hours · ${result.paidMinutes} total minutes` : null} />
  </div>;
}

function WeekendSelect({ value, onChange }: { value: WeekendDefinition; onChange(value: WeekendDefinition): void }) {
  return <Select label="Weekend" value={value} onChange={(next) => onChange(next as WeekendDefinition)}><option value="sat-sun">Saturday and Sunday</option><option value="fri-sat">Friday and Saturday</option></Select>;
}

export function BusinessDaysCalculator() {
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [rangeWeekend, setRangeWeekend] = useState<WeekendDefinition>("sat-sun");
  const [addStart, setAddStart] = useState(today());
  const [workingDays, setWorkingDays] = useState("0");
  const [addWeekend, setAddWeekend] = useState<WeekendDefinition>("sat-sun");
  let count;
  let countError = "";
  try { count = countBusinessDays(start, end, rangeWeekend); }
  catch (reason) { countError = reason instanceof Error ? reason.message : "Check the dates."; }
  let endDate = "";
  let addError = "";
  try { endDate = addBusinessDays(addStart, numeric(workingDays), addWeekend); }
  catch (reason) { addError = reason instanceof Error ? reason.message : "Check the values."; }
  const workingLabel = count ? `${count.workingDays} working ${count.workingDays === 1 ? "day" : "days"}` : "";
  return <div className={styles.formStack}>
    <Panel title="Working days between dates">
      <div className={styles.twoCols}><Field label="Start date" type="date" value={start} onChange={setStart} /><Field label="End date" type="date" value={end} onChange={setEnd} /></div>
      <WeekendSelect value={rangeWeekend} onChange={setRangeWeekend} />
      <Result label="Working days" error={countError} value={workingLabel} detail={count ? `${count.totalDays} total days · ${count.weekendDays} weekend days` : null} />
    </Panel>
    <Panel title="Add working days">
      <div className={styles.twoCols}><Field label="Starting date" type="date" value={addStart} onChange={setAddStart} /><Field label="Working days to add" value={workingDays} onChange={setWorkingDays} min="0" step="1" /></div>
      <WeekendSelect value={addWeekend} onChange={setAddWeekend} />
      <Result label="End date" error={addError} value={endDate} />
    </Panel>
  </div>;
}
