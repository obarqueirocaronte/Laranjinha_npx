# Frontend Roadmap - UI/UX Specifications

Este documento armazena as especificações de interface e experiência do usuário para o desenvolvimento futuro do frontend do Inside Sales Pipeline.

---

## 🎨 Visão Geral da Interface

Interface de **kanban interativa** com foco em:
- Transições fluidas e responsivas
- Feedback visual instantâneo
- Harmonia de cores e consistência
- Modais contextuais e não-intrusivos

---

## 🔄 Drag-and-Drop (Arrastar e Soltar)

### Comportamento Esperado

**Transições de Coluna:**
- Resposta **imediata** ao arrastar um card
- Elementos da lista se **reorganizam automaticamente** para abrir espaço
- Sensação de **"magnetismo"** e continuidade
- **Zero lag** ou quebras visuais
- Animações suaves durante o movimento

### Especificações Técnicas

```javascript
// Características do drag-and-drop
{
  transitionDuration: "200ms",
  easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
  magneticSnap: true,
  ghostOpacity: 0.5,
  autoScroll: true,
  dropZoneHighlight: true
}
```

### Feedback Visual

1. **Ao pegar o card:**
   - Card levemente elevado (shadow aumenta)
   - Opacidade reduzida (50-70%)
   - Cursor muda para "grabbing"

2. **Durante o arraste:**
   - Outros cards se reorganizam em tempo real
   - Zona de drop destacada visualmente
   - Scroll automático quando próximo às bordas

3. **Ao soltar:**
   - Animação suave de "encaixe"
   - Card retorna à opacidade normal
   - Outros elementos finalizam reorganização

---

## 🪟 Sistema de Modais

### Surgimento dos Modais

**Características:**
- Surgem de forma **centralizada** na tela
- Efeito de **overlay** (escurecimento do fundo)
- Transição suave: **fade-in** + leve **scale** (0.95 → 1.0)
- Foco total no conteúdo sem perder contexto do quadro ao fundo

### Especificações de Animação

```css
/* Modal entrance animation */
.modal-enter {
  opacity: 0;
  transform: scale(0.95);
  transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

.modal-enter-active {
  opacity: 1;
  transform: scale(1);
}

/* Overlay */
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  transition: opacity 200ms ease;
}
```

### Estrutura Interna do Modal

**Modular e organizada:**

1. **Header**
   - Título do lead
   - Botão de fechar (X)
   - Indicador de qualidade (quality_score)

2. **Corpo Principal**
   - **Informações do Lead:**
     - Nome completo
     - Empresa
     - Cargo
     - Email, telefone, LinkedIn
   
   - **Etiquetas (Tags):**
     - Editáveis inline
     - Feedback visual instantâneo
     - Sincronização com card miniatura
   
   - **Datas:**
     - Data de criação
     - Última interação
     - Tempo na coluna atual
   
   - **Histórico de Interações:**
     - Timeline de ações
     - Templates enviados
     - Respostas recebidas

3. **Footer**
   - Botões de ação (Enviar template, Adicionar nota)
   - Histórico de movimentação no pipeline

---

## 🎯 Feedback Visual Instantâneo

### Edição de Etiquetas

**Comportamento:**
- Alteração no modal reflete **instantaneamente** no card miniatura
- Animação suave de atualização (fade ou pulse)
- Cores consistentes em todos os níveis da interface

### Sincronização em Tempo Real

```javascript
// Ao editar etiqueta no modal
onTagUpdate(leadId, newTags) {
  // 1. Atualiza modal (imediato)
  updateModalTags(newTags);
  
  // 2. Atualiza card no kanban (animado)
  updateCardTags(leadId, newTags, { animate: true });
  
  // 3. Persiste no backend (assíncrono)
  api.updateLead(leadId, { tags: newTags });
}
```

---

## 🎨 Harmonia de Cores e Etiquetas

### Sistema de Cores

**Pipeline Columns:**
- Leads: `#94A3B8` (Slate)
- Call: `#3B82F6` (Blue)
- WhatsApp: `#10B981` (Green)
- Email: `#F59E0B` (Amber)
- Qualified: `#8B5CF6` (Purple)
- Lost: `#EF4444` (Red)

**Etiquetas (Tags):**
- Alta prioridade: `#EF4444` (Red)
- Média prioridade: `#F59E0B` (Amber)
- Baixa prioridade: `#10B981` (Green)
- Follow-up: `#3B82F6` (Blue)
- Aguardando resposta: `#8B5CF6` (Purple)

### Consistência Visual

- Mesmas cores em **card miniatura** e **modal detalhado**
- Contraste adequado para acessibilidade (WCAG AA)
- Modo claro e escuro suportados

---

## 📱 Responsividade

### Desktop (> 1024px)
- Colunas lado a lado (horizontal scroll se necessário)
- Modais centralizados com largura máxima de 800px
- Drag-and-drop entre colunas visíveis

### Tablet (768px - 1024px)
- 2-3 colunas visíveis por vez
- Scroll horizontal suave
- Modais ocupam 90% da largura

