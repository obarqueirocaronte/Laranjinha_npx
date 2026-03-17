import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileText,
  CheckCircle2,
  ArrowRight,
  Table as TableIcon,
  ChevronRight,
  AlertCircle,
  Database,
  Tag,
  ShieldCheck,
  Bell,
  X,
  Sparkles,
  GripVertical,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { leadsAPI, notificationsAPI, aiAPI } from "../../lib/api";
import { LeadAssignmentModal } from "./LeadAssignmentModal";
import { LeadCard } from "../kanban/LeadCard";
import type { Lead } from "../../types";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";

const SYSTEM_FIELDS = [
  { id: "cnpj", label: "CNPJ" },
  { id: "company_name", label: "Razão Social" },
  { id: "display_name", label: "Nome Fantasia" },
  { id: "full_name", label: "Nome do Contato" },
  { id: "email", label: "E-mail do Contato" },
  { id: "phone", label: "Telefone" },
  { id: "job_title", label: "Cargo" },
  { id: "website", label: "Website / URL" },
  { id: "location", label: "🗺️ Localização (Endereço Completo)" },
  { id: "city", label: "Cidade" },
  { id: "state", label: "Estado" },
  { id: "employee_count", label: "Número de Funcionários" },
  { id: "linkedin_url", label: "LinkedIn URL" },
  { id: "tag_value", label: "🏷️ Tag (Valor vira Tag no Card Kanban)" },
  { id: "custom_field", label: "+ Criar Campo Customizado (Salva no Lead)" },
  { id: "ignore", label: "Ignorar Coluna" },
];

interface LeadZoneProps {
  onClose: () => void;
}

type Step =
  | "upload"
  | "mapping"
  | "sanitization"
  | "automation"
  | "summary"
  | "pending";

const DraggableColumn = ({ header }: { header: string }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `col-${header}`,
    data: { header, type: "column" },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing transition-all hover:border-orange-200 group relative overflow-hidden",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <GripVertical size={14} className="text-slate-300 group-hover:text-orange-400 shrink-0" />
        <span className="text-[12px] font-bold text-slate-700 truncate">{header}</span>
      </div>
      <ArrowRight size={12} className="text-slate-200 group-hover:text-orange-300" />
    </div>
  );
};

