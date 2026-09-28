import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { getAdminPost } from "@/lib/admin/repository";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const post = await getAdminPost(id); if (!post) notFound();
  return <PostForm post={post} />;
}
