import { createPost } from "../actions";

export default async function NewPostPage() { await createPost(); return null; }
