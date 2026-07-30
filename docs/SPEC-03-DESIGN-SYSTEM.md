# SPEC-03 — Design System: Preto + Gold Gradiente, Premium

Status: **aprovado pelo product owner** · Marca: PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR
Inspiração visual: premium fitness SaaS (MFIT, Tecnofit, high-end personal training)

---

## 1. Paleta de cores

### 1.1 Cores base

```css
--primary-gold: #D4AF37;        /* ouro clássico — botões, destaques, ícones ativos */
--primary-gold-light: #E8C547;  /* ouro claro — hover, backgrounds suaves */
--primary-gold-dark: #B8941E;   /* ouro escuro — active state, borders premium */

--neutral-black: #0A0A0A;       /* preto profundo — backgrounds, text principal */
--neutral-900: #1A1A1A;         /* preto suave — cards, panels, secondary background */
--neutral-800: #2A2A2A;         /* cinza escuro — borders, dividers, input focus */
--neutral-700: #3A3A3A;         /* cinza — secondary text, disabled state */
--neutral-600: #4A4A4A;         /* cinza médio — tertiary text */
--neutral-500: #6A6A6A;         /* cinza claro — placeholders, muted text */
--neutral-400: #8A8A8A;         /* cinza pálido — borders, subtle lines */
--neutral-200: #D0D0D0;         /* cinza muito claro — backgrounds minimal contrast */
--neutral-100: #E8E8E8;         /* branco quase — backgrounds claros, alternation */
--neutral-white: #FFFFFF;       /* branco puro — emergency only */

--success: #22C55E;             /* verde — confirmações, checks */
--warning: #EAB308;             /* amarelo — alertas, atencao */
--destructive: #EF4444;         /* vermelho — erros, deletar */
--info: #3B82F6;                /* azul — informacoes, help */
```

### 1.2 Gradientes premium

```css
/* Gradiente ouro horizontal — botões CTA */
--gradient-gold-h: linear-gradient(90deg, #B8941E 0%, #D4AF37 50%, #E8C547 100%);

/* Gradiente ouro vertical — backgrounds hero, headers */
--gradient-gold-v: linear-gradient(180deg, #D4AF37 0%, #B8941E 100%);

/* Gradiente preto-ouro — premium card backgrounds */
--gradient-premium: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #2A2A2A 100%);

/* Overlay ouro suave — sobre imagens */
--overlay-gold: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(180, 148, 30, 0.05) 100%);

/* Gradiente de vidro — modais, dropdowns premium */
--gradient-frosted: linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(42, 42, 42, 0.8) 100%);
```

---

## 2. Tipografia

### 2.1 Fontes

```
Font primária: Inter 400/500/600/700/800
Font secundária: Space Mono (monospace) — para números, pesos, métricas de treino
Loading: google fonts + fallback system-ui
```

### 2.2 Escala de tamanho

| Uso | Size | Weight | Line Height | Letter-spacing |
|-----|------|--------|-------------|----------------|
| H1 — Página hero | 3.5rem | 800 | 1.1 | -0.01em |
| H2 — Seção principal | 2.5rem | 700 | 1.2 | -0.005em |
| H3 — Subsecção | 1.75rem | 700 | 1.3 | 0 |
| H4 — Card title | 1.25rem | 600 | 1.4 | 0 |
| H5 — Label, form | 0.875rem | 600 | 1.5 | 0.01em |
| Body — Padrão | 1rem | 400 | 1.6 | 0 |
| Body small | 0.875rem | 400 | 1.5 | 0 |
| Body x-small | 0.75rem | 400 | 1.4 | 0 |
| Mono — Dados | 0.875rem | 500 | 1.5 | 0 |
| Mono small | 0.75rem | 500 | 1.4 | 0.02em |

---

## 3. Componentes visuais

### 3.1 Botões

**Primário (CTA principal)**
- Background: `--gradient-gold-h`
- Foreground: `--neutral-black`
- Border: none
- Padding: 12px 24px (md)
- Border-radius: 4px
- Font: Inter 600
- Hover: brightness 110%, shadow-lg
- Active: brightness 90%
- Disabled: opacity 50%

```html
<button class="btn btn-primary">Solicitar treino</button>
```

**Secundário (ações complementares)**
- Background: `--neutral-800`
- Foreground: `--primary-gold`
- Border: 1px solid `--primary-gold-dark`
- Hover: background `--neutral-700`, border `--primary-gold`
- Active: background `--neutral-600`

```html
<button class="btn btn-secondary">Cancelar</button>
```

**Outline (menos destaque)**
- Background: transparent
- Foreground: `--primary-gold`
- Border: 1px solid `--primary-gold`
- Hover: background rgba(212, 175, 55, 0.1)
- Active: background rgba(212, 175, 55, 0.2)

**Destrutivo (delete, logout)**
- Background: `--destructive` com opacity 90%
- Foreground: `--neutral-white`
- Hover: background `--destructive` com opacity 100%
- Active: background `--destructive` com opacity 80%

### 3.2 Cards

- Background: `--gradient-premium` (card com depth)
- Border: 1px solid `--neutral-800`
- Border-radius: 8px
- Padding: 24px
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)
- Hover (opcional): box-shadow 0 8px 24px rgba(212, 175, 55, 0.15)

```html
<div class="card card-premium">
  <h3>Titulo do card</h3>
  <p>Conteudo premium...</p>
</div>
```

### 3.3 Inputs & Forms

- Background: `--neutral-800`
- Foreground: `--neutral-100`
- Border: 1px solid `--neutral-700`
- Border-radius: 4px
- Padding: 10px 12px
- Focus: border-color `--primary-gold`, box-shadow 0 0 0 2px rgba(212, 175, 55, 0.2)
- Placeholder: `--neutral-600`
- Label: `--primary-gold`, font-weight 600, tamanho 0.875rem

