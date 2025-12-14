import Link from 'next/link';
import { CreditCard, HelpCircle, Map, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import ProfileMenu from '@/app/components/dashboard/ProfileMenu';
import { Button } from '@/app/components/ui/button';
import { authOptions } from '@/lib/auth';

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
};

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    const firstName = session.user?.name?.split(' ')?.[0] || 'there';
    const greeting = getGreeting();

    return (
        <div className="flex max-h-screen bg-background text-foreground overflow-none">
            <aside className="hidden w-64 flex-col border-r border-border bg-card/90 backdrop-blur lg:flex">
                <div className="flex items-center gap-3 px-4 py-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                        LS
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-card-foreground">Landscaping</p>
                        <p className="text-xs text-muted-foreground">Design Studio</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-1 px-3 pb-6">
                    <Button asChild className="w-full justify-start">
                        <Link href="/map">
                            <Plus className="h-4 w-4" />
                            Create
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/account">
                            <Map className="h-4 w-4" />
                            Account
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/billing">
                            <CreditCard className="h-4 w-4" />
                            Billing
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/help">
                            <HelpCircle className="h-4 w-4" />
                            Help
                        </Link>
                    </Button>
                </nav>
            </aside>

            <div className="flex flex-1 flex-col">
                <header className="border-b border-border bg-card/90 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-primary">Projects</p>
                            <h1 className="text-2xl font-semibold text-card-foreground">
                                Good {greeting}, {firstName}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-card-foreground shadow-sm">
                                Credits
                                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                                    50
                                </span>
                            </div>
                            <Button asChild size="sm">
                                <Link href="/upgrade">
                                    Upgrade
                                </Link>
                            </Button>
                            <ProfileMenu name={session.user?.name ?? 'You'} email={session.user?.email ?? ''} />
                        </div>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 overflow-scroll max-h-full">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

