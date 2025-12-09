import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { cookies, headers } from "next/headers";

import ProjectDashboard from "@/app/components/dashboard/ProjectDashboard";
import { authOptions } from "@/lib/auth";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;

  const response = await fetch(new URL("/api/projects", baseUrl), {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      "Failed to load projects for dashboard",
      await response.text()
    );
    redirect("/login");
  }

  const { projects: serializedProjects } = await response.json();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Dashboard
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">
                {session.user?.name
                  ? `Welcome, ${session.user.name}`
                  : "Your projects"}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View and create projects tied to your account.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
            >
              Back to map
            </Link>
          </div>
        </div>

        <ProjectDashboard
          initialProjects={serializedProjects}
          userName={session.user?.name ?? session.user?.email ?? "You"}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
