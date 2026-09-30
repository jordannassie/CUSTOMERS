import type { Metadata } from "next";
import Link from "next/link";
import { requireLaunchKitUser } from "@/modules/launch-kit/access";
import { getCompletedLessonIds, getAgencyProgramAccess } from "@/modules/launch-kit/dal";
import {
  firstIncompleteLessonPath,
  MODULES,
  moduleCompletion,
  allLessons,
} from "@/modules/launch-kit/curriculum";
import AcademyHeader from "@/components/launch-kit/AcademyHeader";
import StripeCheckoutButton from "@/components/launch-kit/StripeCheckoutButton";

export const metadata: Metadata = {
  title: "Academy",
  robots: { index: false },
};

export default async function AcademyPage() {
  const { user } = await requireLaunchKitUser();
  const completed = new Set(await getCompletedLessonIds(user.id));
  const program = await getAgencyProgramAccess(user.id);
  const total = allLessons().length;
  const done = allLessons().filter((lesson) => completed.has(lesson.id)).length;
  const continueHref = firstIncompleteLessonPath(completed);
  const modulesDone = MODULES.filter((module) => moduleCompletion(module, completed).complete).length;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <AcademyHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10">
        <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[#2563EB]">
          Customers.Direct Academy
        </p>
        <h1 className="mt-2 text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
          Build your AI business
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B67]">
          {modulesDone} of 6 steps complete · {done} of {total} lessons
        </p>
        <Link
          href={continueHref}
          className="mt-6 inline-flex bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold px-5 py-2.5 rounded-[4px]"
        >
          Continue
        </Link>

        <div className="mt-10 grid md:grid-cols-2 gap-4">
          {MODULES.map((module) => {
            const stats = moduleCompletion(module, completed);
            const first = module.lessons[0];
            return (
              <div key={module.id} className="border border-[#E5E5E1] bg-white rounded-[4px] p-6">
                <p className="text-[12px] text-[#6B6B67]">Module {module.number}</p>
                <h2 className="mt-1 text-[18px] font-semibold text-[#171717]">{module.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-[#6B6B67]">{module.description}</p>
                <p className="mt-3 text-[13px] text-[#737370]">
                  {module.lessons.length} lessons · about {module.estimatedMinutes} min ·{" "}
                  {stats.complete ? "Complete" : `${stats.done} of ${stats.total} done`}
                </p>
                {module.isActivationModule && !program.active ? (
                  <div className="mt-4">
                    <StripeCheckoutButton
                      endpoint="/api/stripe/agency-program"
                      label="Activate my agency: $199/month"
                      className="inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold px-4 py-2 rounded-[4px]"
                    />
                    <Link
                      href={`/academy/${module.slug}/${first.slug}`}
                      className="mt-3 block text-[13px] text-[#2563EB]"
                    >
                      Read this module first
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/academy/${module.slug}/${first.slug}`}
                    className="mt-4 inline-flex text-[13px] font-semibold text-[#2563EB]"
                  >
                    {stats.complete ? "Review module" : "Open module"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
