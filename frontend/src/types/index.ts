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
    metadata?: {
        tags?: string[];
        profile_picture_url?: string;
        phone_work?: string;
        next_contact_at?: string;
        next_contact_type?: string;
        last_schedule_notes?: string;
        [key: string]: any;
    };
    sdr_profile_picture_url?: string | null;
    lead_cadence_id?: string;
    cadence_step?: number;
    cadence_max_steps?: number;
    created_at: string;
}

export interface PipelineColumn {
    id: string;
    name: string;
    position: number;
    color: string;
    lead_count?: number;
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role?: 'manager' | 'sdr';
    status?: string;
    profile_picture_url?: string | null;
}