const DroppableField = ({ 
  field, 
  mappedHeader, 
  onDrop, 
  availableHeaders,
  isAIStructuring 
}: { 
  field: any; 
  mappedHeader: string | null; 
  onDrop: (header: string, fieldId: string) => void;
  availableHeaders: string[];
  isAIStructuring: boolean;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `field-${field.id}`,
    data: { fieldId: field.id },
  });

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-4 rounded-[24px] border transition-all duration-300 relative group/target",
        isOver ? "bg-orange-50/50 border-orange-300 scale-[1.02] shadow-lg" : "bg-white/40 border-slate-100",
        mappedHeader ? "border-emerald-200 bg-emerald-50/10" : "border-dashed",
        isAIStructuring && "animate-pulse border-orange-200"
      )}
    >
      {isAIStructuring && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-100/30 to-transparent -translate-x-full"
          animate={{ translateX: ["100%", "-100%"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            mappedHeader ? "bg-emerald-400 animate-pulse" : "bg-slate-200"
          )} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {mappedHeader && (
            <button
              onClick={() => onDrop("", field.id)}
              className="p-1 text-slate-300 hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
          >
            <ChevronDown size={12} className={cn("transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      <div className="min-h-[40px] flex items-center justify-center">
        {mappedHeader ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full p-2.5 rounded-xl bg-white border border-emerald-100 shadow-sm flex items-center justify-between"
          >
            <span className="text-[12px] font-black text-emerald-700 truncate">{mappedHeader}</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </motion.div>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium italic">Arraste aqui ou selecione</span>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 overflow-y-auto max-h-[160px] custom-scrollbar"
          >
            <div className="flex flex-col gap-1">
               {availableHeaders.length === 0 && <p className="text-[10px] text-slate-400 p-2 italic text-center">Nenhuma coluna livre</p>}
               {availableHeaders.map(h => (
                 <button
                   key={h}
                   onClick={() => {
                     onDrop(h, field.id);
                     setIsOpen(false);
                   }}
                   className="flex items-center justify-between p-2 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-all text-left"
                 >
                   {h}
                   <Check size={10} className="opacity-0 group-hover:opacity-100" />
                 </button>
               ))}
               <button
                  onClick={() => {
                    onDrop("", field.id);
                    setIsOpen(false);
                  }}
                  className="p-2 rounded-xl text-[11px] font-bold text-red-400 hover:bg-red-50 transition-all text-left"
               >
                 Limpar Mapeamento
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LeadZone: React.FC<LeadZoneProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [excludedRows, setExcludedRows] = useState<number[]>([]);
  const [mappingModalOpen, setMappingModalOpen] = useState<string | null>(null);
  const [isCadenceModalOpen, setIsCadenceModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.id.startsWith("field-")) {
      const fieldId = over.data.current.fieldId;
      const header = active.data.current.header;
      onHandleDrop(header, fieldId);
    }
  };

  const onHandleDrop = (header: string, fieldId: string) => {
    setFieldMapping((prev) => {
      const next = { ...prev };
      // If we're removing a mapping (empty header)
      if (!header) {
        Object.keys(next).forEach(h => {
          if (next[h] === fieldId) delete next[h];
        });
        return next;
      }
      // Clear any existing mapping for this field
      Object.keys(next).forEach(h => {
        if (next[h] === fieldId) delete next[h];
      });
      // Set new mapping
      next[header] = fieldId;
      return next;
    });
  };

  const getMappedHeaderForField = (fieldId: string) => {
    const entry = Object.entries(fieldMapping).find(([_, id]) => id === fieldId);
    return entry ? entry[0] : null;
  };

  const [globalTags, setGlobalTags] = useState<string[]>(["Importação"]);
  const [newTag, setNewTag] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [pendingLeads, setPendingLeads] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedLeadForAssignment, setSelectedLeadForAssignment] = useState<any | null>(null);
  const [isAIStructuring, setIsAIStructuring] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});

  const [previewModel, setPreviewModel] = useState<string>("MODERN_FULL");

  const [selectedCadence, setSelectedCadence] = useState<string>("Sem Cadência");
  const availableCadences = [
    "Sem Cadência",
    "Fechamento 3,3,1",
    "Fluxo Padrão - 5 Touchpoints",
    "Nurturing Lento",
  ];

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [leadsRes, notifRes] = await Promise.all([
          leadsAPI.getSegments("qualification_status", "pending"),
          notificationsAPI.getNotifications(),
        ]);
        setPendingLeads(leadsRes.data);
        if (notifRes.success) setNotifications(notifRes.data);
      } catch (err) {
        console.error("Failed to fetch initial LeadZone data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);

    const processData = (data: any[]) => {
      if (!data || data.length === 0) {
        alert("O arquivo parece estar vazio ou não foi lido corretamente.");
        setFileName(null);
        return;
      }

      const firstRow = data[0] || {};
      // max 7 cols
      const headers = Object.keys(firstRow).slice(0, 7);
      const mapping: Record<string, string> = {};

      headers.forEach((h) => {
        const lower = h.toLowerCase().trim();
        // Ignore specific control columns usually found in CRMs
        if (lower === "id" || lower.includes("criado em") || lower.includes("created")) mapping[h] = "ignore";
        else if (lower.includes("cnpj")) mapping[h] = "cnpj";
        else if (
          lower.includes("razão") ||
          lower.includes("razao") ||
          lower.includes("empresa") ||
          lower.includes("company") ||
          lower.includes("organização") ||
          lower.includes("organizacao")
        ) {
          if (lower.includes("fantasia")) mapping[h] = "display_name";
          else mapping[h] = "company_name";
        }
        else if (lower.includes("fantasia")) mapping[h] = "display_name";
        else if (
          lower.includes("email") ||
          lower.includes("e-mail") ||
          lower.includes("e_mail") ||
          lower.includes("correio")
        )
          mapping[h] = "email";
        else if (
          lower.includes("telefone") ||
          lower.includes("phone") ||
          lower.includes("celular") ||
          lower.includes("fone") ||
          lower.includes("whatsapp") ||
          lower.includes("whats") ||
          lower.includes("contato_tel")
        )
          mapping[h] = "phone";
        else if (
          lower.includes("cargo") ||
          lower.includes("title") ||
          lower.includes("função") ||
          lower.includes("funcao") ||
          lower.includes("papel") ||
          lower.includes("role")
        )
          mapping[h] = "job_title";
        else if (lower.includes("linkedin")) mapping[h] = "linkedin_url";
        else if (
          lower.includes("nome") ||
          lower.includes("name") ||
          lower.includes("contato") ||
          lower.includes("first_name") ||
          lower.includes("last_name")
        )
          mapping[h] = "full_name";
        else if (
          lower.includes("func") ||
          lower.includes("empregados") ||
          lower.includes("tamanho") ||
          lower.includes("size") ||
          lower.includes("funcionários")
        )
          mapping[h] = "employee_count";
        // Estado e Cidade viram tags automaticamente
        else if (
          lower.includes("estado") ||
          lower === "uf" ||
          lower.includes("state") ||
          lower.includes("cidade") ||
          lower.includes("city") ||
          lower.includes("municipio") ||
          lower.includes("município") ||
          lower.includes("região") ||
          lower.includes("regiao") ||
          lower.includes("region")
        )
          mapping[h] = "tag_value";
        // Anything unrecognized becomes ignored (stay as free columns in UI)
        else mapping[h] = "ignore";
      });

      setParsedHeaders(headers);
      setFieldMapping(mapping);

      // _originalIndex keeps track for exclusion
      const rowsWithId = data.map((r, i) => ({ ...r, _originalIndex: i }));
      setParsedData(rowsWithId);
      setExcludedRows([]);
      setCurrentStep("mapping");
    };

    const ext = file.name.toLowerCase();
    if (ext.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processData(results.data),
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("Erro ao processar o arquivo CSV.");
        },
      });
    } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".numbers")) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        processData(data);
      } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Erro ao processar o arquivo de planilha.");
      }
    } else {
      alert("Formato de arquivo não suportado. Envie CSV ou Excel.");
    }
  };

  const handleAIStructure = async () => {
    if (parsedData.length === 0) return;
    setIsAIStructuring(true);
    try {
      // Send a sample of leads for AI analysis
      const sampleLeads = parsedData.slice(0, 15).map(r => {
        const lead: any = {};
        parsedHeaders.forEach(h => {
          const mapped = fieldMapping[h];
          if (mapped && mapped !== 'ignore') lead[mapped] = r[h];
          else lead[h] = r[h]; // raw data
        });
        return lead;
      });

      const response = await aiAPI.structureLeads(sampleLeads);
      if (response && response.success && response.data) {
        if (response.data.leads) {
          const suggestions: Record<string, string> = {};
          response.data.leads.forEach((item: any, idx: number) => {
            if (item.suggested_model) {
              suggestions[idx] = item.suggested_model;
            }
          });
          setAiSuggestions(suggestions);
        }
        
        if (response.data.mappings) {
          setFieldMapping(prev => ({
            ...prev,
            ...response.data.mappings
          }));
        }
      }
    } catch (err) {
      console.error("AI Structuring failed:", err);
      alert("Falha na estruturação por IA. Verifique sua chave API.");
    } finally {
      setIsAIStructuring(false);
    }
  };

  const generatePreviewLead = (): Lead | null => {
    if (parsedData.length === 0) return null;
    const firstRow = parsedData.find((r) => !excludedRows.includes(r._originalIndex)) || parsedData[0];
    const previewLead: any = { id: "preview-123", metadata: { card_model: previewModel } };

    parsedHeaders.forEach((header) => {
      const mappedField = fieldMapping[header];
      if (!mappedField || mappedField === "ignore") return;

      if (mappedField === "metadata" || mappedField === "custom_field") {
        const cleanKey = header
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        if (cleanKey) previewLead.metadata[cleanKey] = firstRow[header];
      } else {
        previewLead[mappedField] = firstRow[header];
      }
    });

    if (previewLead.display_name && !previewLead.company_name)
      previewLead.company_name = previewLead.display_name;
    if (!previewLead.company_name) previewLead.company_name = "Empresa Desconhecida";
    if (!previewLead.full_name) previewLead.full_name = previewLead.company_name;
    if (!previewLead.email) previewLead.email = `sem_email_preview@import.csv`;

    previewLead.tags = ["Preview", ...globalTags];
    return previewLead as Lead;
  };

  const fetchPendingLeads = async () => {
    setIsLoadingPending(true);
    try {
      const [leadsRes, notifRes] = await Promise.all([
        leadsAPI.getSegments("qualification_status", "pending"),
        notificationsAPI.getNotifications(),
      ]);

      setPendingLeads(leadsRes.data);
      if (notifRes.success) setNotifications(notifRes.data);

      setCurrentStep("pending");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const mappedLeads = parsedData
        .filter((row) => !excludedRows.includes(row._originalIndex))
        .map((row) => {
          const lead: any = { metadata: {} };

          parsedHeaders.forEach((header) => {
            const mappedField = fieldMapping[header];
            if (!mappedField || mappedField === "ignore") return;

            if (mappedField === "tag_value") {
              // Estado, Cidade, UF, etc. → push value as a tag
              const tagVal = String(row[header] || "").trim();
              if (tagVal) {
                lead._tagValues = lead._tagValues || [];
                lead._tagValues.push(tagVal);
              }
            } else if (mappedField === "metadata" || mappedField === "custom_field") {
              // Clean header name for metadata key (e.g., "Cidade Origem" -> "cidade_origem")
              const cleanKey = header
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
              if (cleanKey) lead.metadata[cleanKey] = row[header];
            } else {
              lead[mappedField] = row[header];
            }
          });

          // Match UI chosen names to database exact columns
          // Normalização para os nomes que o Backend espera (leads.service.js)
          if (lead.display_name && !lead.company_name)
            lead.company_name = lead.display_name;

          // Providenciar fallbacks para evitar erros de restrição NOT NULL no Banco
          if (!lead.company_name) lead.company_name = "Empresa Desconhecida";
          if (!lead.full_name) lead.full_name = lead.company_name;

          if (!lead.email)
            lead.email = `sem_email_${Math.random().toString(36).substr(2, 5)}@import.csv`;

          // Merge global tags + estado/cidade tag values
          const extraTags: string[] = lead._tagValues || [];
          delete lead._tagValues;
          lead.tags = [...globalTags, ...extraTags];
          lead.metadata.tags = [...globalTags, ...extraTags];
          lead.qualification_status = "pending";
          if (selectedCadence !== "Sem Cadência") {
            lead.cadence_name = selectedCadence;
            lead.tags.push(selectedCadence);
            lead.metadata.tags.push(selectedCadence);
          }

          const suggestedModel = aiSuggestions[row._originalIndex];
          if (suggestedModel) {
            lead.metadata.card_model = suggestedModel;
          } else if (previewModel !== "MODERN_FULL") {
             lead.metadata.card_model = previewModel;
          }

          return lead;
        });

      if (mappedLeads.length === 0) {
        alert("Nenhum lead selecionado para importação.");
        setIsImporting(false);
        return;
      }

      // ── Batch Import ──
      // Note: Phone normalization and AI structuring is now handled more efficiently 
      // by the backend leadsService.createLeadsBatch.
      const response = await leadsAPI.batchCreateLeads(mappedLeads);

      if (response && response.success) {
        setImportResult(response.data);
        setCurrentStep("summary");
      } else {
        throw new Error(response?.message || "Invalid API response");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Erro ao importar leads. Verifique o console.");
    } finally {
      setIsImporting(false);
    }
  };

  const steps = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "mapping", label: "Mapeamento", icon: TableIcon },
    { id: "sanitization", label: "Higienização", icon: ShieldCheck },
    { id: "automation", label: "Automação", icon: Tag },
    { id: "summary", label: "Resumo", icon: CheckCircle2 },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case "upload":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 px-6"
          >
            <div
              className={cn(
                "w-full max-w-xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 shadow-xl relative overflow-hidden",
                isDragging
                  ? "border-orange-500 bg-orange-50/20"
                  : "border-slate-200 bg-gradient-soft border border-orange-100 shadow-glass hover:border-slate-300",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <div className="w-20 h-20 rounded-3xl bg-white/40 shadow-glass border border-orange-200/50 flex items-center justify-center mb-6 z-10">
                <Upload
                  className="text-slate-900"
                  size={32}
                  strokeWidth={2.5}
                />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 z-10">
                {fileName ? fileName : "Upload da Base de Leads"}
              </h3>
              <p className="text-slate-600 text-sm text-center max-w-md px-8 mb-8 z-10">
                Arraste seu arquivo .csv ou .xlsx aqui. <br />
                Nós ajudaremos a mapear as colunas para o CRM.
              </p>

              {fileName ? (
                <button
                  onClick={() => setCurrentStep("mapping")}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl z-10"
                >
                  Ir para Mapeamento <ArrowRight size={18} />
                </button>
              ) : (
                <div className="flex flex-col gap-4 w-full px-8 z-10">
                  <div className="flex gap-4 justify-center">
                    <label className="cursor-pointer px-8 py-3 bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-700 rounded-2xl font-bold hover:bg-orange-50 transition-all shadow-sm font-[Comfortaa]">
                      Selecionar Arquivo
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                  </div>
                  <a
                    href="/modelo_leads.csv"
                    download
                    className="text-xs font-bold text-slate-600 hover:text-slate-600 flex items-center justify-center gap-1 transition-colors mt-2"
                  >
                    <FileText size={12} />
                    Baixar Planilha Exemplo (.csv)
                  </a>
                </div>
              )}
            </div>

            <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-xl">
              <div className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-glass flex gap-4 backdrop-blur-md">
                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Deduplicação
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    O sistema usa automaticamente o **CNPJ** como chave primária
                    para evitar duplicatas.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-glass flex gap-4 backdrop-blur-md">
                <Database className="text-[#FF6B00] shrink-0" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Estrutura Flexível
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Aceitamos XLSX e CSV. Colunas não-padrão são salvas como
                    metadados estruturados.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case "mapping":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-8 flex flex-col h-[calc(100vh-200px)] max-w-full mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0 pt-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200/50">
                  <TableIcon size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                    Preview & Mapeamento Inteligente
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Mapeie as colunas da sua planilha para os componentes do sistema
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <div className="px-4 py-2 bg-white/40 border border-slate-200/80 shadow-glass rounded-xl flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Detectados</span>
                    <span className="text-sm font-black text-slate-900">{parsedData.length}</span>
                 </div>
                 <button
                    onClick={handleAIStructure}
                    disabled={isAIStructuring}
                    className={cn(
                      "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95",
                      isAIStructuring
                        ? "bg-slate-100 text-slate-400 cursor-wait"
                        : "bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white hover:shadow-orange-200 hover:-translate-y-0.5"
                    )}
                  >
                    {isAIStructuring ? (
                      <div className="flex items-center gap-2">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Sparkles size={14} />
                        </motion.div>
                        Processando...
                      </div>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Classificar com IA
                      </>
                    )}
                  </button>
              </div>
            </div>

            {/* Main 3-Column Layout with DND Context */}
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 overflow-hidden flex-1 pb-4">
                
                {/* 1. Fluid Mapping Interface (Left) */}
                <div className="w-[340px] shrink-0 flex flex-col gap-4">
                  
                  {/* Draggable Source: Excel Columns */}
                  <div className="h-[240px] bg-white/40 border border-white/60 shadow-glass rounded-[32px] overflow-hidden flex flex-col backdrop-blur-md">
                    <div className="p-5 border-b border-orange-100/40 bg-white/20 shrink-0 flex items-center justify-between">
                      <h4 className="font-black text-slate-800 text-[13px] tracking-tight uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        Planilha
                      </h4>
                      <div className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B00] text-[9px] font-black">
                        {parsedHeaders.filter(h => !Object.keys(fieldMapping).includes(h) || fieldMapping[h] === "ignore").length} LIVRES
                      </div>
                    </div>
                    <div className="overflow-y-auto p-4 custom-scrollbar flex-1">
                      <div className="flex flex-col gap-2">
                        {parsedHeaders.map((header) => {
                          const isMapped = fieldMapping[header] && fieldMapping[header] !== "ignore";
                          if (isMapped) return null;
                          return <DraggableColumn key={header} header={header} />;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Droppable Targets: System Fields */}
                  <div className="flex-1 bg-white/40 border border-white/60 shadow-glass rounded-[32px] overflow-hidden flex flex-col backdrop-blur-md">
                    <div className="p-5 border-b border-orange-100/40 bg-white/20 shrink-0 flex items-center justify-between">
                      <h4 className="font-black text-slate-800 text-[13px] tracking-tight uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        Alvos
                      </h4>
                      <Database size={14} className="text-slate-300" />
                    </div>
                    <div className="overflow-y-auto p-4 custom-scrollbar flex-1">
                      <div className="grid grid-cols-1 gap-2.5">
                        {SYSTEM_FIELDS.filter(f => f.id !== "ignore" && f.id !== "custom_field").map((field) => (
                          <DroppableField 
                            key={field.id} 
                            field={field} 
                            mappedHeader={getMappedHeaderForField(field.id)}
                            onDrop={onHandleDrop}
                            isAIStructuring={isAIStructuring}
                            availableHeaders={parsedHeaders.filter(h => !Object.keys(fieldMapping).includes(h) || fieldMapping[h] === "ignore")}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <DragOverlay>
                  {activeId ? (
                    <div className="p-3 rounded-2xl bg-white border-2 border-orange-400 shadow-2xl flex items-center justify-between w-[280px] cursor-grabbing">
                      <div className="flex items-center gap-2">
                        <ChevronRight size={14} className="text-orange-400" />
                        <span className="text-[12px] font-bold text-slate-800">{activeId.replace("col-", "")}</span>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>

                {/* 2. Data Table (Middle) */}
                <div className="flex-1 bg-white/40 border border-white/60 shadow-glass rounded-[32px] overflow-hidden flex flex-col backdrop-blur-md">
                  <div className="p-6 border-b border-orange-100/40 bg-white/20 shrink-0 flex justify-between items-center">
                    <div>
                      <h5 className="font-black text-slate-800 text-sm tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                        Preview dos Dados
                      </h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Primeiros registros filtrados</p>
                    </div>
                    <div className="px-3 py-1 bg-white/80 border border-slate-100 shadow-sm rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      {parsedData.length - excludedRows.length} SELECIONADOS
                    </div>
                  </div>
                  
                  <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
                      <thead className="bg-[#fcf8f4]/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                          <th className="p-4 w-12 text-center border-b border-slate-100">
                             <input 
                              type="checkbox" 
                              checked={excludedRows.length === 0}
                              onChange={(e) => setExcludedRows(e.target.checked ? [] : parsedData.map(r => r._originalIndex))}
                              className="w-4 h-4 rounded border-slate-200 text-[#FF6B00] focus:ring-[#FF6B00]"
                             />
                          </th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">IA Model</th>
                          {parsedHeaders.map((h) => (
                            <th
                              key={h}
                              className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 border-l border-slate-50 min-w-[120px]"
                            >
                              {fieldMapping[h] && fieldMapping[h] !== "ignore" ? (
                                SYSTEM_FIELDS.find((f) => f.id === fieldMapping[h])?.label || h
                              ) : (
                                <span className="opacity-30">IGNORADO</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {parsedData.slice(0, 10).map((row) => {
                          const isExcluded = excludedRows.includes(row._originalIndex);
                          const suggestedModel = aiSuggestions[row._originalIndex];

                          return (
                            <tr
                              key={row._originalIndex}
                              className={cn(
                                "transition-all",
                                isExcluded ? "bg-slate-50/30 opacity-60" : "hover:bg-white group"
                              )}
                            >
                              <td className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setExcludedRows((p) => p.filter((id) => id !== row._originalIndex));
                                    else
                                      setExcludedRows((p) => [...p, row._originalIndex]);
                                  }}
                                  className="w-4 h-4 rounded border-slate-200 text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-2">
                                {suggestedModel ? (
                                  <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                                    {suggestedModel}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-300 italic">-</span>
                                )}
                              </td>
                              {parsedHeaders.map((h) => (
                                <td
                                  key={h}
                                  className={cn(
                                    "px-6 py-4 text-[11px] font-medium border-l border-slate-50/50 truncate max-w-[200px]",
                                    isExcluded ? "text-slate-400" : "text-slate-600"
                                  )}
                                >
                                  {row[h] || "-"}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Card Preview (Right) */}
                <div className="w-[300px] shrink-0 flex flex-col gap-4">
                  <div className="flex-1 bg-white/40 border border-white/60 shadow-glass rounded-[32px] overflow-hidden flex flex-col backdrop-blur-md">
                    <div className="p-6 border-b border-orange-100/40 bg-white/20 shrink-0 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[#FF6B00]" />
                        <h4 className="font-black text-slate-800 text-sm tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
                          Preview
                        </h4>
                      </div>
                      
                      <select
                        value={previewModel}
                        onChange={(e) => setPreviewModel(e.target.value)}
                        className="appearance-none pr-7 pl-3 py-1.5 text-[9px] font-black uppercase tracking-wider bg-white/80 border border-slate-200 rounded-xl focus:ring-[#FF6B00] focus:border-[#FF6B00] cursor-pointer shadow-sm outline-none"
                      >
                        <option value="MODERN_FULL">VISUAL: REFERÊNCIA</option>
                        <option value="MODERN_COMPACT">VISUAL: DENSO</option>
                        <option value="MODERN_MINIMAL">VISUAL: MINIMALISTA</option>
                        <option value="MODERN_ACTION">VISUAL: PRODUTIVO</option>
                      </select>
                    </div>

                    <div className="flex-1 p-4 flex flex-col items-center justify-start bg-[url('/bg-dots.png')] bg-repeat">
                      <div className="w-full relative origin-top scale-[0.75]">
                        {generatePreviewLead() && (
                          <LeadCard lead={generatePreviewLead()!} />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Final Action Button Container */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setCurrentStep("sanitization")}
                      className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black text-sm shadow-xl hover:shadow-2xl hover:translate-y-[-2px] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      Processar Leads <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => setCurrentStep("upload")}
                      className="w-full py-3 bg-white/40 border border-white/60 text-slate-500 rounded-[20px] font-bold text-xs hover:bg-white hover:text-slate-700 transition-all text-center"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </DndContext>

            {/* Expandable Modal for Selection (Manual fallback) */}
            <AnimatePresence>
              {mappingModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="bg-gradient-soft border border-orange-100 shadow-glass rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
                  >
                    <button
                      onClick={() => setMappingModalOpen(null)}
                      className="absolute top-4 right-4 text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
                    >
                      <X size={16} />
                    </button>
                      {mappingModalOpen && SYSTEM_FIELDS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setFieldMapping((prev) => ({ ...prev, [mappingModalOpen]: f.id }));
                            setMappingModalOpen(null);
                          }}
                          className="flex items-center justify-between w-full p-3 rounded-xl text-xs font-bold bg-white/40 border border-slate-100 hover:border-orange-200 hover:bg-white transition-all mb-2"
                        >
                          {f.label}
                        </button>
                      ))}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        );

      case "sanitization":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 max-w-4xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">
              Higienização e Tratamento de Dados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Normalização de Caixa",
                  desc: 'Converter "CAIXA ALTA" para "Nome Próprio" (ex: JOÃO -> João).',
                  icon: ShieldCheck,
                  color: "text-emerald-500",
                },
                {
                  title: "Validação de E-mail",
                  desc: "Simular conexão com API para remover hard bounces.",
                  icon: AlertCircle,
                  color: "text-blue-500",
                },
                {
                  title: "Deduplicação de Leads",
                  desc: "Identificar CNPJs idênticos e mesclar com histórico.",
                  icon: Database,
                  color: "text-purple-500",
                },
                {
                  title: "Limpeza de Dados",
                  desc: "Remover caracteres especiais de telefones.",
                  icon: FileText,
                  color: "text-amber-500",
                },
              ].map((rule, i) => (
                <div
                  key={i}
                  className="p-6 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-[32px] flex gap-5 items-start"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-3xl bg-white/40 border border-orange-200/50 shadow-glass flex items-center justify-center shrink-0",
                      rule.color,
                    )}
                  >
                    <rule.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800">{rule.title}</h4>
                      <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                        <div className="w-3 h-3 bg-gradient-soft border border-orange-100 shadow-glass rounded-full ml-auto shadow-sm" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center gap-3">
              <button
                onClick={() => setCurrentStep("mapping")}
                className="px-6 py-3 text-slate-600 font-bold"
              >
                Voltar
              </button>
              <button
                onClick={() => setCurrentStep("automation")}
                className="px-12 py-4 bg-orange-500 text-white rounded-[24px] font-bold shadow-xl shadow-orange-500/20 hover:scale-[1.02] transition-transform"
              >
                Configurar Regras de Automação
              </button>
            </div>
          </motion.div>
        );

      case "automation":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8"
          >
            <div className="max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                Enriquecimento e Automação
              </h3>
              <p className="text-slate-600 text-sm mb-8">
                O sistema aplicará automaticamente essas tags com base nos seus
                critérios.
              </p>

              {/* Custom Tags */}
              <div className="p-6 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-[32px]">
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                  <Tag size={18} className="text-orange-500" />
                  Tagueamento Manual de Importação
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {globalTags.map((tag) => (
                    <span
                      key={tag}
                      className="group px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      🏷️ {tag}
                      <button
                        onClick={() =>
                          setGlobalTags((prev) => prev.filter((t) => t !== tag))
                        }
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag) {
                        setGlobalTags((prev) => [
                          ...new Set([...prev, newTag]),
                        ]);
                        setNewTag("");
                      }
                    }}
                    placeholder="Adicionar nova tag..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-slate-900 outline-none transition-all"
                  />
                  <button
                    onClick={() => {
                      if (newTag) {
                        setGlobalTags((prev) => [
                          ...new Set([...prev, newTag]),
                        ]);
                        setNewTag("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
              {/* Cadence Selection Button */}
              <div className="p-6 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-[32px] mt-6 flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                    <Database size={18} className="text-orange-500" />
                    Fluxo de Cadência
                  </h4>
                  <p className="text-sm text-slate-600">
                    {selectedCadence === "Sem Cadência"
                      ? "Nenhum fluxo selecionado (os leads ficarão pendentes)"
                      : `Cadência atual: ${selectedCadence}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsCadenceModalOpen(true)}
                  className="px-6 py-3 bg-white/60 border border-orange-200 text-orange-600 rounded-xl font-bold shadow-sm hover:bg-orange-50 transition-all flex items-center gap-2"
                >
                  Alterar Fluxo
                </button>
              </div>

              {/* Cadence Selection Modal */}
              <AnimatePresence>
                {isCadenceModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="w-full max-w-lg bg-gradient-soft border border-orange-100 shadow-glass rounded-[30px] shadow-2xl overflow-hidden"
                    >
                      <div className="p-6 border-b border-orange-100/50 flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Comfortaa, cursive' }}>
                            Atribuir Cadência Padrão
                          </h2>
                          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-1" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                            Para os leads importados
                          </p>
                        </div>
                        <button
                          onClick={() => setIsCadenceModalOpen(false)}
                          className="p-2 hover:bg-white/60 rounded-full transition-colors"
                        >
                          <X size={20} className="text-slate-600" />
                        </button>
                      </div>

                      <div className="p-8">
                        <div className="grid grid-cols-1 gap-3">
                          {availableCadences.map((cadence) => (
                            <button
                              key={cadence}
                              onClick={() => {
                                setSelectedCadence(cadence);
                                setIsCadenceModalOpen(false);
                              }}
                              className={cn(
                                "p-4 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-between group",
                                selectedCadence === cadence
                                  ? "border-orange-400 bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-orange-500/20 shadow-md"
                                  : "border-orange-200/50 bg-white/40 hover:bg-gradient-soft shadow-glass hover:border-orange-300 text-slate-600"
                              )}
                            >
                              <span>{cadence}</span>
                              {selectedCadence === cadence && (
                                <CheckCircle2 size={18} className="text-white bg-orange-600 rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep("sanitization")}
                className="font-black text-slate-600 hover:text-slate-600 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-10 py-4 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting
                  ? "Importando..."
                  : `Finalizar Importação (${parsedData.length - excludedRows.length})`}
                {!isImporting && <ArrowRight size={18} />}
              </button>
            </div>
          </motion.div>
        );

      case "summary":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <CheckCircle2 className="text-emerald-600" size={48} />
              </motion.div>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-2">
              Importação Concluída!
            </h3>
            <p className="text-slate-600 text-lg mb-10">
              <strong>{importResult?.created || 0}</strong> leads foram
              importados com sucesso. <br />
              Eles estão agora aguardando qualificação pelo Manager.
              {importResult?.failed > 0 && (
                <span className="block text-red-500 text-sm mt-2">
                  Nota: {importResult.failed} leads falharam na importação.
                </span>
              )}
            </p>

            <div className="grid grid-cols-1 gap-8 mb-12 w-full max-w-xl">
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-4xl font-black text-slate-800">
                  {importResult?.created || 0}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">
                  Leads Criados
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep("pending")}
              className="px-12 py-4 bg-slate-900 text-white border border-slate-200 rounded-xl font-black shadow-lg hover:bg-slate-800 transition-all"
            >
              Ver Leads Pendentes
            </button>
          </motion.div>
        );

      case "pending":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-800">
                Leads Aguardando Atribuição
              </h3>
              <button
                onClick={() => setCurrentStep("upload")}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
              >
                + Nova Importação
              </button>
            </div>

            {isLoadingPending ? (
              <div className="py-20 text-center text-slate-600 font-bold">
                Carregando leads...
              </div>
            ) : pendingLeads.length > 0 ? (
              <div className="bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Lead
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-sm">
                            {lead.full_name}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            {lead.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {lead.company_name || lead.razao_social}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedLeadForAssignment(lead)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-orange-600 transition-all"
                          >
                            Qualificar e Atribuir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center">
                <CheckCircle2
                  className="mx-auto text-emerald-100 mb-4"
                  size={48}
                />
                <h4 className="text-xl font-bold text-slate-800 mb-1">
                  Nenhuma pendência
                </h4>
                <p className="text-sm text-slate-600">
                  Todos os leads já foram processados.
                </p>
              </div>
            )}

            {selectedLeadForAssignment && (
              <LeadAssignmentModal
                lead={selectedLeadForAssignment}
                onClose={() => setSelectedLeadForAssignment(null)}
                onAssigned={fetchPendingLeads}
              />
            )}
          </motion.div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-slate-900 font-sans items-center">
      <div className="w-full max-w-7xl h-full flex flex-col p-6">
        {/* Header & Stepper */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/60 shadow-sm text-slate-700 hover:text-blue-600 transition-all group shrink-0">
              <ArrowRight className="rotate-180 transition-transform group-hover:-translate-x-1" size={24} strokeWidth={2.5} />
            </button>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow border border-white/20 shrink-0"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
            >
              <TableIcon size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-2" style={{ fontFamily: 'Comfortaa, cursive' }}>
                <span className="text-slate-700 opacity-90">Manager</span>
                <span>Importação</span>
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] text-slate-500 font-extrabold tracking-[0.1em] uppercase" style={{ fontFamily: 'Comfortaa, cursive' }}>
                  Assistente Operacional
                </p>
                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                <button
                  onClick={fetchPendingLeads}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5",
                    currentStep === "pending"
                      ? "text-orange-600"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Ver Pendências
                  {notifications.length > 0 && (
                    <span className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full text-[9px] text-red-600 ring-1 ring-red-100">
                      <Bell size={10} strokeWidth={3} />
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="p-1 bg-gradient-soft border border-orange-100 shadow-glass rounded-xl flex items-center gap-1 border border-slate-200/60 shadow-sm">
            {steps.map((step, idx) => {
              const isCompleted =
                steps.findIndex((s) => s.id === currentStep) > idx;
              const isActive = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all",
                      isActive
                        ? "bg-gradient-soft border border-orange-100 shadow-glass text-slate-900 shadow-sm border border-slate-200/50"
                        : isCompleted
                          ? "text-emerald-600 bg-gradient-soft border border-orange-100 shadow-glass/40"
                          : "text-slate-300",
                    )}
                  >
                    <step.icon size={14} />
                    <span className="hidden md:inline">{step.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="mx-1 h-px w-3 bg-slate-200" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <div key={currentStep} className="h-full">
              {renderStepContent()}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
