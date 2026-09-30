import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireLaunchKitUser } from "@/modules/launch-kit/access";
import { getModule } from "@/modules/launch-kit/curriculum";

type Params = Promise<{ module: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { module: slug } = await params;
  const found = getModule(slug);
  return { title: found?.title ?? "Module", robots: { index: false } };
}

export default async function AcademyModuleRedirect({ params }: { params: Params }) {
  await requireLaunchKitUser();
  const { module: slug } = await params;
  const found = getModule(slug);
  if (!found) notFound();
  const { redirect } = await import("next/navigation");
  redirect(`/academy/${found.slug}/${found.lessons[0].slug}`);
}
