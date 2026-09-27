import type { ReactNode } from "react";

export interface DataTableColumn<Row> { key: string; label: string; render(row: Row): ReactNode }

export function DataTable<Row extends { id: string }>({ rows, columns, emptyMessage }: { rows: Row[]; columns: DataTableColumn<Row>[]; emptyMessage: string }) {
  if (!rows.length) return <div role="status">{emptyMessage}</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
