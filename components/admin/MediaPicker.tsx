import type { MediaRecord } from "@/lib/content/types";
import { MediaLibrary } from "./MediaLibrary";
export function MediaPicker({ items }: { items: MediaRecord[] }) { return <MediaLibrary initialItems={items} picker />; }
