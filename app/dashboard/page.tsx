import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { cookies, headers } from 'next/headers';

import ProjectDashboard from '@/app/components/dashboard/ProjectDashboard';
import { authOptions } from '@/lib/auth';

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

    return (
        <ProjectDashboard
            initialProjects={serializedProjects}
            userName={session.user?.name ?? session.user?.email ?? 'You'}
        />
    );
};

export default DashboardPage;
