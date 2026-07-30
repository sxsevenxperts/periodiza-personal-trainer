# E2E Tests — Treino Builder (Fase 3)

**Pré-requisito:** Migration 0010 deve estar aplicada no Supabase.

## Setup

1. Criar um cliente de teste:
   ```
   - Nome: "Teste E2E Builder"
   - Email: "e2e-builder@test.local"
   - Objetivo: "Hipertrofia"
   - Nível: "Intermediário"
   ```

2. Criar uma periodização para o cliente:
   ```
   - Nome: "Período E2E - Teste Builder"
   - Duração: 4 semanas
   - Divisão: ABCDEFG (para testar 7 abas)
   ```

3. Navegar para `/periodizacoes/[id]` da periodização criada

## Test Cases

### T1: Criar 7 Treinos (A–G), 8ª Bloqueada

**Pré-condição:** Página do Builder aberta, divisão ABCDEFG

**Passos:**
1. Verificar que as abas A, B, C, D, E, F, G existem
2. Verificar que o botão "+ Adicionar treino" está **desabilitado** (tooltip: "Limite A–G atingido. Promova o split.")

**Esperado:** ✅ Todas as 7 abas renderizam, botão de adicionar está desabilitado

**Assertions:**
```javascript
expect(document.querySelectorAll('[data-testid="session-tab"]')).toHaveLength(7)
expect(document.querySelector('[data-testid="add-session-btn"]')).toBeDisabled()
```

---

### T2: Buscar Exercício por Nome Exato

**Pré-condição:** Builder aberto, barra de busca focada

**Passos:**
1. Digitar "Agachamento" na barra de busca
2. Aguardar 300ms para debounce
3. Verificar resultados

**Esperado:** ✅ "Agachamento" aparece na lista de resultados

**Assertions:**
```javascript
const searchInput = document.querySelector('#exercise-search-input')
searchInput.value = 'Agachamento'
searchInput.dispatchEvent(new Event('input'))
await new Promise(r => setTimeout(r, 400)) // debounce + delay
expect(document.textContent).toContain('Agachamento')
```

---

### T3: Buscar com Alias ("hip thrust" → "Elevação pelvica")

**Pré-condição:** Migration 0010 aplicada (com aliases preenchidos), Builder aberto

**Passos:**
1. Digitar "hip thrust" na barra de busca
2. Aguardar resultado

**Esperado:** ✅ "Elevação pelvica" aparece (via alias)

**Assertions:**
```javascript
// Requer seed de aliases na tabela exercises
searchInput.value = 'hip thrust'
searchInput.dispatchEvent(new Event('input'))
await new Promise(r => setTimeout(r, 400))
expect(document.textContent).toContain('Elevação pelvica')
```

---

### T4: Buscar com Trigram ("agacahmento" → "Agachamento")

**Pré-condição:** Migration 0010 aplicada (extensão pg_trgm), Builder aberto

**Passos:**
1. Digitar "agacahmento" (typo com erro) na barra de busca
2. Aguardar resultado

**Esperado:** ✅ "Agachamento" aparece (via trigram fuzzy match)

**Assertions:**
```javascript
searchInput.value = 'agacahmento'
searchInput.dispatchEvent(new Event('input'))
await new Promise(r => setTimeout(r, 400))
expect(document.textContent).toContain('Agachamento')
```

---

### T5: Buscar Sem Acento ("gluteo" → com acentos)

**Pré-condição:** Migration 0010 aplicada (extensão unaccent), Builder aberto

**Passos:**
1. Digitar "gluteo" (sem acento) na barra de busca
2. Aguardar resultado

**Esperado:** ✅ Exercícios com "glúteo" aparecem (via unaccent)

**Assertions:**
```javascript
searchInput.value = 'gluteo'
searchInput.dispatchEvent(new Event('input'))
await new Promise(r => setTimeout(r, 400))
expect(document.textContent).toContain('Glúteo') // ignora acentos
```

---

### T6: Adicionar Exercício na Aba Ativa

**Pré-condição:** Builder aberto, aba A ativa, busca com resultados

**Passos:**
1. Buscar "Agachamento"
2. Clicar em "+ Adicionar" no resultado
3. Verificar toast e estado

**Esperado:** ✅ Exercício aparece na aba A, toast "Exercício adicionado!"

