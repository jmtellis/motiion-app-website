import { notFound } from "next/navigation";
import { ProfileSetupWizard } from "@/components/talent/ProfileSetupWizard";
import { deferredStepsOrdered } from "@/lib/talent/profile-setup";
export default async function Preview({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { step } = await searchParams;
  return <ProfileSetupWizard initialStep={deferredStepsOrdered.find(item => item === step)} agencies={[]} initialProfile={{ userId: "local-ui-preview", firstName: "Alex", lastName: "Rivera", displayName: "Alex Rivera", talentTypes: ["dancer"], headshotUrls: ["/marketing/creative-headshots/19.jpg", "/marketing/creative-headshots/20.jpg", "/marketing/creative-headshots/21.jpg"], headshotOriginalUrls: [], workingLocations: [] }} />;
}
