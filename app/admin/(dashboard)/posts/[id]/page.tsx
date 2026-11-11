import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { getAdminPost } from "@/lib/admin/repository";
import { trashDraftPost } from "../actions";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const post = await getAdminPost(id); if (!post) notFound();
  return <>{post.status === "archived" ? <p role="status">This article is in Trash. Use Save draft to restore it.</p> : null}<PostForm post={post} />{post.status === "draft" ? <form action={trashDraftPost.bind(null, post.id)}><p>Move this draft to Trash. Its content remains recoverable.</p><button type="submit">Move draft to Trash</button></form> : null}</>;
}
