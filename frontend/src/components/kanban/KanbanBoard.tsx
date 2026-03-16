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
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useState, useCallback, useEffect } from 'react';
import { leadsAPI, aiAPI } from '../../lib/api';
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
    onCloseSchedulePreview
}: {
    onLeadComplete?: () => void;
    onActivity?: (type: 'call' | 'email' | 'whatsapp') => void;
    onScheduleCountChange?: (count: number) => void;
    showSchedulePreview?: boolean;
    onCloseSchedulePreview?: () => void;
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
    const voip = useVoip();

    useEffect(() => {
        if (leads.length > 0 && onScheduleCountChange) {
            const count = leads.filter(l => Boolean(l.metadata?.next_contact_at)).length;
            onScheduleCountChange(count);
        }
    }, [leads, onScheduleCountChange]);

    useEffect(() => {
        const fetchBoardData = async () => {
            try {
                setIsLoading(true);
                const [colsRes, leadsRes] = await Promise.all([
                    leadsAPI.getColumns(),
                    // SDRs only see their own leads; managers see all
                    leadsAPI.getSegments('qualification_status', 'qualified', 
                        user?.role === 'sdr' ? user?.id : undefined
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
    }, [user?.id]);

    const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications(prev => [...prev, { id, type, message }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

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

    const handleCallFeedback = async (result: 'success' | 'busy' | 'voicemail' | 'invalid' | 'reschedule' | 'no-answer', notes?: string) => {
        if (!voip.callRequiresFeedback) return;
        const leadIdToUpdate = voip.callRequiresFeedback.leadId;
        const targetLead = leads.find(l => l.id === leadIdToUpdate);

        try {
            // Registrar desfecho da ligação e anotações
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
                'no-answer': 'Não Atendeu'
            }[result];

            addNotification(`Registro salvo: ${resultMsg}`, 'success');

            // Auto-schedule logic for negative outcomes
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
        if (active.id.toString().startsWith('mock-') || active.id.toString().startsWith('import-')) {
            console.log(`[Kanban] Skipping DB sync for local lead: ${active.id}`);
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
        <div className="relative h-full flex flex-col gap-6">
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-5 gap-4 h-full">
                    {columns.map((col) => (
                        <div key={col.id} className="flex flex-col min-h-0">
                            <KanbanColumn
                                column={col}
                                leads={leads.filter((l) => l.current_column_id === col.id)}
                                onCardClick={handleCardClick}
                                onReturn={(lead) => {
                                    const whatsappCol = columns.find(c => c.position === 4);
                                    if (whatsappCol) {
                                        setLeads(prev => prev.map(l =>
                                            l.id === lead.id ? { ...l, current_column_id: whatsappCol.id, cadence_progress: 70 } : l
                                        ));
                                        addNotification(`Lead ${lead.full_name} retornado para WhatsApp.`, 'info');
                                    }
                                }}
                                onFinish={(lead) => {
                                    setLeads(prev => prev.filter(l => l.id !== lead.id));
                                    addNotification(`Lead ${lead.full_name} encerrado com sucesso! 🏆`, 'success');
                                    if (onLeadComplete) onLeadComplete();
                                }}
                                onSchedule={(lead) => {
                                    setCompletedLead(lead);
                                    setIsScheduleModalOpen(true);
                                }}
                            />
                        </div>
                    ))}
                </div>

                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                    {activeLead ? (
                        <div className="transform rotate-2 scale-[1.03] opacity-90 cursor-grabbing">
                            <LeadCard lead={activeLead} />
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
                onResult={async (result, opportunityNotes) => {
                    if (!completedLead) return;
                    try {
                        if (result === 'opportunity') {
                            await aiAPI.exportOpportunity(completedLead, opportunityNotes as string);
                            addNotification('Oportunidade exportada para o Mattermost!', 'success');
                        }

                        // Use the new completeCadence API
                        await leadsAPI.completeCadence(completedLead.id, {
                            final_outcome: result,
                            notes: opportunityNotes
                        });
                        
                        await statsAPI.updateActivity('cycle_complete');

                        setLeads(prev => prev.filter(l => l.id !== completedLead.id));
                        addNotification(`Lead ${completedLead.full_name} finalizado: ${result === 'opportunity' ? 'Oportunidade' : result}`, 'success');
                    } catch (err) {
                        console.error('Failed to finalize cycle:', err);
                        addNotification('Erro ao salvar resultado do ciclo.', 'error');
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

                        // Use the new scheduleNextContact API for better audit trail
                        await leadsAPI.scheduleNextContact(completedLead.id, {
                            scheduled_at: dateTime,
                            sdr_id: sdrId,
                            type: 'manual',
                            notes,
                            return_to_queue: returnToQueue
                        });

                        // Update local state
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
                isOpen={!!voip.callRequiresFeedback}
                callData={voip.callRequiresFeedback}
                onResult={handleCallFeedback}
                onClose={voip.clearFeedback}
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
