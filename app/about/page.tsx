import type { Metadata } from "next";
import { EDITORIAL_ROUTES } from "@/lib/editorial-routes";
import { EditorialWorldExperience } from "@/components/editorial/EditorialWorldExperience";

export const metadata: Metadata = {
  title: EDITORIAL_ROUTES.about.metaTitle,
  description: EDITORIAL_ROUTES.about.metaDescription,
};

export default function AboutPage() {
  return <EditorialWorldExperience routeKey="about" />;
}
