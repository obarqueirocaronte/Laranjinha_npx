export interface Lead {
    id: string;
    full_name: string;
    company_name: string;
    job_title?: string;
    email: string;
    phone?: string;
    current_column_id: string;
    assigned_sdr_id: string;
    quality_score?: number;
    cadence_progress?: number; // 0-100
    cadence_status?: string; // e.g., "active", "completed", "paused"
    selectedEmailTemplate?: string;
    selectedWhatsAppTemplate?: string;
    qualification_status?: 'pending' | 'qualified' | 'disqualified';
    cadence_name?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    created_at: string;
}

export interface PipelineColumn {
    id: string;
    name: string;
    position: number;
    color: string;
    lead_count?: number;
}