```html
<label class="form-label">Seu e-mail</label>
<input class="form-input" type="email" placeholder="you@example.com" />
```

### 3.4 Badges & Tags

| Tipo | Background | Foreground | Use |
|------|------------|-----------|-----|
| Premium | `--gradient-gold-h` | `--neutral-black` | Destaque, featured |
| Active | `--success` | `--neutral-white` | Status ativo, online |
| Pending | `--warning` | `--neutral-black` | Aguardando ação |
| Inactive | `--neutral-700` | `--neutral-400` | Desabilitado, inativo |
| Info | `--info` | `--neutral-white` | Informacao |
| Error | `--destructive` | `--neutral-white` | Erro, atencao |

### 3.5 Modais & Dropdowns

- Background: `--gradient-frosted` (vidro com blur)
- Backdrop: rgba(0, 0, 0, 0.6)
- Border: 1px solid rgba(212, 175, 55, 0.3)
- Border-radius: 8px
- Shadow: 0 20px 60px rgba(0, 0, 0, 0.5)

### 3.6 Ícones

- Cor padrão: `--neutral-400`
- Ativa: `--primary-gold`
- Sucesso: `--success`
- Erro: `--destructive`
- Tamanho padrão: 24px (1.5rem)
- Tamanho pequeno: 16px (1rem)
- Stroke width: 2px

---

## 4. Layout & Spacing

### 4.1 Escala de espaçamento

```css
--space-1: 0.25rem;   /* 4px — minimal gaps */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px — baseline */
--space-5: 1.5rem;    /* 24px */
--space-6: 2rem;      /* 32px */
--space-7: 3rem;      /* 48px */
--space-8: 4rem;      /* 64px */
--space-9: 6rem;      /* 96px */
```

### 4.2 Breakpoints (mobile-first)

```css
xs:  0px
sm:  640px  (tablet)
md:  1024px (small desktop)
lg:  1280px (desktop)
xl:  1536px (wide desktop)
```

### 4.3 Sidebar

- Width: 256px (1 col grid)
- Background: `--neutral-900`
- Border-right: 1px solid `--neutral-800`
- Sticky: top 0, height 100vh, overflow-y auto
- Padding: 24px 16px
- Logo padding: 24px 0

---

## 5. Padrões de interação

### 5.1 Hover states

- Botões: background shift + shadow elevation
- Cards: shadow elevation + subtle border highlight de ouro
- Links: underline em ouro
- Inputs: border em ouro + subtle glow

### 5.2 Loading states

- Skeleton screens com gradient shimmer (`--neutral-700` → `--neutral-800` → `--neutral-700`)
- Spinner: ouro sobre preto (SVG inline ou `<progress>`)
- Toast com ícone animado

### 5.3 Transições

- Duração padrão: 200ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (material design)
- Propriedades: `background-color`, `border-color`, `transform`, `opacity`
- Desabilitar em `prefers-reduced-motion`

---

## 6. Dark mode (Único suportado)

A aplicação é **dark-only**. Nenhum light mode. Simplifica CSS, alinha com premium fitness aesthetic.

```css
:root {
  color-scheme: dark;
}

/* Nao e necessario prefers-color-scheme media query */
```

---

## 7. Acessibilidade

- Contraste mínimo WCAG AA: ouro sobre preto (12.5:1 ✓)
- Focus rings: 2px solid `--primary-gold` com offset 2px
- Textos pequenos: mínimo 16px para inputs em mobile
- Icons sem texto: `aria-label`
- Modals: `role="dialog"`, `aria-modal="true"`, focus trap
- Cores não como única pista: sempre adicionar ícone ou texto

---

## 8. Referência visual — exemplo de card premium

```html
<div class="card">
  <div class="card-header">
    <h4 class="card-title">Treino A — Inferior</h4>
    <span class="badge badge-premium">ATIVO</span>
  </div>
  <div class="card-body">
    <p class="text-secondary">8 exercícios · 45 min</p>
    <div class="button-group">
      <button class="btn btn-primary">Editar Treino</button>
      <button class="btn btn-secondary">Ver histórico</button>
    </div>
  </div>
  <div class="card-footer">
    <small class="text-muted">Última atualização há 3 dias</small>
  </div>
</div>
```

---

## 9. Implementação no Tailwind

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    colors: {
      gold: {
        DEFAULT: '#D4AF37',
        light: '#E8C547',
        dark: '#B8941E',
      },
      neutral: {
        black: '#0A0A0A',
        900: '#1A1A1A',
        800: '#2A2A2A',
        700: '#3A3A3A',
        // ... etc
      },
    },
    extend: {
      backgroundImage: {
        'gradient-gold-h': 'linear-gradient(90deg, #B8941E, #D4AF37, #E8C547)',
        'gradient-premium': 'linear-gradient(135deg, #0A0A0A, #1A1A1A, #2A2A2A)',
      },
      boxShadow: {
        premium: '0 4px 12px rgba(0, 0, 0, 0.3)',
        'premium-hover': '0 8px 24px rgba(212, 175, 55, 0.15)',
      },
    },
  },
};
```

---

## 10. Critérios de aceite

- [ ] Paleta extraída em tokens CSS e Tailwind.
- [ ] Todos os componentes visuais (botão, card, input, modal) implementados em React sem shadcn.
- [ ] Nenhum light mode.
- [ ] Gradiente ouro presente em CTAs, headers e cards premium.
- [ ] Contraste ouro-preto atende WCAG AA.
- [ ] Focus rings em ouro, visíveis sem mouse.
- [ ] Todas as transições respeitam `prefers-reduced-motion`.
