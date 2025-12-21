import { redirect } from 'next/navigation';

const Home = async () => {
    redirect('/chat');
};

export default Home;
