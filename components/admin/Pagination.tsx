import Link from "next/link";

export function Pagination({ page, pageCount, path, query = "" }: { page: number; pageCount: number; path: string; query?: string }) {
  if (pageCount <= 1) return null;
  const href = (next: number) => `${path}?page=${next}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  return <nav aria-label="Pagination"><Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}>Previous</Link><span>Page {page} of {pageCount}</span><Link aria-disabled={page >= pageCount} href={href(Math.min(pageCount, page + 1))}>Next</Link></nav>;
}
