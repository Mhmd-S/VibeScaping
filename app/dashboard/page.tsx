import Link from 'next/link';
import { CreditCard, HelpCircle, Map, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { cookies, headers } from 'next/headers';

import ProfileMenu from '@/app/components/dashboard/ProfileMenu';
import ProjectDashboard from '@/app/components/dashboard/ProjectDashboard';
import { authOptions } from '@/lib/auth';

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
};

const DashboardPage = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const headerStore = await headers();
    const host = headerStore.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ?? process.env.NEXTAUTH_URL
        ?? (host ? `${protocol}://${host}` : undefined);

    if (!baseUrl) {
        console.error('Failed to load projects for dashboard: missing base URL');
        redirect('/login');
    }

    const response = await fetch(new URL('/api/projects', baseUrl), {
        headers: {
            cookie: cookieHeader,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const body = await response.text();
        if (response.status === 401) {
            redirect('/login');
        }
        console.error('Failed to load projects for dashboard', body || response.statusText);
        redirect('/login');
    }

    const { projects: serializedProjects } = await response.json();
    const firstName = session.user?.name?.split(' ')?.[0] || 'there';
    const greeting = getGreeting();

    return (
        <div className="flex min-h-screen bg-white text-zinc-900">
            <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white/90 backdrop-blur lg:flex">
                <div className="flex items-center gap-3 px-4 py-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm">
                        LS
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-zinc-900">Landscaping</p>
                        <p className="text-xs text-zinc-500">Design Studio</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-1 px-3 pb-6">
                    <Link
                        href="/map"
                        className="flex items-center gap-2 rounded-full bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                    >
                        <Plus className="h-4 w-4" />
                        Create
                    </Link>
                    <Link
                        href="/account"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-green-50 hover:text-green-700"
                    >
                        <Map className="h-4 w-4" />
                        Account
                    </Link>
                    <Link
                        href="/billing"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-green-50 hover:text-green-700"
                    >
                        <CreditCard className="h-4 w-4" />
                        Billing
                    </Link>
                    <Link
                        href="/help"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-green-50 hover:text-green-700"
                    >
                        <HelpCircle className="h-4 w-4" />
                        Help
                    </Link>
                </nav>
            </aside>

            <div className="flex flex-1 flex-col">
                <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-green-700">Projects</p>
                            <h1 className="text-2xl font-semibold text-zinc-900">
                                Good {greeting}, {firstName}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-800 shadow-sm">
                                Credits
                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                                    50
                                </span>
                            </div>
                            <Link
                                href="/upgrade"
                                className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                            >
                                Upgrade
                            </Link>
                            <ProfileMenu name={session.user?.name ?? 'You'} email={session.user?.email ?? ''} />
                        </div>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 overflow-scroll max-h-3/4">
                    <ProjectDashboard
                        initialProjects={serializedProjects}
                        userName={session.user?.name ?? session.user?.email ?? 'You'}
                    />
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;
