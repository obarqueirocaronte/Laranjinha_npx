/**
 * KanbanBoard.tsx - O Coração da Aplicação
 *
 * Implementa o quadro Kanban drag-and-drop ("arrastar e soltar") que gere os Leads.
 * Utiliza a biblioteca @dnd-kit/core para a lógica de "arrastar".
 * 
 * Principais responsabilidades:
 * 1. Buscar os dados das colunas e leads no banco de dados.
 * 2. Posicionar os Leads nas colunas corretas e gerenciar o estado ao arrastá-los.
 * 3. Disparar automações e modais baseados na movimentação dos cards 
 *    (ex: mandar WhatsApp ao mover para a coluna respectiva).
 */
import { 
    DndContext, DragOverlay, useSensor, useSensors, 
    PointerSensor, MouseSensor, KeyboardSensor,
    defaultDropAnimationSideEffects 
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import type { DragStartEvent, DragEndEvent, DragOverEvent, DropAnimation } from '@dnd-kit/core';
import { useState, useCallback, useEffect } from 'react';
import { leadsAPI, aiAPI, cadencesAPI } from '../../lib/api';
import type { PipelineColumn } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { LeadDetailsModal } from './LeadDetailsModal';
import { CycleCompleteModal } from './CycleCompleteModal';
import { ScheduleCadenceModal } from './ScheduleCadenceModal';
import { DialerModal } from './DialerModal';
import { NotificationToast } from '../common/NotificationToast';
import type { NotificationType } from '../common/NotificationToast';
import type { Lead } from '../../types';
import { AnimatePresence } from 'framer-motion';
import { useVoip } from '../../contexts/VoipContext';
import { CallFeedbackModal } from './CallFeedbackModal';
import { SchedulePreviewModal } from './SchedulePreviewModal';
import { statsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
}

export const KanbanBoard = ({
    onLeadComplete,
    onActivity,
    onScheduleCountChange,
    showSchedulePreview,
    onCloseSchedulePreview,
    selectedSdrId
}: {
    onLeadComplete?: () => void;
    onActivity?: (type: 'call' | 'email' | 'whatsapp') => void;
    onScheduleCountChange?: (count: number) => void;
    showSchedulePreview?: boolean;
    onCloseSchedulePreview?: () => void;
    selectedSdrId?: string;
}) => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [columns, setColumns] = useState<PipelineColumn[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCycleCompleteOpen, setIsCycleCompleteOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [completedLead, setCompletedLead] = useState<Lead | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialerLead, setDialerLead] = useState<Lead | null>(null);
    const [manualFeedbackLead, setManualFeedbackLead] = useState<Lead | null>(null);
    const voip = useVoip();

    useEffect(() => {
        if (leads.length > 0 && onScheduleCountChange) {
            const count = leads.filter(l => Boolean(l.metadata?.next_contact_at)).length;
            onScheduleCountChange(count);
        }
    }, [leads, onScheduleCountChange]);

    const [zoom, setZoom] = useState(1);

    // Auto-adjust zoom to fit 5 columns on smaller screens without horizontal scroll
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 1440 && width >= 1200) setZoom(0.9);
            else if (width < 1200 && width >= 1024) setZoom(0.85);
            else if (width < 1024) setZoom(0.8);
            else setZoom(1);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchBoardData = async () => {
            try {
                setIsLoading(true);
                const [colsRes, leadsRes] = await Promise.all([
                    leadsAPI.getColumns(),
                    // SDRs only see their own leads; managers see all or selected SDR
                    leadsAPI.getSegments('qualification_status', 'qualified', 
                        selectedSdrId || (user?.role === 'sdr' ? user?.id : undefined)
                    )
                ]);

                if (colsRes.success && Array.isArray(colsRes.data) && colsRes.data.length > 0) {
                    setColumns(colsRes.data);
                } else if (!columns.length) {
                    // Fallback to minimal default columns if DB is empty to avoid white screen
                    setColumns([
                        { id: 'col-1', name: 'Novo', position: 1, color: '#f1f5f9' },
                        { id: 'col-2', name: 'Qualificado', position: 2, color: '#f1f5f9' }
                    ]);
                }
                
                if (leadsRes.success && Array.isArray(leadsRes.data)) {
                    setLeads(leadsRes.data);
                } else {
                    setLeads([]);
                }
            } catch (err) {
                console.error('Ops! Falha ao carregar o quadro:', err);
                addNotification('Não conseguimos carregar alguns dados. Tente atualizar.', 'error');
                if (!columns.length) {
                    setColumns([{ id: 'fallback', name: 'Board', position: 1, color: '#f1f5f9' }]);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.id) {
            fetchBoardData();
        }
    }, [user?.id, selectedSdrId]);

    const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications(prev => [...prev, { id, type, message }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.4',
                    scale: '0.95',
                },
            },
        }),
        duration: 250,
    };

    const updateLead = useCallback((updatedLead: Lead) => {
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
        if (selectedLead?.id === updatedLead.id) {
            setSelectedLead(updatedLead);
        }
    }, [selectedLead]);

    const handleCardClick = (lead: Lead) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };


    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setOverColumnId(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setOverColumnId(null);
            return;
        }
        const overId = over.id as string;
        const isColumn = columns.some(c => c.id === overId);
        if (isColumn) {
            setOverColumnId(overId);
        } else {
            const targetLead = leads.find(l => l.id === overId);
            if (targetLead) {
                setOverColumnId(targetLead.current_column_id);
            }
        }
    };

    const handleCallFeedback = async (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer' | 'connected' | 'not_interested' | 'spam', notes?: string) => {
        if (!voip.callRequiresFeedback) return;
        const leadIdToUpdate = voip.callRequiresFeedback.leadId;
        const targetLead = leads.find(l => l.id === leadIdToUpdate);

        try {
            // ── New Cadence Logic: Advance step if in active cadence ──
            if (targetLead?.lead_cadence_id && result !== 'reschedule') {
                const outcomeMap: any = {
                    'connected': 'connected',
                    'not_interested': 'not_interested',
                    'busy': 'busy',
                    'voicemail': 'voicemail',
                    'invalid': 'invalid_number',
                    'no-answer': 'no_answer',
                    'spam': 'spam'
                };
                
                const cadRes = await cadencesAPI.registerStep(targetLead.lead_cadence_id, {
                    outcome: outcomeMap[result] || 'not_interested',
                    canal: 'call',
                    notes
                });

                if (cadRes.success && cadRes.data.novo_status === 'concluida') {
                    setCompletedLead(targetLead);
                    setIsCycleCompleteOpen(true);
                }
            }

            // Registrar desfecho da ligação e anotações (legacy support)
            const updates: any = { last_call_outcome: result };
            if (notes) {
                updates.metadata = { last_call_notes: notes };
            }

            await leadsAPI.updateLead(leadIdToUpdate, updates);

            // Update local state so it shows up on the card immediately
            setLeads(prev => prev.map(l => {
                if (l.id === leadIdToUpdate) {
                    return {
                        ...l,
                        last_call_outcome: result,
                        metadata: {
                            ...l.metadata,
                            ...(notes ? { last_call_notes: notes } : {})
                        }
                    };
                }
                return l;
            }));

            // Computar nas métricas/relatório do SDR
            await statsAPI.updateActivity('call');

            // Notificar UI externa (ex: dashboard updates)
            onActivity?.('call');
            
            const resultMsg = {
                success: 'Sucesso',
                busy: 'Ocupado',
                voicemail: 'Caixa Postal',
                invalid: 'Inválido',
                reschedule: 'Reagendar',
                'no-answer': 'Não Atendeu',
                connected: 'Contato Realizado',
                not_interested: 'Não Interessado',
                spam: 'Spam/Robô'
            }[result];

            addNotification(`Registro salvo: ${resultMsg}`, 'success');

            // Auto-schedule logic for reschedule or negative outcomes
            if (['busy', 'voicemail', 'reschedule'].includes(result) && targetLead) {
                // Update targetLead with the latest notes before passing to modal
                const updatedTarget = {
                    ...targetLead,
                    last_call_outcome: result,
                    metadata: {
                        ...targetLead.metadata,
                         ...(notes ? { last_call_notes: notes } : {})
                    }
                };
                setCompletedLead(updatedTarget);
                setIsScheduleModalOpen(true);
            }
        } catch (err) {
            console.error('Failed to save call feedback:', err);
            addNotification('Erro ao salvar o registro da ligação.', 'error');
        } finally {
            voip.clearFeedback();
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active } = event;

        const destinationColumnId = overColumnId;
        setOverColumnId(null);
        setActiveId(null);

        if (!destinationColumnId) return;

        const movedLead = leads.find((l) => l.id === active.id);
        const destinationColumn = columns.find(c => c.id === destinationColumnId);

        if (!movedLead || !destinationColumn) return;
        if (movedLead.current_column_id === destinationColumnId) return;

        // ── Column 2: Call — dial immediately (phone already normalized at import) ──
        if (destinationColumn.position === 2) {
            if (voip.isCallActive) {
                addNotification('Já existe uma ligação em andamento. Encerre antes de iniciar outra.', 'warning');
            } else {
                const phones: { label: string; number: string; icon: 'contact' | 'company' }[] = [];
                if (movedLead.phone) phones.push({ label: 'Contato', number: movedLead.phone, icon: 'contact' });
                if (movedLead.metadata?.telefone_empresa) phones.push({ label: 'Empresa', number: movedLead.metadata.telefone_empresa, icon: 'company' });

                if (phones.length === 0) {
                    addNotification(`Lead ${movedLead.full_name} não possui telefone cadastrado.`, 'warning');
                } else {
                    // Restored: Show DialerModal for confirmation
                    setDialerLead(movedLead);
                }
            }
        }

        // ── Column 3: Email ──
        if (destinationColumn.position === 3) {
            if (movedLead.selectedEmailTemplate) {
                addNotification(`Email automatico enviado: "${movedLead.selectedEmailTemplate}" para ${movedLead.full_name}.`, 'success');
            } else {
                addNotification(`Atenção: Nenhum template de Email selecionado para ${movedLead.full_name}.`, 'warning');
            }
            if (onActivity) onActivity('email');
            
            // Add stat counting for email
            await statsAPI.updateActivity('email');
        }

        // ── Column 4: WhatsApp ──
        if (destinationColumn.position === 4) {
            if (movedLead.selectedWhatsAppTemplate) {
                addNotification(`WhatsApp enviado: "${movedLead.selectedWhatsAppTemplate}" para ${movedLead.full_name}.`, 'success');
            } else {
                addNotification(`Atenção: Nenhum template de WhatsApp selecionado para ${movedLead.full_name}.`, 'warning');
            }
            if (onActivity) onActivity('whatsapp');
            
            // Add stat counting for whatsapp
            await statsAPI.updateActivity('whatsapp');
        }

        // ── Column 5: Cadência completa ──
        if (destinationColumn.position === 5) {
            addNotification(`Lead "${movedLead.full_name}" completou o ciclo! 🎉`, 'success');
            if (movedLead?.metadata?.scheduling_rule === 'Editável Pelo SDR') {
                setCompletedLead(movedLead);
                setIsScheduleModalOpen(true);
            } else {
                setCompletedLead(movedLead);
                setIsCycleCompleteOpen(true);
            }
            if (onLeadComplete) onLeadComplete();
        }

        // ── Local UI update (cadence_progress is UI-only, not a real DB column) ──
        let newProgress = movedLead.cadence_progress || 0;
        switch (destinationColumn.position) {
            case 1: newProgress = 0; break;
            case 2: newProgress = 10; break;
            case 3: newProgress = 40; break;
            case 4: newProgress = 70; break;
            case 5: newProgress = 100; break;
        }

        setLeads((prev) =>
            prev.map((l) =>
                l.id === active.id
                    ? { ...l, current_column_id: destinationColumnId, cadence_progress: newProgress }
                    : l
            )
        );

        // ── PERSISTENCE: Skip mock/imported leads (no real UUID in DB) ──
        if (active.id.toString().startsWith('mock-') || active.id.toString().startsWith('import-') || active.id.toString().startsWith('temp-')) {
            return;
        }

        // Only send real DB columns — cadence_progress is computed, NOT a stored column
        leadsAPI.updateLead(active.id as string, {
            current_column_id: destinationColumnId,
        }).catch(err => {
            console.error('Failed to sync lead move:', err);
            addNotification('Falha ao sincronizar movimento com o servidor.', 'error');
        });
    };

    const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

    if (isLoading) {
        return <div className="h-full flex items-center justify-center font-bold text-slate-600">Carregando Board...</div>;
    }

    return (
        <div className="relative h-full flex flex-col gap-6 overflow-hidden">
            {/* Zoom Control Helper (Subtle floating badge) */}
            <div className="absolute top-0 right-0 z-[110] flex items-center gap-2 p-1 bg-white/40 backdrop-blur-md rounded-full border border-white/60 shadow-sm scale-75 origin-right translate-y-[-120%] group-hover:translate-y-0 transition-transform duration-300">
                <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.05))} className="w-6 h-6 flex items-center justify-center hover:bg-black/5 rounded-full text-slate-500 font-bold">-</button>
                <span className="text-[10px] font-black text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => Math.min(1.2, prev + 0.05))} className="w-6 h-6 flex items-center justify-center hover:bg-black/5 rounded-full text-slate-500 font-bold">+</button>
            </div>

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div 
                    className="flex-1 w-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-4"
                    style={{ 
                        perspective: '1000px',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    <div 
                        className="grid grid-cols-5 gap-4 h-full transition-transform duration-500 ease-out"
                        style={{ 
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                            width: `${100 / zoom}%`,
                            minWidth: `${1200 / zoom}px`
                        }}
                    >
                        {columns.slice(0, 5).map((col) => (
                            <div key={col.id} className="flex flex-col min-h-0 h-full">
                                <KanbanColumn
                                    column={col}
                                    leads={leads
                                        .filter((l) => l.current_column_id === col.id)
                                        .sort((a, b) => {
                                            const now = new Date();
                                            const dateA = a.metadata?.next_contact_at ? new Date(a.metadata.next_contact_at) : null;
                                            const dateB = b.metadata?.next_contact_at ? new Date(b.metadata.next_contact_at) : null;

                                            const isPriorityA = dateA && dateA <= now;
                                            const isPriorityB = dateB && dateB <= now;

                                            if (isPriorityA && !isPriorityB) return -1;
                                            if (!isPriorityA && isPriorityB) return 1;

                                            // Sub-sorting by date (soonest at top) if both are priority
                                            if (isPriorityA && isPriorityB && dateA && dateB) {
                                                return dateA.getTime() - dateB.getTime();
                                            }

                                            const timeA = new Date(a.created_at || 0).getTime();
                                            const timeB = new Date(b.created_at || 0).getTime();
                                            return timeB - timeA;
                                        })
                                    }
                                    onCardClick={handleCardClick}
                                    onReturn={(lead) => {
                                        const whatsappCol = columns.find(c => c.position === 4);
                                        if (whatsappCol) {
                                            setLeads(prev => prev.map(l =>
                                                l.id === lead.id ? { ...l, current_column_id: whatsappCol.id, cadence_progress: 70 } : l
                                            ));
                                            
                                            // PERSISTENCE: Sync with DB
                                            leadsAPI.updateLead(lead.id, {
                                                current_column_id: whatsappCol.id
                                            }).catch(err => {
                                                console.error('Failed to sync return move:', err);
                                                addNotification('Falha ao sincronizar retorno com o servidor.', 'error');
                                            });

                                            addNotification(`Lead ${lead.full_name} retornado para WhatsApp.`, 'info');
                                        }
                                    }}
                                    onFinish={(lead) => {
                                        // Open feedback registration screen instead of auto-completing
                                        if (lead.lead_cadence_id) {
                                            setManualFeedbackLead(lead);
                                        } else {
                                            setCompletedLead(lead);
                                            setIsCycleCompleteOpen(true);
                                        }
                                    }}
                                    onSchedule={(lead) => {
                                        setCompletedLead(lead);
                                        setIsScheduleModalOpen(true);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>


                <DragOverlay dropAnimation={dropAnimation}>
                    {activeLead ? (
                        <div style={{ width: '300px', cursor: 'grabbing' }}>
                            <LeadCard 
                                lead={activeLead} 
                                onClick={() => {}} 
                                columnPosition={columns.find(c => c.id === activeLead.current_column_id)?.position}
                                isOverlay
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Modals & Notifications */}
            <LeadDetailsModal
                lead={selectedLead}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpdate={updateLead}
                onSchedule={(lead) => {
                    setIsModalOpen(false); // Can close modal or leave it open underneath
                    setCompletedLead(lead);
                    setIsScheduleModalOpen(true);
                }}
                columnColor={columns.find(c => c.id === selectedLead?.current_column_id)?.color}
            />

            <CycleCompleteModal
                isOpen={isCycleCompleteOpen}
                onClose={() => setIsCycleCompleteOpen(false)}
                lead={completedLead}
                onComplete={async (result, opportunityNotes) => {
                    if (!completedLead) return;
                    try {
                        if (result === 'opportunity') {
                            await aiAPI.exportOpportunity(completedLead, opportunityNotes as string);
                            addNotification('Oportunidade exportada! Redirecionando para Agenda Mattermost...', 'success');
                            
                            // Redireciona para a agenda do Mattermost
                            window.open('https://npx.mattermost.com.br/', '_blank');

                            await leadsAPI.completeCadence(completedLead.id, {
                                final_outcome: 'opportunity',
                                notes: opportunityNotes
                            });
                            
                            setLeads(prev => prev.filter(l => l.id !== completedLead.id));
                            addNotification(`Lead ${completedLead.full_name} qualificado como Oportunidade!`, 'success');
                        } else if (result === 'finished') {
                            if (completedLead.lead_cadence_id) {
                                // Register step to advance cycle/percentage
                                const cadRes = await cadencesAPI.registerStep(completedLead.lead_cadence_id, {
                                    outcome: 'no_answer', // Using 'no_answer' as a generic finalization outcome for the cycle
                                    canal: 'call',
                                    notes: opportunityNotes
                                });

                                if (cadRes.success && cadRes.data.novo_status === 'concluida') {
                                    // 100% completion - finalize lead for good
                                    await leadsAPI.completeCadence(completedLead.id, {
                                        final_outcome: 'completed',
                                        notes: opportunityNotes
                                    });
                                    setLeads(prev => prev.filter(l => l.id !== completedLead.id));
                                    addNotification(`Cadência de ${completedLead.full_name} finalizada 100%!`, 'success');
                                } else {
                                    // Not 100% yet - return to first column ("retorna")
                                    const firstCol = columns.find(c => c.position === 1);
                                    if (firstCol) {
                                        await leadsAPI.moveLead(completedLead.id, firstCol.id, 'Ciclo concluído. Retornando ao início para próximo contato.');
                                        
                                        // Update local state: move to first column and update progress
                                        setLeads(prev => prev.map(l => 
                                            l.id === completedLead.id 
                                                ? { 
                                                    ...l, 
                                                    current_column_id: firstCol.id, 
                                                    cadence_progress: cadRes.data?.next_percentage || l.cadence_progress 
                                                  } 
                                                : l
                                        ));
                                        
                                        addNotification(`Lead ${completedLead.full_name} retornou à fila (${cadRes.data?.next_percentage || 0}%).`, 'info');
                                    }
                                }
                            } else {
                                // Non-cadence lead (e.g. from seeds)
                                await leadsAPI.completeCadence(completedLead.id, {
                                    final_outcome: 'rejected',
                                    notes: opportunityNotes
                                });
                                setLeads(prev => prev.filter(l => l.id !== completedLead.id));
                                addNotification(`Lead ${completedLead.full_name} finalizado sem cadência ativa.`, 'success');
                            }
                        }

                        await statsAPI.updateActivity('cycle_complete');
                    } catch (err) {
                        console.error('Failed to finalize cycle:', err);
                        addNotification('Erro ao processar finalização.', 'error');
                    }
                }}
            />

            <ScheduleCadenceModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                lead={completedLead}
                onSave={async (dateTime, notes, returnToQueue) => {
                    if (!completedLead) return;
                    try {
                        const userStr = localStorage.getItem('user');
                        const sdrId = userStr ? JSON.parse(userStr).id : undefined;

                        // ── If lead is in active cadence, use specialized cadence API ──
                        if (completedLead.lead_cadence_id) {
                            await cadencesAPI.registerStep(completedLead.lead_cadence_id, {
                                outcome: 'reschedule',
                                canal: 'call',
                                notes,
                                retorno_manual_em: dateTime
                            });
                        } else {
                            // Use the standard scheduleNextContact API for non-cadence leads
                            await leadsAPI.scheduleNextContact(completedLead.id, {
                                scheduled_at: dateTime,
                                sdr_id: sdrId,
                                type: 'manual',
                                notes,
                                return_to_queue: returnToQueue
                            });
                        }

                        // Update local state for immediate feedback
                        setLeads(prev => prev.map(l => {
                            if (l.id === completedLead.id) {
                                const baseUpdate = {
                                    ...l,
                                    metadata: {
                                        ...l.metadata,
                                        next_contact_at: dateTime,
                                        last_schedule_notes: notes
                                    },
                                    cadence_progress: 0
                                };

                                // If returned to queue, we normally move it to the first column (pos 1)
                                if (returnToQueue && columns.length > 0) {
                                    const firstCol = [...columns].sort((a, b) => a.position - b.position)[0];
                                    if (firstCol) {
                                        baseUpdate.current_column_id = firstCol.id;
                                    }
                                }
                                return baseUpdate;
                            }
                            return l;
                        }));

                        addNotification(`Próxima tentativa agendada para: ${new Date(dateTime).toLocaleString('pt-BR')}`, 'success');
                        setIsScheduleModalOpen(false);
                    } catch (err) {
                        console.error('Ops! Falha ao agendar no backend:', err);
                        addNotification('Erro ao agendar contato no servidor.', 'error');
                    }
                }}
            />

            {/* Dialer Modal — dual phone number selection */}
            <DialerModal
                isOpen={dialerLead !== null}
                onClose={() => setDialerLead(null)}
                leadId={dialerLead?.id || ''}
                leadName={dialerLead?.full_name || ''}
                phones={[
                    ...(dialerLead?.phone ? [{ label: 'Contato', number: dialerLead.phone, icon: 'contact' as const }] : []),
                    ...(dialerLead?.metadata?.telefone_empresa ? [{ label: 'Empresa', number: dialerLead.metadata.telefone_empresa, icon: 'company' as const }] : []),
                ]}
                onCallInitiated={() => {
                    if (dialerLead) {
                        addNotification(`📞 Ligando para ${dialerLead.full_name}...`, 'info');
                    }
                }}
            />

            {/* Post-Call Feedback Modal */}
            <CallFeedbackModal
                isOpen={!!voip.callRequiresFeedback || !!manualFeedbackLead}
                callData={voip.callRequiresFeedback || (manualFeedbackLead ? { 
                    leadId: manualFeedbackLead.id, 
                    leadName: manualFeedbackLead.full_name,
                    phoneNumber: manualFeedbackLead.phone || '',
                    startedAt: new Date()
                } : null)}
                onResult={async (result, notes) => {
                    if (voip.callRequiresFeedback) {
                        return handleCallFeedback(result, notes);
                    }
                    if (manualFeedbackLead) {
                        try {
                            const outcomeMap: any = {
                                'success': 'success',
                                'busy': 'busy',
                                'voicemail': 'voicemail',
                                'invalid': 'invalid_number',
                                'no-answer': 'no_answer',
                                'reschedule': 'reschedule'
                            };
                            const res = await cadencesAPI.registerStep(manualFeedbackLead.lead_cadence_id!, {
                                outcome: outcomeMap[result] || 'success',
                                canal: 'call', // Treat manual completions as calls for now if using this modal
                                notes: notes || 'Conclusão manual via Kanban'
                            });

                            if (res.success && res.data.novo_status === 'concluida') {
                                setCompletedLead(manualFeedbackLead);
                                setIsCycleCompleteOpen(true);
                            }
                            
                            setLeads(prev => prev.filter(l => l.id !== manualFeedbackLead.id));
                            addNotification(`Lead ${manualFeedbackLead.full_name} registrado com sucesso! 🏆`, 'success');
                            if (onLeadComplete) onLeadComplete();
                        } catch (err) {
                            console.error('Failed to register cadence finish:', err);
                            addNotification('Erro ao registrar conclusão da cadência.', 'error');
                        } finally {
                            setManualFeedbackLead(null);
                        }
                    }
                }}
                onClose={() => { voip.clearFeedback(); setManualFeedbackLead(null); }}
            />

            {/* Schedule Preview Modal */}
            <SchedulePreviewModal
                isOpen={!!showSchedulePreview}
                onClose={onCloseSchedulePreview || (() => { })}
                leads={leads}
                onLeadClick={(lead) => {
                    onCloseSchedulePreview?.();
                    handleCardClick(lead);
                }}
            />


            <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
                <AnimatePresence>
                    {notifications.map(n => (
                        <NotificationToast
                            key={n.id}
                            id={n.id}
                            type={n.type}
                            message={n.message}
                            onClose={removeNotification}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
