import { Calculator } from "@phosphor-icons/react/dist/ssr";
import styles from "./BrandMark.module.css";

export function BrandMark() {
  return (
    <span className={styles.brand}>
      <span className={styles.mark}><Calculator weight="fill" aria-hidden="true" /></span>
      <span>SOLOCALCULATOR.COM</span>
    </span>
  );
}
