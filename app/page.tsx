import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const demos = [
    {
        id: 1,
        title: 'Modern Garden Design',
        description: 'AI-powered landscape visualization with natural elements',
        image: '/refrences/refrence1.png',
    },
    {
        id: 2,
        title: 'Contemporary Outdoor Space',
        description: 'Create stunning outdoor living areas with intelligent design',
        image: '/refrences/refrence2.png',
    },
    {
        id: 3,
        title: 'Sustainable Landscaping',
        description: 'Eco-friendly designs that blend beauty with functionality',
        image: '/refrences/refrence3.png',
    },
];

const Home = () => {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">AI-Powered Design Tool</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                        Transform Your Vision Into
                        <span className="text-primary"> Reality</span>
                    </h1>
                    <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
                        Create stunning landscape designs with the power of AI. Draw, describe, and watch your ideas come to life.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Button asChild size="lg" className="group">
                            <Link href="/chat">
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="#demos">View Demos</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
