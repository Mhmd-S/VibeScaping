'use client';

import { useEffect, useState } from 'react';
import { Location } from '../types/landscape';

export const useCurrentLocation = () => {
    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getCurrentLocation = async () => {
            if (!navigator.geolocation) {
                setError('Geolocation is not supported by your browser');
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setLoading(false);
                },
                (err) => {
                    setError(`Error getting location: ${err.message}`);
                    setLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        };

        getCurrentLocation();
    }, []);

    return { location, loading, error };
};

