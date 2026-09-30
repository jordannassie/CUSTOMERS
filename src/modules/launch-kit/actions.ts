"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allLessons, MODULES, nextLessonPath } from "./curriculum";
import { markLessonCompleteSchema } from "./schema";
import { getLaunchKitAccess, markLessonComplete } from "./dal";

export async function completeAcademyLesson(formData: FormData): Promise<void> {
  const parsed = markLessonCompleteSchema.safeParse({
    lessonId: formData.get("lessonId"),
  });
  if (!parsed.success) return;

  const lessonId = parsed.data.lessonId;
  const known = allLessons().some((lesson) => lesson.id === lessonId);
  if (!known) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/academy");

  const access = await getLaunchKitAccess({ userId: user.id, email: user.email });
  if (!access.launchKitPurchased) redirect("/start-ai-business");

  await markLessonComplete(user.id, lessonId);
  revalidatePath("/academy");

  const academyModule = MODULES.find((item) => item.lessons.some((lesson) => lesson.id === lessonId));
  const lesson = academyModule?.lessons.find((item) => item.id === lessonId);
  if (academyModule && lesson) {
    redirect(nextLessonPath(academyModule.slug, lesson.slug) ?? "/academy");
  }
  redirect("/academy");
}
