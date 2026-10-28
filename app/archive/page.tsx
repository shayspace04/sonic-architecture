import type { Metadata } from "next";
import { EDITORIAL_ROUTES } from "@/lib/editorial-routes";
import { EditorialWorldExperience } from "@/components/editorial/EditorialWorldExperience";

export const metadata: Metadata = {
  title: EDITORIAL_ROUTES.archive.metaTitle,
  description: EDITORIAL_ROUTES.archive.metaDescription,
};

export default function ArchivePage() {
  return <EditorialWorldExperience routeKey="archive" />;
}