**Assertions:**
```javascript
const addBtn = document.querySelector('[data-testid="add-exercise-btn"]')
addBtn.click()
await new Promise(r => setTimeout(r, 100))
expect(screen.getByText('Agachamento')).toBeInTheDocument()
expect(screen.getByText('Exercício adicionado!')).toBeInTheDocument()
expect(sessionTabs[0].exerciseCount).toBe(1) // aba A
```

---

### T7: Adicionar Exercício em Aba Diferente (sem trocar aba)

**Pré-condição:** Builder aberto, aba A ativa, busca com resultados

**Passos:**
1. Buscar "Leg Press"
2. Seletor "Adicionar em:" → escolher "Treino C"
3. Clicar "+ Adicionar"
4. Verificar toast e aba A permanece ativa

**Esperado:** ✅ Toast "Exercício adicionado a Treino C", botão "Desfazer", aba A permanece ativa

**Assertions:**
```javascript
const destinationSelect = document.querySelector('[data-testid="add-destination"]')
destinationSelect.value = 'C'
const addBtn = document.querySelector('[data-testid="add-exercise-btn"]')
addBtn.click()
await new Promise(r => setTimeout(r, 100))
expect(activeSessionLabel).toBe('A') // aba não mudou
expect(screen.getByText(/Exercício adicionado a Treino C/)).toBeInTheDocument()
expect(screen.getByText('Desfazer')).toBeInTheDocument()
expect(sessionTabs[2].exerciseCount).toBe(1) // aba C
```

---

### T8: Desfazer Adição de Exercício

**Pré-condição:** Exercício adicionado à aba C, toast com botão "Desfazer" visível

**Passos:**
1. Clicar botão "Desfazer" no toast
2. Verificar estado

**Esperado:** ✅ Exercício removido de aba C, toast "Exercício removido"

**Assertions:**
```javascript
const undoBtn = screen.getByText('Desfazer')
undoBtn.click()
await new Promise(r => setTimeout(r, 100))
expect(sessionTabs[2].exerciseCount).toBe(0) // aba C vazia
```

---

### T9: Remover Exercício via Botão X

**Pré-condição:** Exercício adicionado, painel de conteúdo visível

**Passos:**
1. Hover sobre exercício no painel de conteúdo
2. Clicar botão X (delete)
3. Verificar toast e estado

**Esperado:** ✅ Exercício removido, toast "Exercício removido"

**Assertions:**
```javascript
const deleteBtn = document.querySelector('[data-testid="delete-exercise"]')
deleteBtn.click()
await new Promise(r => setTimeout(r, 100))
expect(screen.queryByText('Agachamento')).not.toBeInTheDocument()
expect(screen.getByText('Exercício removido')).toBeInTheDocument()
```

---

### T10: Copiar Exercício para Outra Aba

**Pré-condição:** Exercício adicionado na aba A, hover sobre exercício

**Passos:**
1. Clicar ícone Copy (📋)
2. Dropdown aparece com abas disponíveis
3. Clicar "Treino B"
4. Verificar estado

**Esperado:** ✅ Exercício copiado para aba B (existe em A e B agora), toast "Exercício copiado para Treino B"

**Assertions:**
```javascript
const copyBtn = document.querySelector('[data-testid="copy-exercise"]')
copyBtn.click()
await new Promise(r => setTimeout(r, 100))
const bOption = screen.getByText('Treino B')
bOption.click()
await new Promise(r => setTimeout(r, 100))
expect(sessionTabs[0].exerciseCount).toBe(1) // A tem 1
expect(sessionTabs[1].exerciseCount).toBe(1) // B tem 1
expect(screen.getByText(/Exercício copiado para Treino B/)).toBeInTheDocument()
```

---

### T11: Mover Exercício para Outra Aba

**Pré-condição:** Exercício adicionado na aba A, hover sobre exercício

**Passos:**
1. Clicar ícone Move (🔀)
2. Dropdown aparece com abas disponíveis
3. Clicar "Treino D"
4. Verificar estado

**Esperado:** ✅ Exercício movido de A para D (existe apenas em D agora), toast "Exercício movido para Treino D"

