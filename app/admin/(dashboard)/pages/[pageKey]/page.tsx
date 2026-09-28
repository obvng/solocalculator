import { PageSeoForm } from "@/components/admin/PageSeoForm"; import { getPageSeo } from "@/lib/content/repository";
export default async function EditPageSeo({ params }: { params: Promise<{ pageKey: string }> }) { const { pageKey } = await params; return <PageSeoForm page={await getPageSeo(pageKey)} />; }
