import { AdminControlCenter } from "@/components/admin-control-center";

type StaffAdminPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function StaffAdminPage({ searchParams }: StaffAdminPageProps) {
  const params = await searchParams;

  return <AdminControlCenter manualLookupError={params.error} surfacePath="/app/admin" />;
}

export const dynamic = "force-dynamic";
