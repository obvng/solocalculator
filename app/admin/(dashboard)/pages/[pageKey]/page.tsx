import { redirect } from "next/navigation";
import { PageSeoForm } from "@/components/admin/PageSeoForm";
import { getPageSeo } from "@/lib/content/repository";

export default async function EditPageSeo({ params, searchParams }: { params: Promise<{ pageKey: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { pageKey } = await params;
  if (pageKey === "calculator") redirect("/admin/pages/calculators");
  const status = await searchParams;
  let page;
  try { page = await getPageSeo(pageKey, undefined, { strict: true }); }
  catch { return <p role="alert">Saved page settings could not be loaded. Refresh to try again. No default values have been substituted.</p>; }
  return <><div aria-live="polite">{status.error ? <p role="alert">Changes were not saved. {status.error === "validation" ? "Check the field lengths and canonical URL, then try again." : "Please try again. If this continues, contact support."}</p> : status.saved ? <p role="status">Changes saved.</p> : null}</div><PageSeoForm key={`${page.pageKey}:${page.updatedAt}`} page={page} /></>;
}
