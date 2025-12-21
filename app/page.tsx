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

            {/* Demo Gallery Section */}
            <section id="demos" className="container mx-auto px-4 py-16 md:py-24">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                        Explore Our Demos
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        See what's possible with AI-powered landscape design
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {demos.map((demo) => (
                        <Card key={demo.id} className="group overflow-hidden transition-all hover:shadow-lg">
                            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                <Image
                                    src={demo.image}
                                    alt={demo.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            </div>
                            <CardHeader>
                                <CardTitle>{demo.title}</CardTitle>
                                <CardDescription>{demo.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Button asChild size="lg" variant="outline">
                        <Link href="/chat">
                            Try It Yourself
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Features Section */}
            <section className="border-t bg-muted/50">
                <div className="container mx-auto px-4 py-16 md:py-24">
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="text-center">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">AI-Powered</h3>
                            <p className="text-muted-foreground">
                                Leverage advanced AI to generate and refine your landscape designs instantly.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <ArrowRight className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">Easy to Use</h3>
                            <p className="text-muted-foreground">
                                Intuitive interface that makes professional design accessible to everyone.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">Real-Time Preview</h3>
                            <p className="text-muted-foreground">
                                See your designs come to life as you draw and describe your vision.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
