import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: {
        signIn: '/login',
    },
});

export const config = {
    matcher: ['/dashboard', '/api/projects', '/api/generate-landscape', '/editor'],
};

