import type { Metadata } from "next";
import { EDITORIAL_ROUTES } from "@/lib/editorial-routes";
import { EditorialWorldExperience } from "@/components/editorial/EditorialWorldExperience";

export const metadata: Metadata = {
  title: EDITORIAL_ROUTES.studio.metaTitle,
  description: EDITORIAL_ROUTES.studio.metaDescription,
};

export default function StudioPage() {
  return <EditorialWorldExperience routeKey="studio" />;
}
