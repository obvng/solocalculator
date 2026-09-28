export type Operator = "+" | "−" | "×" | "÷" | "^";
export type MemoryCommand = "MC" | "MR" | "M+" | "M-";
export type ScientificCommand =
  | "sin"
  | "cos"
  | "tan"
  | "asin"
  | "acos"
  | "atan"
  | "log"
  | "ln"
  | "sqrt"
  | "square"
  | "pi"
  | "e";

export type CalculatorAction =
  | { type: "digit"; value: string }
  | { type: "decimal" }
  | { type: "operator"; value: Operator }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "toggle-sign" }
  | { type: "percent" }
  | { type: "memory"; value: MemoryCommand }
  | { type: "scientific"; value: ScientificCommand }
  | { type: "toggle-angle" };

export interface CalculatorState {
  display: string;
  expression: string;
  accumulator: number | null;
  pendingOperator: Operator | null;
  waitingForOperand: boolean;
  lastOperator: Operator | null;
  lastOperand: number | null;
  memory: number;
  angleMode: "deg" | "rad";
  error: boolean;
}

export const initialCalculatorState: CalculatorState = {
  display: "0",
  expression: "",
  accumulator: null,
  pendingOperator: null,
  waitingForOperand: true,
  lastOperator: null,
  lastOperand: null,
  memory: 0,
  angleMode: "deg",
  error: false,
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  const clean = Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(12));
  const text = String(clean);
  if (text.length <= 14) return text;
  return clean.toExponential(8).replace(/\.0+e/, "e").replace(/(\.\d*?)0+e/, "$1e");
}

function valueOf(state: CalculatorState): number {
  return Number(state.display.replace(/,/g, ""));
}

function failed(state: CalculatorState): CalculatorState {
  return { ...state, display: "Error", error: true, waitingForOperand: true };
}

function calculate(left: number, right: number, operator: Operator): number {
  switch (operator) {
    case "+": return left + right;
    case "−": return left - right;
    case "×": return left * right;
    case "÷": return right === 0 ? Number.NaN : left / right;
    case "^": return left ** right;
  }
}

function applyScientific(value: number, command: ScientificCommand, angleMode: "deg" | "rad"): number {
  const radians = angleMode === "deg" ? (value * Math.PI) / 180 : value;
  switch (command) {
    case "sin": return Math.sin(radians);
    case "cos": return Math.cos(radians);
    case "tan": return Math.tan(radians);
    case "asin": return angleMode === "deg" ? (Math.asin(value) * 180) / Math.PI : Math.asin(value);
    case "acos": return angleMode === "deg" ? (Math.acos(value) * 180) / Math.PI : Math.acos(value);
    case "atan": return angleMode === "deg" ? (Math.atan(value) * 180) / Math.PI : Math.atan(value);
    case "log": return Math.log10(value);
    case "ln": return Math.log(value);
    case "sqrt": return Math.sqrt(value);
    case "square": return value ** 2;
    case "pi": return Math.PI;
    case "e": return Math.E;
  }
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (state.error && action.type !== "clear" && action.type !== "digit") return state;

  switch (action.type) {
    case "digit": {
      const next = state.error || state.waitingForOperand || state.display === "0"
        ? action.value
        : `${state.display}${action.value}`;
      const beginsFresh = state.error || (state.waitingForOperand && !state.pendingOperator && state.lastOperator !== null);
      const expression = beginsFresh
        ? action.value
        : state.waitingForOperand
          ? state.expression ? `${state.expression} ${action.value}` : action.value
          : `${state.expression}${action.value}`;
      return { ...state, display: next.slice(0, 15), expression, waitingForOperand: false, error: false };
    }
    case "decimal":
      if (state.waitingForOperand) return { ...state, display: "0.", expression: state.expression ? `${state.expression} 0.` : "0.", waitingForOperand: false };
      if (state.display.includes(".")) return state;
      return { ...state, display: `${state.display}.`, expression: `${state.expression || state.display}.` };
    case "clear":
      return { ...initialCalculatorState, display: "0", expression: "", waitingForOperand: false, memory: state.memory, angleMode: state.angleMode };
    case "toggle-sign":
      if (state.display === "0") return state;
      return { ...state, display: formatNumber(-valueOf(state)), expression: formatNumber(-valueOf(state)) };
    case "operator": {
      const input = valueOf(state);
      let accumulator = state.accumulator;
      let display = state.display;
      if (state.pendingOperator && accumulator !== null && !state.waitingForOperand) {
        const result = calculate(accumulator, input, state.pendingOperator);
        if (!Number.isFinite(result)) return failed(state);
        accumulator = result;
        display = formatNumber(result);
      } else if (accumulator === null || !state.waitingForOperand) {
        accumulator = input;
      }
      return {
        ...state,
        display,
        expression: state.waitingForOperand
          ? `${state.expression.replace(/\s[+−×÷^]$/, "")} ${action.value}`
          : `${state.expression || state.display} ${action.value}`,
        accumulator,
        pendingOperator: action.value,
        waitingForOperand: true,
        lastOperator: null,
        lastOperand: null,
      };
    }
    case "percent": {
      const input = valueOf(state);
      const value = state.accumulator !== null && (state.pendingOperator === "+" || state.pendingOperator === "−")
        ? state.accumulator * input / 100
        : input / 100;
      return { ...state, display: formatNumber(value), expression: `${state.expression || state.display}%`, waitingForOperand: false };
    }
    case "equals": {
      const operator = state.pendingOperator ?? state.lastOperator;
      const left = state.pendingOperator ? state.accumulator : valueOf(state);
      const right = state.pendingOperator ? valueOf(state) : state.lastOperand;
      if (!operator || left === null || right === null) return state;
      const result = calculate(left, right, operator);
      if (!Number.isFinite(result)) return failed(state);
      return {
        ...state,
        display: formatNumber(result),
        expression: state.pendingOperator
          ? `${state.expression || `${left} ${operator} ${right}`} =`
          : `${state.display} ${operator} ${right} =`,
        accumulator: result,
        pendingOperator: null,
        waitingForOperand: true,
        lastOperator: operator,
        lastOperand: right,
      };
    }
    case "memory": {
      const shown = valueOf(state);
      if (action.value === "MC") return { ...state, memory: 0 };
      if (action.value === "MR") return { ...state, display: formatNumber(state.memory), expression: formatNumber(state.memory), waitingForOperand: true };
      if (action.value === "M+") return { ...state, memory: state.memory + shown, waitingForOperand: true };
      return { ...state, memory: state.memory - shown, waitingForOperand: true };
    }
    case "scientific": {
      const result = applyScientific(valueOf(state), action.value, state.angleMode);
      if (!Number.isFinite(result)) return failed(state);
      return { ...state, display: formatNumber(result), expression: `${action.value}(${state.display})`, waitingForOperand: true };
    }
    case "toggle-angle":
      return { ...state, angleMode: state.angleMode === "deg" ? "rad" : "deg" };
  }
}
