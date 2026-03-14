import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type LegacyAdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyAdminPage({ searchParams }: LegacyAdminPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    }
  }

  redirect(query.size ? `/app/admin?${query.toString()}` : "/app/admin");
}
