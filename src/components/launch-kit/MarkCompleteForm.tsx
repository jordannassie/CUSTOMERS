import Link from "next/link";
import { completeAcademyLesson } from "@/modules/launch-kit/actions";
import { nextLessonPath } from "@/modules/launch-kit/curriculum";

export default function MarkCompleteForm({
  lessonId,
  moduleSlug,
  lessonSlug,
  complete,
}: {
  lessonId: string;
  moduleSlug: string;
  lessonSlug: string;
  complete: boolean;
}) {
  const next = nextLessonPath(moduleSlug, lessonSlug);

  if (complete) {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <p className="text-[13px] text-[#15803D] font-medium self-center">Lesson complete</p>
        {next ? (
          <Link
            href={next}
            className="inline-flex items-center justify-center bg-[#2563EB] text-white text-[14px] font-semibold px-5 py-2.5 rounded-[4px]"
          >
            Next lesson
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <form action={completeAcademyLesson}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <button
        type="submit"
        className="inline-flex items-center justify-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold px-5 py-2.5 rounded-[4px]"
      >
        Mark complete
      </button>
    </form>
  );
}
