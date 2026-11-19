import { ChoosePlanSkeleton } from "@/components/app/PageSkeletons";

// Its own boundary: without one, the app layout's session read blocked the navigation (Next.js cache components).
export default function NewBusinessPlanLoading() {
  return <ChoosePlanSkeleton />;
}
