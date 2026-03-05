import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const FloatingActions: React.FC = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Auto focus on open
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        if (isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen]);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            {/* Botões Flutuantes */}
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
                {/* Botão de Busca */}
                <motion.button
                    onClick={() => {
                        setIsSearchOpen(!isSearchOpen);
                    }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 1.0 }}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200",
                        isSearchOpen
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30"
                            : "bg-gradient-soft border border-orange-100 shadow-glass/80 backdrop-blur-xl text-slate-600 hover:text-blue-500 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                    )}
                >
                    <Search size={20} />
                </motion.button>
            </div>

            {/* Modal de Busca */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsSearchOpen(false)}
                        />
                        <motion.div
                            ref={searchRef}
                            initial={{ opacity: 0, scale: 0.8, y: -20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.8, y: -20, filter: "blur(10px)" }}
                            transition={{
                                type: "tween",
                                duration: 0.25,
                                ease: [0.32, 0.72, 0, 1]
                            }}
                            className="relative w-[560px] bg-gradient-soft border border-orange-100 shadow-glass/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden"
                        >
                            {/* Search Input */}
                            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                                <Search size={20} className="text-slate-600" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Buscar leads, empresas, contatos..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-base outline-none"
                                />
                                <kbd className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">ESC</kbd>
                            </div>

                            {/* Search Results */}
                            <div className="max-h-[300px] overflow-y-auto">
                                {searchQuery ? (
                                    <div className="p-2">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                            Leads
                                        </div>
                                        {['MegaCorp Industries', 'Green Tech Solutions', 'Alpha Digital'].map((lead, i) => (
                                            <motion.button
                                                key={i}
                                                whileHover={{ backgroundColor: 'rgba(249, 115, 22, 0.08)' }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                    {lead[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-slate-800">{lead}</div>
                                                    <div className="text-xs text-slate-600">Em negociação</div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-slate-600">
                                        <Search size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">Digite para buscar leads</p>
                                        <p className="text-xs mt-1 text-slate-300">Use ⌘+F para abrir rapidamente</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
