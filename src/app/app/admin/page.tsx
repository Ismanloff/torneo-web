import { AdminControlCenter } from "@/components/admin-control-center";
import { getStaffCreationFlash } from "@/lib/flash-state";

type StaffAdminPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function StaffAdminPage({ searchParams }: StaffAdminPageProps) {
  const [params, staffCreation] = await Promise.all([
    searchParams,
    getStaffCreationFlash(),
  ]);

  return (
    <AdminControlCenter
      createdPin={staffCreation?.pin}
      createdStaffName={staffCreation?.staffName}
      manualLookupError={params.error}
      surfacePath="/app/admin"
    />
  );
}

export const dynamic = "force-dynamic";
