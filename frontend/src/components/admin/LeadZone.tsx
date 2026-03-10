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
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { leadsAPI, notificationsAPI, aiAPI } from "../../lib/api";
import { LeadAssignmentModal } from "./LeadAssignmentModal";

const SYSTEM_FIELDS = [
  { id: "cnpj", label: "CNPJ" },
  { id: "company_name", label: "Razão Social" },
  { id: "display_name", label: "Nome Fantasia" },
  { id: "full_name", label: "Nome do Contato" },
  { id: "email", label: "E-mail do Contato" },
  { id: "phone", label: "Telefone" },
  { id: "job_title", label: "Cargo" },
  { id: "employee_count", label: "Número de Funcionários" },
  { id: "linkedin_url", label: "LinkedIn URL" },
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
      // max 7 cols
      const headers = Object.keys(data[0] || {}).slice(0, 7);
      const mapping: Record<string, string> = {};

      headers.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (lower.includes("cnpj")) mapping[h] = "cnpj";
        else if (
          lower.includes("razão") ||
          lower.includes("razao") ||
          lower === "empresa" ||
          lower === "company"
        )
          mapping[h] = "company_name";
        else if (lower.includes("fantasia")) mapping[h] = "display_name";
        else if (
          lower.includes("email") ||
          lower.includes("e-mail") ||
          lower.includes("e_mail")
        )
          mapping[h] = "email";
        else if (
          lower.includes("telefone") ||
          lower === "phone" ||
          lower.includes("celular") ||
          lower.includes("fone") ||
          lower.includes("whats")
        )
          mapping[h] = "phone";
        else if (
          lower === "cargo" ||
          lower === "title" ||
          lower === "job_title" ||
          lower === "function"
        )
          mapping[h] = "job_title";
        else if (lower.includes("linkedin")) mapping[h] = "linkedin_url";
        else if (
          lower === "nome" ||
          lower === "name" ||
          lower === "nome_contato" ||
          lower === "full_name" ||
          lower === "contact_name" ||
          lower.startsWith("nome_") ||
          lower.startsWith("contato")
        )
          mapping[h] = "full_name";
        else if (
          lower.includes("func") ||
          lower.includes("empregados") ||
          lower === "employees"
        )
          mapping[h] = "employee_count";
        // Anything unrecognized becomes a custom field (saves as metadata key = column name)
        else mapping[h] = "custom_field";
      });

      setParsedHeaders(headers);
      setFieldMapping(mapping);

      // _originalIndex keeps track for exclusion
      const rowsWithId = data.map((r, i) => ({ ...r, _originalIndex: i }));
      setParsedData(rowsWithId);
      setExcludedRows([]);
      setCurrentStep("mapping");
    };

    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processData(results.data),
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("Erro ao processar o arquivo CSV.");
        },
      });
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        processData(data);
      } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Erro ao processar o arquivo Excel.");
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
      if (response.success && response.data.leads) {
        const suggestions: Record<string, string> = {};
        response.data.leads.forEach((item: any, idx: number) => {
          if (item.suggested_model) {
            // We don't have stable IDs yet, so we'll use index-based mapping for the demo/preview
            // but ideally the AI would give us rules.
            // For now, let's just store the suggestions to show in the UI.
            suggestions[idx] = item.suggested_model;
          }
        });
        setAiSuggestions(suggestions);
        // Auto-mapping logic could also be improved here, but the primary request is the "model"
      }
    } catch (err) {
      console.error("AI Structuring failed:", err);
      alert("Falha na estruturação por IA. Verifique sua chave API.");
    } finally {
      setIsAIStructuring(false);
    }
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

            if (mappedField === "metadata" || mappedField === "custom_field") {
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

          lead.tags = [...globalTags];
          lead.qualification_status = "pending";
          if (selectedCadence !== "Sem Cadência") {
            lead.cadence_name = selectedCadence;
            lead.tags.push(selectedCadence);
          }

          const suggestedModel = aiSuggestions[row._originalIndex];
          if (suggestedModel) lead.metadata.card_model = suggestedModel;

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
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-4 shadow-sm">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
                    Deduplicação
                  </h4>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    O sistema usa automaticamente o **CNPJ** como chave primária
                    para evitar duplicatas.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4 shadow-sm">
                <Database className="text-amber-600 shrink-0" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Estrutura Flexível
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
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
            className="px-8 flex flex-col h-[calc(100vh-180px)] max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0 pt-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  Preview & Mapeamento
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  Encontramos{" "}
                  <span className="text-slate-900 font-bold">
                    {parsedData.length} leads
                  </span>
                  . Valide o mapeamento e desmarque os que desejar excluir.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                {parsedHeaders.length} Colunas Detectadas (Máx. Exibido)
              </span>
              <button
                onClick={handleAIStructure}
                disabled={isAIStructuring}
                className={cn(
                  "ml-4 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95",
                  isAIStructuring
                    ? "bg-slate-100 text-slate-400 cursor-wait"
                    : "bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:shadow-orange-200"
                )}
              >
                {isAIStructuring ? (
                  <>Processando...</>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Classificar com IA
                  </>
                )}
              </button>
            </div>

            {/* Mapping & Preview Layout */}
            <div className="flex gap-6 overflow-hidden flex-1 pb-4">
              {/* Left: De-Para */}
              <div className="w-[380px] shrink-0 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-orange-100/60 bg-gradient-to-b from-orange-50/60 to-transparent shrink-0">
                  <h4 className="font-bold text-slate-700 text-sm">
                    De-Para (Colunas)
                  </h4>
                </div>
                <div className="overflow-y-auto p-4 custom-scrollbar">
                  <div className="flex flex-col gap-3">
                    {parsedHeaders.map((header) => {
                      const mapVal = fieldMapping[header];
                      // For custom fields, show the column name itself as the label
                      const isCustomField = mapVal === "custom_field";
                      const fieldLabel = isCustomField
                        ? header // show "Estado → Estado"
                        : mapVal && mapVal !== "ignore"
                          ? SYSTEM_FIELDS.find((f) => f.id === mapVal)?.label ||
                          mapVal
                          : "Mapear...";

                      return (
                        <div
                          key={header}
                          className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-slate-300 transition-colors bg-gradient-soft border border-orange-100 shadow-glass shadow-sm"
                        >
                          <span
                            className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]"
                            title={header}
                          >
                            {header}
                          </span>
                          <ArrowRight
                            size={14}
                            className="text-slate-300 shrink-0 mx-2"
                          />
                          <button
                            onClick={() => setMappingModalOpen(header)}
                            className={cn(
                              "flex items-center justify-between flex-1 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors",
                              mapVal && mapVal !== "ignore"
                                ? isCustomField
                                  ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                                  : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                : "bg-white/40 border-orange-200/50 text-slate-600 hover:bg-orange-50 hover:shadow-glass hover:border-orange-300",
                            )}
                          >
                            <span className="truncate">
                              {mapVal === "ignore"
                                ? "Ignorar Campo"
                                : fieldLabel}
                            </span>
                            <ChevronDown
                              size={14}
                              className="opacity-50 shrink-0 ml-1"
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Preview Table */}
              <div className="flex-1 bg-gradient-soft border border-orange-100 shadow-glass border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-orange-100/60 bg-gradient-to-b from-orange-50/60 to-transparent shrink-0 flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 text-sm">
                    Preview dos Dados
                  </h4>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider bg-gradient-soft border border-orange-100 shadow-glass px-2 py-1 rounded border border-slate-200">
                    {parsedData.length - excludedRows.length} Selecionados
                  </span>
                </div>
                <div className="overflow-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-[#f8fafc] sticky top-0 z-10 shadow-sm border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 text-center w-10 border-r border-slate-200"></th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase tracking-wider border-r border-slate-200 w-24">IA Model</th>
                        {parsedHeaders.map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-0 truncate max-w-[150px]"
                          >
                            {fieldMapping[h] !== "ignore" ? (
                              SYSTEM_FIELDS.find(
                                (f) => f.id === fieldMapping[h],
                              )?.label || h
                            ) : (
                              <span className="text-slate-300">IGNORADO</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.slice(0, 100).map((row) => {
                        const isExcluded = excludedRows.includes(
                          row._originalIndex,
                        );
                        return (
                          <tr
                            key={row._originalIndex}
                            className={cn(
                              "transition-colors",
                              isExcluded ? "bg-white/40" : "hover:bg-orange-50/60",
                            )}
                          >
                            <td className="px-3 py-2 text-center border-r border-slate-100 bg-gradient-soft border border-orange-100 shadow-glass">
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setExcludedRows((prev) =>
                                      prev.filter(
                                        (id) => id !== row._originalIndex,
                                      ),
                                    );
                                  else
                                    setExcludedRows((prev) => [
                                      ...prev,
                                      row._originalIndex,
                                    ]);
                                }}
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer w-4 h-4"
                              />
                            </td>
                            <td className="px-4 py-2 border-r border-slate-100">
                              {aiSuggestions[row._originalIndex] ? (
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-sm",
                                  aiSuggestions[row._originalIndex] === 'FULL' ? "bg-emerald-100 text-emerald-700" :
                                    aiSuggestions[row._originalIndex] === 'PHONE_ONLY' ? "bg-blue-100 text-blue-700" :
                                      aiSuggestions[row._originalIndex] === 'EMAIL_ONLY' ? "bg-purple-100 text-purple-700" :
                                        "bg-amber-100 text-amber-700"
                                )}>
                                  {aiSuggestions[row._originalIndex]}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">Pendente</span>
                              )}
                            </td>
                            {parsedHeaders.map((h) => (
                              <td
                                key={h}
                                className={cn(
                                  "px-4 py-2 text-xs truncate max-w-[200px] border-r border-slate-100 last:border-0",
                                  isExcluded
                                    ? "text-slate-600"
                                    : "text-slate-600",
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
                {parsedData.length > 100 && (
                  <div className="p-2 text-center text-[10px] font-bold text-slate-600 bg-gradient-to-t from-orange-50/60 to-transparent border-t border-orange-100/60 shrink-0">
                    Exibindo os primeiros 100 registros. A importação fará o
                    processamento de todos os {parsedData.length} leads.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 shrink-0 pt-4 mt-auto">
              <button
                onClick={() => setCurrentStep("upload")}
                className="px-6 py-3 text-slate-600 font-bold hover:text-slate-700"
              >
                Voltar
              </button>
              <button
                onClick={() => setCurrentStep("sanitization")}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all"
              >
                Confirmar e Avançar <ChevronRight size={18} />
              </button>
            </div>

            {/* Expandable Modal for Selection */}
            <AnimatePresence>
              {mappingModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="bg-gradient-soft border border-orange-100 shadow-glass rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
                  >
                    <button
                      onClick={() => setMappingModalOpen(null)}
                      className="absolute top-4 right-4 text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <h3 className="text-lg font-black text-slate-800 mb-1">
                      Mapear Coluna
                    </h3>
                    <p className="text-sm font-medium text-slate-600 mb-5">
                      Coluna Original:{" "}
                      <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded">
                        {mappingModalOpen}
                      </span>
                    </p>

                    <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {SYSTEM_FIELDS.map((f) => {
                        const isSelected =
                          fieldMapping[mappingModalOpen] === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              setFieldMapping((prev) => ({
                                ...prev,
                                [mappingModalOpen]: f.id,
                              }));
                              setMappingModalOpen(null);
                            }}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all text-left border-2",
                              isSelected
                                ? "bg-orange-50 text-orange-800 border-orange-500"
                                : "bg-gradient-soft border border-orange-200/50 shadow-glass text-slate-600 hover:border-orange-300 hover:bg-white/40",
                            )}
                          >
                            {f.label}
                            {isSelected && (
                              <CheckCircle2
                                size={16}
                                className="text-orange-500"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
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
              <Database size={28} strokeWidth={2.5} />
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
