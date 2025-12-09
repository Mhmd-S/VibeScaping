import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import MapView from './MapView';
import { authOptions } from '@/lib/auth';

const MapPage = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/map');
    }

    return <MapView />;
};

export default MapPage;


