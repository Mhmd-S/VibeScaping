'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, BookOpen, Play, Key, HardDrive, Shield, Zap } from 'lucide-react';
import { Logo } from '@/components/sidebar-03/logo';



const Home = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibescaping.com';

    const webpageData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'VibeScaping - AI Sketch to Image | Whiteboard AI',
        description: 'Transform your AI sketches into stunning images with VibeScaping\'s intelligent whiteboard AI. Draw, refine, and create with our AI sketch to image tool powered by Nano Banana Editor (NBP).',
        url: siteUrl,
        inLanguage: 'en-US',
        isPartOf: {
            '@type': 'WebSite',
            name: 'VibeScaping',
            url: siteUrl,
        },
        about: {
            '@type': 'SoftwareApplication',
            name: 'VibeScaping',
            applicationCategory: 'DesignApplication',
        },
    };

    const videoSchema1 = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: 'Property to Architecture Map - AI Sketch to Image Demo',
        description: 'Transform an aerial property view into an architectural-style map and redesign the landscape using our AI sketch to image technology. Watch how our whiteboard AI combined with Nano Banana Editor (NBP) turns a simple property capture into a detailed architectural visualization with landscape modifications.',
        thumbnailUrl: `${siteUrl}/demos/Demo2.mp4`,
        uploadDate: '2024-01-01',
        contentUrl: `${siteUrl}/demos/Demo2.mp4`,
        embedUrl: `${siteUrl}/demos/Demo2.mp4`,
    };

    const videoSchema2 = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: 'Stick Man to Warrior - AI Sketch Enhancement Demo',
        description: 'Watch a simple stick man sketch transform into a fully equipped warrior using our AI sketch to image technology. Using Nano Banana Editor (NBP), we add a sword, armor, and shield while preserving the original stick man structure. This demonstrates the power of our whiteboard AI for building upon existing drawings without altering the base sketch.',
        thumbnailUrl: `${siteUrl}/demos/Demo3.mp4`,
        uploadDate: '2024-01-01',
        contentUrl: `${siteUrl}/demos/Demo3.mp4`,
        embedUrl: `${siteUrl}/demos/Demo3.mp4`,
    };

    return (
        <div className="min-h-screen bg-background">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageData) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema1) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema2) }}
            />
            {/* Floating Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <Logo className="h-10 w-10" />
                            <span className="font-semibold text-foreground">VibeScaping</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="ghost">
                                <Link href="/auth/signin">Sign In</Link>
                            </Button>
                            <Button asChild variant="default">
                                <Link href="/chat">
                                    Get Started for Free
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="bg-background relative min-h-screen w-full py-32 overflow-hidden">
                <div className="relative z-20 flex items-center justify-center">
                    <div className="bg-background flex w-fit flex-col items-center justify-center gap-4 pb-3 text-center">
                        <Button
                            variant="outline"
                            className="whitespace-nowrap h-9 bg-muted/60 group mt-24 flex w-fit items-center justify-center gap-3 rounded-full px-5 py-1 tracking-tight text-md"
                        >
                            <span className="bg-foreground size-2 rounded-full"></span>
                            <span>Draw on a whiteboard, iterate with NBP (BYOK), get into creative flow</span>
                        </Button>
                        <div className="relative flex max-w-4xl items-center justify-center text-center text-5xl font-medium tracking-tight md:text-7xl">
                            <h1 className="relative z-10 tracking-tighter font-display">
                                <span className="mr-3">Draw, refine, and vibe. </span>
                                <span> {" "} Get into </span>
                                <span
                                    className="relative z-0 inline-flex after:absolute after:left-[0.04em] after:top-[0.04em] after:content-[attr(data-text)] after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)] after:-z-10 after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent after:animate-line-shadow text-primary"
                                    data-text="flow"
                                    style={{ "--shadow-color": "black" } as React.CSSProperties}
                                >
                                    {" "}
                                    flow{" "}
                                </span>
                                <span> with </span>
                                <span
                                    className="relative z-0 inline-flex after:absolute after:left-[0.04em] after:top-[0.04em] after:content-[attr(data-text)] after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)] after:-z-10 after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent after:animate-line-shadow text-primary"
                                    data-text="VibeScaping"
                                    style={{ "--shadow-color": "black" } as React.CSSProperties}
                                >
                                    VibeScaping
                                </span>
                                <span>.</span>
                            </h1>
                            <div className="z-[9] bg-background absolute h-[105%] w-[85%]"></div>
                        </div>
                        <p className="bg-background text-muted-foreground mt-5 max-w-xl">
                            Transform your AI sketches into stunning images with our intelligent whiteboard AI. Use our AI sketch to image tool powered by Nano Banana Editor (NBP) to draw, refine, and find your creative flow.{" "}

                        </p>
                        <div className="flex gap-4">
                            <Button
                                asChild
                                className="group flex w-fit items-center justify-center gap-2 rounded-full px-4 py-1 tracking-tight h-9 text-md"
                            >
                                <Link href="/chat">
                                    <span>Get Started for Free</span>
                                    <ArrowRight className="size-4 -rotate-45 transition-all ease-out group-hover:ml-3 group-hover:rotate-0" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
                {/* Decorative SVG - Left */}
                <svg
                    className="absolute left-0 top-6 hidden text-primary lg:block"
                    width="571"
                    height="560"
                    viewBox="0 0 571 560"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        stroke="#cccccc"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity="0.2"
                        d="M166.571 320.89L166.337 320.448L166.571 320.89ZM-185.483 414.753L-185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446L-90.541 550.446L-90.798 550.017ZM251.609 358.688L251.447 358.215L251.447 358.215L251.609 358.688ZM569.859 394.354C570.073 394.528 570.388 394.496 570.562 394.281C570.736 394.067 570.703 393.752 570.489 393.578L569.859 394.354ZM166.571 320.89L166.337 320.448C84.8815 363.503 5.15738 369.122 -58.3672 372.888C-90.1101 374.77 -117.856 376.19 -139.709 381.614C-161.58 387.041 -177.656 396.504 -185.937 414.544L-185.483 414.753L-185.029 414.961C-176.926 397.312 -161.193 387.976 -139.469 382.584C-117.727 377.188 -90.0926 375.77 -58.308 373.886C5.22228 370.12 85.1407 364.497 166.804 321.332L166.571 320.89ZM-185.483 414.753L-185.937 414.544C-213.037 473.573 -201.627 514.972 -177.119 537.918C-152.665 560.814 -115.234 565.241 -90.541 550.446L-90.798 550.017L-91.055 549.588C-115.323 564.129 -152.27 559.813 -176.436 537.188C-200.548 514.612 -212 473.711 -185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446C-58.5271 531.264 -27.9166 512.042 1.68716 493.418C31.2925 474.794 59.8897 456.769 87.8844 439.978C143.875 406.396 197.433 377.763 251.771 359.161L251.609 358.688L251.447 358.215C197.009 376.851 143.38 405.527 87.37 439.121C59.3643 455.918 30.7575 473.949 1.15467 492.572C-28.4497 511.196 -59.0516 530.413 -91.055 549.588L-90.798 550.017ZM251.609 358.688L251.771 359.161C376.455 316.476 485.473 325.788 569.859 394.354L570.174 393.966L570.489 393.578C485.756 324.729 376.346 315.457 251.447 358.215L251.609 358.688ZM-3.19002 2.72941L-3.12782 3.22553C104.974 -10.3276 201.201 40.6009 243.453 109.09C264.574 143.326 272.197 181.928 261.119 219.065C250.041 256.203 220.237 291.959 166.337 320.448L166.571 320.89L166.804 321.332C220.873 292.754 250.903 256.812 262.077 219.351C273.252 181.891 265.545 142.995 244.304 108.565C201.832 39.719 105.21 -11.365 -3.25222 2.23329L-3.19002 2.72941Z"
                    ></path>
                    <path
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M166.571 320.89L166.337 320.448L166.571 320.89ZM-185.483 414.753L-185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446L-90.541 550.446L-90.798 550.017ZM251.609 358.688L251.447 358.215L251.447 358.215L251.609 358.688ZM569.859 394.354C570.073 394.528 570.388 394.496 570.562 394.281C570.736 394.067 570.703 393.752 570.489 393.578L569.859 394.354ZM166.571 320.89L166.337 320.448C84.8815 363.503 5.15738 369.122 -58.3672 372.888C-90.1101 374.77 -117.856 376.19 -139.709 381.614C-161.58 387.041 -177.656 396.504 -185.937 414.544L-185.483 414.753L-185.029 414.961C-176.926 397.312 -161.193 387.976 -139.469 382.584C-117.727 377.188 -90.0926 375.77 -58.308 373.886C5.22228 370.12 85.1407 364.497 166.804 321.332L166.571 320.89ZM-185.483 414.753L-185.937 414.544C-213.037 473.573 -201.627 514.972 -177.119 537.918C-152.665 560.814 -115.234 565.241 -90.541 550.446L-90.798 550.017L-91.055 549.588C-115.323 564.129 -152.27 559.813 -176.436 537.188C-200.548 514.612 -212 473.711 -185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446C-58.5271 531.264 -27.9166 512.042 1.68716 493.418C31.2925 474.794 59.8897 456.769 87.8844 439.978C143.875 406.396 197.433 377.763 251.771 359.161L251.609 358.688L251.447 358.215C197.009 376.851 143.38 405.527 87.37 439.121C59.3643 455.918 30.7575 473.949 1.15467 492.572C-28.4497 511.196 -59.0516 530.413 -91.055 549.588L-90.798 550.017ZM251.609 358.688L251.771 359.161C376.455 316.476 485.473 325.788 569.859 394.354L570.174 393.966L570.489 393.578C485.756 324.729 376.346 315.457 251.447 358.215L251.609 358.688ZM-3.19002 2.72941L-3.12782 3.22553C104.974 -10.3276 201.201 40.6009 243.453 109.09C264.574 143.326 272.197 181.928 261.119 219.065C250.041 256.203 220.237 291.959 166.337 320.448L166.571 320.89L166.804 321.332C220.873 292.754 250.903 256.812 262.077 219.351C273.252 181.891 265.545 142.995 244.304 108.565C201.832 39.719 105.21 -11.365 -3.25222 2.23329L-3.19002 2.72941Z"
                        opacity="1"
                        pathLength="1"
                        strokeDashoffset="0px"
                        strokeDasharray="1px 1px"
                    ></path>
                </svg>
                {/* Decorative SVG - Right */}
                <svg
                    className="absolute right-0 top-32 hidden scale-x-[-1] scale-y-[-1] text-primary lg:block"
                    width="571"
                    height="560"
                    viewBox="0 0 571 560"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        stroke="#cccccc"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity="0.2"
                        d="M166.571 320.89L166.337 320.448L166.571 320.89ZM-185.483 414.753L-185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446L-90.541 550.446L-90.798 550.017ZM251.609 358.688L251.447 358.215L251.447 358.215L251.609 358.688ZM569.859 394.354C570.073 394.528 570.388 394.496 570.562 394.281C570.736 394.067 570.703 393.752 570.489 393.578L569.859 394.354ZM166.571 320.89L166.337 320.448C84.8815 363.503 5.15738 369.122 -58.3672 372.888C-90.1101 374.77 -117.856 376.19 -139.709 381.614C-161.58 387.041 -177.656 396.504 -185.937 414.544L-185.483 414.753L-185.029 414.961C-176.926 397.312 -161.193 387.976 -139.469 382.584C-117.727 377.188 -90.0926 375.77 -58.308 373.886C5.22228 370.12 85.1407 364.497 166.804 321.332L166.571 320.89ZM-185.483 414.753L-185.937 414.544C-213.037 473.573 -201.627 514.972 -177.119 537.918C-152.665 560.814 -115.234 565.241 -90.541 550.446L-90.798 550.017L-91.055 549.588C-115.323 564.129 -152.27 559.813 -176.436 537.188C-200.548 514.612 -212 473.711 -185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446C-58.5271 531.264 -27.9166 512.042 1.68716 493.418C31.2925 474.794 59.8897 456.769 87.8844 439.978C143.875 406.396 197.433 377.763 251.771 359.161L251.609 358.688L251.447 358.215C197.009 376.851 143.38 405.527 87.37 439.121C59.3643 455.918 30.7575 473.949 1.15467 492.572C-28.4497 511.196 -59.0516 530.413 -91.055 549.588L-90.798 550.017ZM251.609 358.688L251.771 359.161C376.455 316.476 485.473 325.788 569.859 394.354L570.174 393.966L570.489 393.578C485.756 324.729 376.346 315.457 251.447 358.215L251.609 358.688ZM-3.19002 2.72941L-3.12782 3.22553C104.974 -10.3276 201.201 40.6009 243.453 109.09C264.574 143.326 272.197 181.928 261.119 219.065C250.041 256.203 220.237 291.959 166.337 320.448L166.571 320.89L166.804 321.332C220.873 292.754 250.903 256.812 262.077 219.351C273.252 181.891 265.545 142.995 244.304 108.565C201.832 39.719 105.21 -11.365 -3.25222 2.23329L-3.19002 2.72941Z"
                    ></path>
                    <path
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M166.571 320.89L166.337 320.448L166.571 320.89ZM-185.483 414.753L-185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446L-90.541 550.446L-90.798 550.017ZM251.609 358.688L251.447 358.215L251.447 358.215L251.609 358.688ZM569.859 394.354C570.073 394.528 570.388 394.496 570.562 394.281C570.736 394.067 570.703 393.752 570.489 393.578L569.859 394.354ZM166.571 320.89L166.337 320.448C84.8815 363.503 5.15738 369.122 -58.3672 372.888C-90.1101 374.77 -117.856 376.19 -139.709 381.614C-161.58 387.041 -177.656 396.504 -185.937 414.544L-185.483 414.753L-185.029 414.961C-176.926 397.312 -161.193 387.976 -139.469 382.584C-117.727 377.188 -90.0926 375.77 -58.308 373.886C5.22228 370.12 85.1407 364.497 166.804 321.332L166.571 320.89ZM-185.483 414.753L-185.937 414.544C-213.037 473.573 -201.627 514.972 -177.119 537.918C-152.665 560.814 -115.234 565.241 -90.541 550.446L-90.798 550.017L-91.055 549.588C-115.323 564.129 -152.27 559.813 -176.436 537.188C-200.548 514.612 -212 473.711 -185.029 414.961L-185.483 414.753ZM-90.798 550.017L-90.541 550.446C-58.5271 531.264 -27.9166 512.042 1.68716 493.418C31.2925 474.794 59.8897 456.769 87.8844 439.978C143.875 406.396 197.433 377.763 251.771 359.161L251.609 358.688L251.447 358.215C197.009 376.851 143.38 405.527 87.37 439.121C59.3643 455.918 30.7575 473.949 1.15467 492.572C-28.4497 511.196 -59.0516 530.413 -91.055 549.588L-90.798 550.017ZM251.609 358.688L251.771 359.161C376.455 316.476 485.473 325.788 569.859 394.354L570.174 393.966L570.489 393.578C485.756 324.729 376.346 315.457 251.447 358.215L251.609 358.688ZM-3.19002 2.72941L-3.12782 3.22553C104.974 -10.3276 201.201 40.6009 243.453 109.09C264.574 143.326 272.197 181.928 261.119 219.065C250.041 256.203 220.237 291.959 166.337 320.448L166.571 320.89L166.804 321.332C220.873 292.754 250.903 256.812 262.077 219.351C273.252 181.891 265.545 142.995 244.304 108.565C201.832 39.719 105.21 -11.365 -3.25222 2.23329L-3.19002 2.72941Z"
                        opacity="1"
                        pathLength="1"
                        strokeDashoffset="0px"
                        strokeDasharray="1px 1px"
                    ></path>
                </svg>
            </section>

            {/* Demos Section */}
            <section className="flex flex-col items-center w-full gap-8">
                {/* Demo 1: Property to Architecture Map */}
                <div className="relative flex w-full items-center flex-col gap-8 border-t border-border py-16 md:p-8">
                    <div className="container grid grid-cols-1 gap-10 md:grid-cols-2">
                        <div className="flex flex-col gap-4">
                            <div>
                                <Badge variant="secondary" className="rounded-none uppercase">
                                    Demo
                                </Badge>
                            </div>
                            <h2 className="text-2xl font-bold">Property to Architecture Map - AI Sketch to Image</h2>
                            <div className="space-y-2 text-sm text-foreground/90">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" aria-hidden="true" />
                                    <span>Architects, Landscape Designers, Property Developers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                                    <span>Whiteboard + NBP Workflow</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Play className="h-4 w-4" aria-hidden="true" />
                                    <span>Video Demo</span>
                                </div>
                            </div>
                            <p className="text-lg leading-relaxed">
                                Transform an aerial property view into an architectural-style map and redesign the landscape using our AI sketch to image technology.
                                Watch how our whiteboard AI combined with Nano Banana Editor (NBP) turns a simple property
                                capture into a detailed architectural visualization with landscape modifications.
                            </p>
                            <Link
                                href="/chat"
                                className="group/btn flex w-fit items-center gap-2 border-l border-border p-1 hover:bg-accent"
                            >
                                <span className="font-medium">Try It Now</span>
                                <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
                            </Link>
                        </div>
                        <div>
                            <div className="aspect-video w-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-4 dark:from-muted dark:to-muted/50">
                                <video
                                    className="h-full w-full object-cover rounded-md"
                                    controls
                                    preload="metadata"
                                    aria-label="Property to Architecture Map Demo"
                                >
                                    <source src="/demos/Demo2.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Demo 2: Stick Man to Warrior */}
                <div className="relative flex flex-col w-full items-center gap-8 border-t border-border py-16 md:p-8">
                    <div className="container grid grid-cols-1 gap-10 md:grid-cols-2">
                        <div className="flex flex-col gap-4">
                            <div>
                                <Badge variant="secondary" className="rounded-none uppercase">
                                    Demo
                                </Badge>
                            </div>
                            <h2 className="text-2xl font-bold">Stick Man to Warrior - AI Sketch Enhancement</h2>
                            <div className="space-y-2 text-sm text-foreground/90">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" aria-hidden="true" />
                                    <span>Artists, Designers, Creatives</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                                    <span>NBP Enhancement Workflow</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Play className="h-4 w-4" aria-hidden="true" />
                                    <span>Video Demo</span>
                                </div>
                            </div>
                            <p className="text-lg leading-relaxed">
                                Watch a simple stick man sketch transform into a fully equipped warrior using our AI sketch to image technology. Using Nano Banana Editor (NBP),
                                we add a sword, armor, and shield while preserving the original stick man structure. This demonstrates
                                the power of our whiteboard AI for building upon existing drawings without altering the base sketch.
                            </p>
                            <Link
                                href="/chat"
                                className="group/btn flex w-fit items-center gap-2 border-l border-border p-1 hover:bg-accent"
                            >
                                <span className="font-medium">Try It Now</span>
                                <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
                            </Link>
                        </div>
                        <div>
                            <div className="aspect-video w-full bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-4 dark:from-muted dark:to-muted/50">
                                <video
                                    className="h-full w-full object-cover rounded-md"
                                    controls
                                    preload="metadata"
                                    aria-label="Stick Man to Warrior Demo"
                                >
                                    <source src="/demos/Demo3.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="border-t border-border py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center gap-4 mb-12 text-center">
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Privacy & Control First
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl">
                            Your data stays yours. Everything runs locally, and you connect directly to NBP with your own API key.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {/* Feature 1: BYOK */}
                        <div className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10">
                                    <Key className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">Bring Your Own Key</h3>
                            </div>
                            <p className="text-muted-foreground">
                                Use your own API key to access NBP directly. No intermediaries, no middlemen.
                            </p>
                        </div>

                        {/* Feature 2: Local Storage */}
                        <div className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10">
                                    <HardDrive className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">Local Storage</h3>
                            </div>
                            <p className="text-muted-foreground">
                                All your data is saved locally in your browser. Your drawings, images, and workspaces never leave your device.
                            </p>
                        </div>

                        {/* Feature 3: No Server Uploads */}
                        <div className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10">
                                    <Shield className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">Nothing Sent to Servers</h3>
                            </div>
                            <p className="text-muted-foreground">
                                We don't store, process, or have access to your data. Nothing is sent to our servers.
                            </p>
                        </div>

                        {/* Feature 4: Direct NBP Access */}
                        <div className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10">
                                    <Zap className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">Direct NBP Access</h3>
                            </div>
                            <p className="text-muted-foreground">
                                Connect directly to NBP (Neural Backpropagation) services. Fast, secure, and under your control.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="border-t border-border py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center gap-6 text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                            Ready to Get Started?
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Start creating with VibeScaping. Draw on the whiteboard, iterate with NBP, and find your creative flow.
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="group flex w-fit items-center justify-center gap-2 rounded-full px-6 py-6 tracking-tight text-lg"
                        >
                            <Link href="/chat">
                                <span>Get Started for Free</span>
                                <ArrowRight className="size-5 -rotate-45 transition-all ease-out group-hover:ml-2 group-hover:rotate-0" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
