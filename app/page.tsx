import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const Home = async () => {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
        redirect('/chat');
    }

    redirect('/login');
};

export default Home;
