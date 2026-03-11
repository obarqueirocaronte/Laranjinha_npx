import React from 'react';
import clsx from 'clsx';

interface UserAvatarProps {
    src?: string | null;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    border?: boolean;
}

const SIZES = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
    src, 
    name, 
    size = 'md', 
    className,
    border = true 
}) => {
    const fallbackSeed = name || 'User';
    const dicebearUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${fallbackSeed}&backgroundColor=transparent`;

    return (
        <div className={clsx(
            "relative shrink-0 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-100",
            SIZES[size],
            border && "border border-slate-200 shadow-sm",
            className
        )}>
            {src ? (
                <img 
                    src={src} 
                    alt={name || 'User Avatar'} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // If custom image fails, fallback to dicebear
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
        </div>
    );
};
