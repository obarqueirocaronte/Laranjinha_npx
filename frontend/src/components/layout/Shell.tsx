import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div
            className="relative h-screen w-full overflow-hidden flex flex-col font-sans"
            style={{
                /* Soft warm cream-peach — "laranja clarinho" */
                background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0DC 40%, #FFE4C0 80%, #FFD9A8 100%)',
            }}
        >
            {/* Orb 1 – top-left very faint amber */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-28 -left-28 w-[480px] h-[480px] rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, #FFCF77 0%, transparent 70%)', filter: 'blur(70px)' }}
            />
            {/* Orb 2 – bottom-right muted peach */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -right-12 w-[380px] h-[380px] rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #FFAD60 0%, transparent 70%)', filter: 'blur(60px)' }}
            />
            {/* Glass orb 3 – mid white gleam */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full opacity-15"
                style={{ background: 'radial-gradient(ellipse, #fff 0%, transparent 60%)', filter: 'blur(40px)' }}
            />

            {/* Subtle noise overlay for texture */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    opacity: 0.03,
                }}
            />

            {/* Main Content — above all decorative layers */}
            <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-hidden flex flex-col px-8 lg:px-12 xl:px-16 pb-0 pt-6">
                    {children}
                </div>
            </main>
        </div>
    );
};
