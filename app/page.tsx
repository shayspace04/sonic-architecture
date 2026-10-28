import type { Metadata } from "next";
import { EDITORIAL_ROUTES } from "@/lib/editorial-routes";
import { EditorialWorldExperience } from "@/components/editorial/EditorialWorldExperience";

export const metadata: Metadata = {
  title: EDITORIAL_ROUTES.home.metaTitle,
  description: EDITORIAL_ROUTES.home.metaDescription,
};

export default function HomePage() {
  return <EditorialWorldExperience routeKey="home" />;
}
