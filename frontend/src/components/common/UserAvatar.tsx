import React from 'react';
import clsx from 'clsx';

interface UserAvatarProps {
    src?: string | null;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    border?: boolean;
    role?: 'manager' | 'salesops' | 'sdr' | string | null;
}

const SIZES = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24',
};

const ROLE_CONFIG: Record<string, { ring: string; bg: string; text: string; label: string; glow: string }> = {
    manager: { 
        ring: 'ring-indigo-400/50', 
        bg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        text: 'text-indigo-600',
        label: 'Manager',
        glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]'
    },
    salesops: { 
        ring: 'ring-orange-400/50', 
        bg: 'bg-gradient-to-br from-orange-500 to-rose-500',
        text: 'text-orange-600',
        label: 'SalesOps',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]'
    },
    sdr: { 
        ring: 'ring-emerald-400/50', 
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        text: 'text-emerald-600',
        label: 'SDR',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]'
    },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
    src, 
    name, 
    size = 'md', 
    className,
    border = true,
    role
}) => {
    const fallbackSeed = name || 'User';
    const dicebearUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${fallbackSeed}&backgroundColor=transparent`;
    
    // Normalize role to lowercase for lookup
    const roleKey = role?.toLowerCase() || 'sdr';
    const config = ROLE_CONFIG[roleKey] || (roleKey === 'admin' ? ROLE_CONFIG.manager : ROLE_CONFIG.sdr);

    return (
        <div className="relative shrink-0 p-0.5">
            <div className={clsx(
                "relative rounded-2xl overflow-hidden flex items-center justify-center bg-slate-100 transition-all duration-300",
                SIZES[size],
                border && "ring-2 ring-offset-2",
                border && config?.ring,
                border && config?.glow,
                !border && "border border-slate-200 shadow-sm",
                className
            )}>
                {src ? (
                    <img 
                        src={src} 
                        alt={name || 'User Avatar'} 
                        className="w-full h-full object-cover scale-110"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = dicebearUrl;
                        }}
                    />
                ) : (
                    <img 
                        src={dicebearUrl} 
                        alt={name || 'User Avatar'} 
                        className="w-full h-full object-cover"
                    />
                )}
                
                {/* Premium Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
            </div>
            
            {/* Role Badge */}
            {role && (size === 'md' || size === 'lg' || size === 'xl') && (
                <div className={clsx(
                    "absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest text-white shadow-lg border border-white/40 z-10",
                    config?.bg
                )}>
                    {config?.label || role}
                </div>
            )}
        </div>
    );
};