### Mobile (< 768px)
- 1 coluna por vez (swipe para navegar)
- Modais em fullscreen
- Drag-and-drop vertical dentro da coluna

---

## ⚡ Performance e Otimizações

### Virtual Scrolling
Para listas com muitos leads (>50 por coluna):
- Renderizar apenas itens visíveis + buffer
- Lazy loading de imagens e dados pesados

### Debouncing
- Busca/filtro: 300ms
- Auto-save: 500ms
- Sincronização de tags: 200ms

### Animações
- Usar `transform` e `opacity` (GPU-accelerated)
- Evitar `width`, `height`, `top`, `left` em animações
- `will-change` apenas quando necessário

---

## 🎭 Micro-interações

### Hover States
- **Card:** Leve elevação (shadow)
- **Botões:** Mudança de cor suave
- **Tags:** Destaque com borda

### Loading States
- **Skeleton screens** durante carregamento inicial
- **Spinners** para ações assíncronas
- **Progress bars** para uploads/imports

### Empty States
- Ilustrações amigáveis quando coluna vazia
- Call-to-action claro ("Adicionar primeiro lead")

---

## 🔔 Notificações e Feedback

### Toast Notifications
- **Sucesso:** Verde, ícone de check, 3s
- **Erro:** Vermelho, ícone de alerta, 5s
- **Info:** Azul, ícone de info, 4s
- **Warning:** Amarelo, ícone de atenção, 4s

### Confirmações
- Ações destrutivas (deletar lead): Modal de confirmação
- Ações reversíveis (mover lead): Toast com "Desfazer"

---

## 🎯 Prompt Resumido para Desenvolvimento

> **"Desenvolva uma interface de kanban interativa com transições fluidas de 'arrastar e soltar' (drag-and-drop) que reordenem os elementos em tempo real. Implemente modais de detalhes que surjam de forma centralizada com efeito de sobreposição (overlay) suave, garantindo que a edição de etiquetas e campos reflita instantaneamente na visão geral do quadro, mantendo harmonia visual e foco total na tarefa selecionada."**

---

## 📋 Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Layout de colunas responsivo
- [ ] Cards de lead com informações básicas
- [ ] Sistema de cores e tema

### Fase 2: Interatividade
- [ ] Drag-and-drop entre colunas
- [ ] Reorganização automática de elementos
- [ ] Animações de transição

### Fase 3: Modais
- [ ] Modal de detalhes do lead
- [ ] Overlay com blur
- [ ] Animações de entrada/saída
- [ ] Estrutura modular interna

### Fase 4: Sincronização
- [ ] Edição inline de etiquetas
- [ ] Atualização instantânea card ↔ modal
- [ ] Persistência no backend

### Fase 5: Polimento
- [ ] Micro-interações e hover states
- [ ] Loading e empty states
- [ ] Toast notifications
- [ ] Testes de performance

---

## 🛠️ Stack Tecnológico Sugerido

### Frontend Framework
- **React** + TypeScript (recomendado)
- **Next.js** para SSR/SSG (opcional)

### Drag-and-Drop
- **@dnd-kit/core** (moderna, acessível, performática)
- Alternativa: **react-beautiful-dnd** (mais madura)

### Animações
- **Framer Motion** (declarativa, poderosa)
- Alternativa: **React Spring** (baseada em física)

### State Management
- **Zustand** (simples, performático)
- Alternativa: **Redux Toolkit** (mais robusto)

### Styling
- **Tailwind CSS** (utility-first, rápido)
- Alternativa: **Styled Components** (CSS-in-JS)

### UI Components
- **Radix UI** (acessível, unstyled)
- **Shadcn/ui** (componentes prontos com Radix + Tailwind)

---

## 🎨 Referências Visuais

### Inspirações
- **Trello**: Drag-and-drop fluido, cards simples
- **Linear**: Modais elegantes, animações suaves
- **Notion**: Edição inline, feedback instantâneo
- **Asana**: Timeline, cores harmoniosas

### Princípios de Design
1. **Clareza**: Informação hierarquizada e escaneável
2. **Feedback**: Toda ação tem resposta visual imediata
3. **Consistência**: Padrões visuais e comportamentais uniformes
4. **Eficiência**: Menos cliques, mais atalhos de teclado
5. **Acessibilidade**: WCAG AA, navegação por teclado

---

## 📝 Notas de Implementação

### Prioridades
1. **Funcionalidade core** (kanban + drag-and-drop)
2. **Performance** (virtual scrolling, otimizações)
3. **Polimento visual** (animações, micro-interações)
4. **Acessibilidade** (ARIA, keyboard navigation)

### Considerações Futuras
- [ ] Modo offline (PWA)
- [ ] Atalhos de teclado (j/k para navegar, e para editar)
- [ ] Filtros e busca avançada
- [ ] Visualizações alternativas (lista, timeline)
- [ ] Colaboração em tempo real (WebSockets)
- [ ] Temas customizáveis

---

**Documento criado em:** 2026-02-04  
**Última atualização:** 2026-02-04  
**Status:** Especificações iniciais para desenvolvimento futuro
