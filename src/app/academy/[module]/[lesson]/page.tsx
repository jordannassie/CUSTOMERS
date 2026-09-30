import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { requireLaunchKitUser } from "@/modules/launch-kit/access";
import { getCompletedLessonIds } from "@/modules/launch-kit/dal";
import { getLesson, nextLessonPath } from "@/modules/launch-kit/curriculum";
import AcademyHeader from "@/components/launch-kit/AcademyHeader";
import MarkCompleteForm from "@/components/launch-kit/MarkCompleteForm";
import StripeCheckoutButton from "@/components/launch-kit/StripeCheckoutButton";

type Params = Promise<{ module: string; lesson: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { module: moduleSlug, lesson: lessonSlug } = await params;
  const found = getLesson(moduleSlug, lessonSlug);
  return { title: found?.lesson.title ?? "Lesson", robots: { index: false } };
}

export default async function AcademyLessonPage({ params }: { params: Params }) {
  const { user } = await requireLaunchKitUser();
  const { module: moduleSlug, lesson: lessonSlug } = await params;
  const found = getLesson(moduleSlug, lessonSlug);
  if (!found) notFound();

  const completed = new Set(await getCompletedLessonIds(user.id));
  const { module: academyModule, lesson } = found;
  const isDone = completed.has(lesson.id);
  const next = nextLessonPath(academyModule.slug, lesson.slug);
  const videoSrc = lesson.videoFile ? `/academy/videos/${lesson.videoFile}` : null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <AcademyHeader />
      <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-10">
        <p className="text-[12px] text-[#6B6B67]">
          Module {academyModule.number} · {academyModule.title}
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[#171717]">
          {lesson.title}
        </h1>
        <p className="mt-2 text-[13px] text-[#737370]">About {lesson.estimatedMinutes} min</p>

        <div className="mt-6 aspect-video border border-[#E5E5E1] rounded-[4px] bg-[#171717] flex items-center justify-center overflow-hidden">
          {videoSrc ? (
            <video className="w-full h-full" controls src={videoSrc} />
          ) : (
            <div className="text-center px-6">
              <Play className="mx-auto text-white/70" />
              <p className="mt-3 text-[14px] text-white">Video coming soon</p>
              <p className="mt-1 text-[12px] text-white/60">
                Add the file at public/academy/videos/{lesson.id}.mp4
              </p>
            </div>
          )}
        </div>

        <section className="mt-8">
          <h2 className="text-[16px] font-semibold text-[#171717]">Summary</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#6B6B67]">{lesson.summary}</p>
        </section>

        <section className="mt-6 border border-[#E5E5E1] rounded-[4px] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#171717]">Action step</h2>
          <p className="mt-2 text-[14px] leading-6 text-[#6B6B67]">{lesson.actionStep}</p>
        </section>

        <section className="mt-6 border border-[#E5E5E1] rounded-[4px] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#171717]">Resource</h2>
          <p className="mt-2 text-[14px] text-[#6B6B67]">{lesson.resourceLabel}</p>
        </section>

        {academyModule.isActivationModule && lesson.id === "activate-agency" ? (
          <div className="mt-6">
            <StripeCheckoutButton
              endpoint="/api/stripe/agency-program"
              label="Activate my agency: $199/month"
            />
            <Link href="/agency/activate" className="mt-3 block text-[13px] text-[#2563EB]">
              Compare the kit and the software
            </Link>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <MarkCompleteForm
            lessonId={lesson.id}
            moduleSlug={academyModule.slug}
            lessonSlug={lesson.slug}
            complete={isDone}
          />
          {next && isDone ? null : next ? (
            <Link href={next} className="text-[13px] text-[#6B6B67]">
              Skip to next lesson
            </Link>
          ) : null}
        </div>

        <nav className="mt-10 flex flex-col gap-2">
          {academyModule.lessons.map((item) => (
            <Link
              key={item.id}
              href={`/academy/${academyModule.slug}/${item.slug}`}
              className={`text-[13px] ${
                item.id === lesson.id ? "text-[#2563EB] font-semibold" : "text-[#6B6B67]"
              }`}
            >
              {completed.has(item.id) ? "Done · " : ""}
              {item.title}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