**Assertions:**
```javascript
const moveBtn = document.querySelector('[data-testid="move-exercise"]')
moveBtn.click()
await new Promise(r => setTimeout(r, 100))
const dOption = screen.getByText('Treino D')
dOption.click()
await new Promise(r => setTimeout(r, 100))
expect(sessionTabs[0].exerciseCount).toBe(0) // A vazia
expect(sessionTabs[3].exerciseCount).toBe(1) // D tem 1
expect(screen.getByText(/Exercício movido para Treino D/)).toBeInTheDocument()
```

---

### T12: Múltiplos Exercícios em Uma Aba

**Pré-condição:** Builder aberto, aba A ativa

**Passos:**
1. Adicionar 5 exercícios à aba A
2. Verificar contagem e ordem

**Esperado:** ✅ Aba A mostra "5 exercícios", numeração 1–5 no painel

**Assertions:**
```javascript
// Após adicionar 5 exercícios
expect(sessionTabs[0].exerciseCount).toBe(5)
const items = document.querySelectorAll('[data-testid="exercise-item"]')
expect(items).toHaveLength(5)
items.forEach((item, idx) => {
  expect(item.textContent).toContain(`${idx + 1}.`)
})
```

---

### T13: Drag-Start Visualização (Preparação para Drag-Drop Entre Abas)

**Pré-condição:** Exercício adicionado, hover sobre exercício

**Passos:**
1. Hover sobre exercício para ver ícone de grip (⋮⋮)
2. Verificar que o ícone é visível

**Esperado:** ✅ Ícone GripVertical visível no hover, cursor muda para move (grab)

**Assertions:**
```javascript
const item = document.querySelector('[data-testid="exercise-item"]')
const gripIcon = item.querySelector('svg') // GripVertical
expect(gripIcon).toBeVisible()
expect(window.getComputedStyle(item).cursor).toBe('move')
```

---

### T14: Prescrição Automática — Valores Padrão

**Pré-condição:** Exercício adicionado na aba A

**Passos:**
1. Verificar valores pré-preenchidos do exercício
2. Confirmar: 3 séries, 8-12 reps, 90s descanso

**Esperado:** ✅ Valores corretos exibidos

**Assertions:**
```javascript
const item = document.querySelector('[data-testid="exercise-item"]')
expect(item.textContent).toContain('3 séries')
expect(item.textContent).toContain('8–12 reps')
expect(item.textContent).toContain('90s') // rest_seconds
```

---

### T15: Anotações Contextuais (Se RLS + Restrições Implementadas)

**Pré-condição:** Cliente com restrição de padrão, Builder aberto

**Passos:**
1. Buscar exercício com padrão restrito na anamnese
2. Verificar anotação

**Esperado:** ✅ Badge 🔴 "Restrito" aparece no resultado

**Assertions:**
```javascript
// Requer anamnese com restrições preenchidas
expect(screen.getByText('🔴 Restrito')).toBeInTheDocument()
```

---

## Cobertura de Risco

| Risco | Teste | Mitigado? |
|-------|-------|-----------|
| RPC não existir | T1, T2 | ✅ (T2 prova RPC funciona) |
| Busca fuzzy não funcionar | T3, T4, T5 | ✅ (trigram, unaccent, alias) |
| Estado local divergir do servidor | T7–T11 | ✅ (toast + ação do servidor) |
| Aba não renderizar | T1 | ✅ |
| Dropdown não abrir | T10, T11 | ✅ |
| Prescrição automática errada | T14 | ✅ |

---

## Rodada Manual (Checklist)

Executar manualmente em navegador antes de merge:

- [ ] Página carrega sem erros
- [ ] Abas A–G renderizam
- [ ] Busca funciona (3 exemplos)
- [ ] Adicionar exercício na aba ativa
- [ ] Adicionar exercício em outra aba
- [ ] Desfazer funciona
- [ ] Delete funciona
- [ ] Copy dropdown funciona
- [ ] Move dropdown funciona
- [ ] Toast mensagens claras
- [ ] Estado local sincroniza com servidor (F12 Network)

---

## CI/CD Integration (Futuro)

```yaml
# .github/workflows/e2e-treino-builder.yml
test-treino-builder:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm ci && npm run test:e2e:treino-builder
```

---

**Última atualização:** 2026-07-30  
**Versão do Builder:** Fase 3 — Etapa 4 (Integração)
