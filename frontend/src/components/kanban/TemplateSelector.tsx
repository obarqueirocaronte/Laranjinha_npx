import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

export interface Template {
    id: string;
    name: string;
    type: 'email' | 'whatsapp';
    content: string;
}

const EMAIL_TEMPLATES: Template[] = [
    { id: 'e1', name: 'Apresentação Inicial', type: 'email', content: 'Olá {nome},\n\nTrabalhamos com soluções que podem ajudar a {empresa} a...' },
    { id: 'e2', name: 'Follow-up Profissional', type: 'email', content: 'Olá {nome},\n\nEstou retornando nosso contato para verificar se teve a...' },
    { id: 'e3', name: 'Agendamento de Reunião', type: 'email', content: 'Olá {nome},\n\nGostaria de agendar uma conversa de 15 minutos para...' },
];

const WHATSAPP_TEMPLATES: Template[] = [
    { id: 'w1', name: 'Intro Rápida', type: 'whatsapp', content: 'Olá {nome}! 👋 Aqui é do time comercial. Podemos conversar sobre soluções?' },
    { id: 'w2', name: 'Follow-up Amigável', type: 'whatsapp', content: 'Oi {nome}! Só retornando nosso contato. Conseguiu ver a proposta?' },
    { id: 'w3', name: 'Convite Reunião', type: 'whatsapp', content: '{nome}, que tal uma call rápida de 15min? Tenho algo interessante!' },
];

interface TemplateSelectorProps {
    type: 'email' | 'whatsapp';
    selectedId: string | null;
    onSelect: (template: Template) => void;
    compact?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ type, selectedId, onSelect, compact }) => {
    const templates = type === 'email' ? EMAIL_TEMPLATES : WHATSAPP_TEMPLATES;

    return (
        <div className="space-y-1.5">
            {!compact && (
                <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.1em] pl-1">
                    {type === 'email' ? 'Seleção de Email' : 'Seleção de WhatsApp'}
                </h4>
            )}
            <div className="grid grid-cols-1 gap-1">
                {templates.map((template) => {
                    const isSelected = selectedId === template.id;
                    return (
                        <button
                            key={template.id}
                            onClick={() => onSelect(template)}
                            className={clsx(
                                "w-full text-left rounded-xl border transition-all duration-300 group relative overflow-hidden",
                                compact ? "p-2.5 flex items-center gap-3 h-auto" : "p-5 flex flex-col justify-between h-[184px] rounded-[24px]",
                                isSelected
                                    ? "bg-white border-orange-200 shadow-[0_4px_12px_rgba(255,140,0,0.08)] ring-2 ring-orange-100/50"
                                    : "bg-white/40 border-transparent hover:bg-white/60 hover:border-orange-100"
                            )}
                        >
                            {!compact ? (
                                <>
                                    <div className="flex items-start justify-between w-full mb-3">
                                        <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900 line-clamp-2 pr-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                            {template.name}
                                        </span>
                                        <div className={clsx(
                                            "rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0 w-6 h-6",
                                            isSelected
                                                ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                                : "border-orange-100 bg-white group-hover:border-orange-200"
                                        )}>
                                            {isSelected && <Check size={14} strokeWidth={4} />}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden w-full relative text-left">
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium whitespace-pre-wrap break-words" style={{ fontFamily: 'Comfortaa, cursive' }}>
                                            {template.content}
                                        </p>
                                        <div className={clsx("absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t to-transparent pointer-events-none", isSelected ? "from-white" : "from-white/40 group-hover:from-white/60")} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={clsx(
                                        "rounded-lg border-2 flex items-center justify-center transition-all duration-300 shrink-0 w-5 h-5 border-1.5",
                                        isSelected
                                            ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                            : "border-orange-100 bg-white group-hover:border-orange-200"
                                    )}>
                                        {isSelected && <Check size={12} strokeWidth={4} />}
                                    </div>

                                    <span className={clsx(
                                        "font-bold truncate transition-colors text-[12px]",
                                        isSelected ? "text-slate-800" : "text-slate-500 group-hover:text-slate-700"
                                    )} style={{ fontFamily: 'Quicksand, sans-serif' }}>
                                        {template.name}
                                    </span>
                                </>
                            )}

                            {/* Subtle Hover Glow */}
                            {!isSelected && (
                                <div className="absolute inset-0 bg-orange-100/0 group-hover:bg-orange-100/10 transition-colors pointer-events-none" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export { EMAIL_TEMPLATES, WHATSAPP_TEMPLATES };
