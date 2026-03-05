import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Zap, CheckCircle2 } from "lucide-react";
const ICON = { strokeWidth: 1.5 };
import type { Lead } from "../../types";
import { leadsAPI } from "../../lib/api";

interface LeadAssignmentModalProps {
  lead: Lead;
  onClose: () => void;
  onAssigned: () => void;
}

export const LeadAssignmentModal: React.FC<LeadAssignmentModalProps> = ({
  lead,
  onClose,
  onAssigned,
}) => {
  const [selectedSDR, setSelectedSDR] = useState("");
  const [selectedCadence, setSelectedCadence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock SDRs and Cadences for now - the app should ideally fetch these
  const sdrs = [
    { id: "sdr-1", name: "Alvaro" },
    { id: "sdr-2", name: "Juliana" },
    { id: "sdr-3", name: "Rodrigo Manager" },
  ];

  const cadences = [
    { id: "cad-1", name: "Fechamento 3,3,1" },
    { id: "cad-2", name: "Fluxo Padrão - 5 Touchpoints" },
    { id: "cad-3", name: "Nurturing Lento" },
  ];

  const handleAssign = async () => {
    if (!selectedSDR || !selectedCadence) return;

    setIsSubmitting(true);
    try {
      const res = await leadsAPI.assignLead(
        lead.id,
        selectedSDR,
        selectedCadence,
      );
      if (res.success) {
        onAssigned();
        onClose();
      }
    } catch (err) {
      console.error("Failed to assign lead:", err);
      alert("Erro ao atribuir lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-gradient-soft border border-orange-100 shadow-glass rounded-[30px] shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Comfortaa, cursive' }}>
                Atribuir Lead
              </h2>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                {lead.full_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/40 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-600" {...ICON} />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {/* SDR Selection (Smart Menu) */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                <User size={12} {...ICON} />
                Menu Inteligente de Atribuição (SDR)
              </label>
              <p className="text-xs text-slate-600 mb-2">
                Selecione um SDR específico ou divida os leads em partes iguais.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedSDR("auto-divide")}
                  className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group md:col-span-2 ${selectedSDR === "auto-divide"
                    ? "border-orange-400 bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-orange-500/20 shadow-md"
                    : "border-orange-200/50 bg-white/40 hover:bg-gradient-soft shadow-glass hover:border-orange-300"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Zap size={14} {...ICON} />
                    </div>
                    <div>
                      <span
                        className={`block text-sm font-black ${selectedSDR === "auto-divide" ? "text-white" : "text-slate-700"}`}
                      >
                        Dividir em Partes Iguais
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedSDR === "auto-divide" ? "text-white/80" : "text-slate-600"}`}>
                        Distribui os leads uniformemente entre todos os SDRs.
                      </span>
                    </div>
                  </div>
                  {selectedSDR === "auto-divide" && (
                    <CheckCircle2 size={18} className="text-orange-500" />
                  )}
                </button>
                {sdrs.map((sdr) => (
                  <button
                    key={sdr.id}
                    onClick={() => setSelectedSDR(sdr.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${selectedSDR === sdr.id
                      ? "border-orange-400 bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-orange-500/20 shadow-md"
                      : "border-orange-200/50 bg-white/40 hover:bg-gradient-soft shadow-glass hover:border-orange-300"
                      }`}
                  >
                    <span
                      className={`text-sm font-black ${selectedSDR === sdr.id ? "text-white" : "text-slate-700"}`}
                    >
                      {sdr.name}
                    </span>
                    {selectedSDR === sdr.id && (
                      <CheckCircle2 size={18} className="text-orange-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cadence Selection (Regras de Cadência) */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                <Zap size={12} {...ICON} />
                Regras de Cadência
              </label>
              <p className="text-xs text-slate-600 mb-2">
                Defina como os leads e campanhas são tratados e as quantidades
                de tentativas (ex: fechamento 3,3,1).
              </p>
              <div className="grid grid-cols-1 gap-2">
                {cadences.map((cad) => (
                  <button
                    key={cad.id}
                    onClick={() => setSelectedCadence(cad.name)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${selectedCadence === cad.name
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-500/20 shadow-md"
                      : "border-orange-200/50 bg-white/40 hover:bg-gradient-soft shadow-glass hover:border-orange-300"
                      }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-black ${selectedCadence === cad.name ? "text-white" : "text-slate-700"}`}
                      >
                        {cad.name}
                      </span>
                    </div>
                    {selectedCadence === cad.name && (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-b from-orange-50/60 to-transparent border-t border-orange-100/60 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 text-sm font-black text-slate-600 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={!selectedSDR || !selectedCadence || isSubmitting}
              onClick={handleAssign}
              className="flex-[2] py-4 bg-orange-500 text-white rounded-full font-bold text-sm shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:shadow-none hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(255,109,0,0.45)] transition-all active:scale-95"
              style={{ fontFamily: 'Quicksand, sans-serif' }}
            >
              {isSubmitting ? "Atribuindo..." : "Confirmar Regras e Atribuir"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
