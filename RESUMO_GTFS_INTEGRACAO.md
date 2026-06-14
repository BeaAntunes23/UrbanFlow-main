# Resumo: Integração GTFS no UrbanFlow AI

**Data:** 17 de março de 2026  
**Situação:** Concluído com sucesso

## O Que Foi Feito

### 1. Validação e Processamento de GTFS
- ✅ Descarregado feed GTFS real: **TUB Braga** (1.74 MB)
- ✅ Validação completa com `gtfs_validate_and_summarize.py`
- ✅ Extração de dados: 1994 paragens, 80 rotas, 2065 viagens ativas no dia 17/03/2026

### 2. Perfil de Tráfego Dinâmico
- ✅ Conversão GTFS → Perfil de tráfego por hora (departures_by_hour)
- ✅ Inferência automática de composição de frota:
  - **Carros:** 60%
  - **Autocarros:** 35%
  - **Ambulâncias:** 5%
- ✅ Geração de `gtfs_traffic_profile_latest.json`

### 3. Integração no Motor de Simulação
- ✅ Método `setTrafficProfile()` no engine.js
- ✅ Cálculo dinâmico de `flow_factor` por hora (min=0.45, max=2.6)
- ✅ Adaptação de `spawnInterval` baseada em dados GTFS reais
- ✅ Propagação automática para shadow engine

### 4. Campanha Experimental com GTFS
- ✅ Executada: 240 corridas (30×4 cenários × 2 modos)
- ✅ Emparelhamento por seed: mesma corrida AI vs Traditional
- ✅ Resultados exportados: `campaign_2026-03-17T14-30-05-201Z.csv`

### 5. Análise Estatística Completa
- ✅ Teste de permutação pareado por cenário
- ✅ Intervalo de confiança 95% (bootstrap)
- ✅ Correção Holm-Bonferroni para múltiplos testes
- ✅ Relatório: `analise_experimental.md`
- ✅ Capítulo de resultados: `capitulo_resultados_gtfs.md`

### 6. Visualização Interativa
- ✅ Mapa Leaflet com 1994 paragens GTFS
- ✅ Marcadores coloridos por atividade (intensidade)
- ✅ Painel lateral com picos horários e top paragens
- ✅ Integração na UI: nova aba "GTFS Map"

## Resultados Principais

### Confirmação de Hipóteses (AI vs Traditional)

| Métrica | Sig. | Cenários | Melhoria Média |
|---------|------|----------|---|
| **Tempo Médio de Espera** | ✓ | 4/4 | -57.32% |
| **Taxa de Fluxo** | ✓ | 4/4 | +156.70% |
| **Tempo Resposta Emergência** | ✓ | 4/4 | -89.03% |
| **Colisões Totais** | ✓ | 4/4 | -8.05% |
| **Veículos Ligeiros Completos** | ✓ | 4/4 | +100.72% |
| **Veículos Pesados Completos** | ✓ | 4/4 | +174.88% |
| **CO2 (não significativo)** | ✗ | 0/4 | -4.48% |

### Observação Chave
O modo IA apresenta desempenho **consistentemente superior** em 6 das 10 métricas avaliadas com significância estatística forte (p_holm < 0.05 em todos os 4 cenários).

## Ficheiros Gerados Nesta Sessão

### Backend (Python)
- `experiments/export_gtfs_map_data.py` — Exportador de dados para mapa
- Resultados:
  - `experiments/results/gtfs_summary_latest.json`
  - `experiments/results/comparison_ai_vs_traditional.csv`
  - `experiments/results/analise_experimental.md`
  - `experiments/results/capitulo_resultados_gtfs.md`

### Frontend (React/JavaScript)
- `src/componentes/dashboard/GtfsMapView.js` — Novo componente de mapa
- `scripts/build-gtfs-traffic-profile.cjs` — Builder de perfil
- `scripts/export-gtfs-map.ps1` — Automação PowerShell
- Dados públicos:
  - `public/data/gtfs_map_latest.json` — Dataset interativo

### Configuração
- `Frontend/package.json` — Adicionadas dependências (leaflet, react-leaflet)
- `App.js` — Integração de nova aba "GTFS Map"
- `package.json` — Scripts: `gtfs:map:data`, `experiment:run:gtfs`

## Como Usar Agora

### Ver o Mapa GTFS Interativo
```bash
cd Frontend
npm start
# Navegar para aba "GTFS Map"
```

### Regenerar Dados (com novo feed GTFS)
```bash
npm run gtfs:map:data
# Ou manualmente:
# powershell -ExecutionPolicy Bypass -File ../scripts/export-gtfs-map.ps1 -GtfsPath "seu_feed.zip"
```

### Reexecutar Campanha com Perfil GTFS
```bash
npm run experiment:run:gtfs
# Depois: Backend análise
python experiments/analyze_campaign.py ...
```

## Próximos Passos (Recomendados)

1. **Desenho de Shapes:** Renderizar linhas/percursos GTFS no mapa, além de paragens
2. **Filtros Interativos:** Permitir filtrar por hora, rota, zona geográfica
3. **Multi-Feed:** Selector para trocar entre diferentes feeds GTFS
4. **Comparação Temporal:** Análise de impacto do tráfego por hora do dia
5. **Integração de Dados Reais:** Usar matriz OD (origem-destino) de GTFS para seed inicial

## Repositório e Rastreabilidade

- **Commit Git:** Registado antes de qualquer alteração
- **Manifesto de Reprodutibilidade:** `repro_manifest_2026-03-17T*.json`
- **Pasta de Resultados:** `Backend/experiments/results/` e `Frontend/experiments/results/`

## Conclusão

A integração de GTFS no UrbanFlow AI foi bem-sucedida e demonstra:
✅ Viabilidade técnica de alimentar simulador com dados de trânsito reais
✅ Mantém compatibilidade com protocolo experimental existente
✅ Valida hipóteses com novos dados de tráfego urbano (TUB Braga)
✅ Oferece visualização interativa para exploração de dados GTFS

---

**Status para Defesa:** Pronto. Todos os artefactos gerados, validados e documentados.
