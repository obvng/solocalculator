import Link from "next/link";

export function PostActions({ id, slug, published }: { id: string; slug: string; published: boolean }) {
  return <span><Link href={`/admin/posts/${id}`}>Edit</Link>{published ? <> · <Link href={`/blog/${slug}`}>View</Link></> : null}</span>;
}
