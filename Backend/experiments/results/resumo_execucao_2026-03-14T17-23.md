# Resumo da execucao 2026-03-14T17-23

## Contexto da corrida
- Campanha principal: campaign_2026-03-14T17-23-15-805Z
- Repeticoes por modo e cenario (campanha principal): 30
- Manifesto de reproducao: repro_manifest_2026-03-14T17-23-12.json

## Resultado principal (AI vs Traditional)
Conclusao: o modo AI manteve vantagem forte e consistente em todos os cenarios para as metricas operacionais principais.

Evidencia inferencial (Holm-Bonferroni, arquivo comparison_mode_pairs_ai_vs_traditional.csv):
- avg_wait_time: significativo em 4/4 cenarios (p_holm = 0.0017495626)
- flow_rate: significativo em 4/4 cenarios (p_holm = 0.0017495626)
- emergency_response_time: significativo em 4/4 cenarios (p_holm = 0.0017495626)
- total_collisions: significativo em 4/4 cenarios (p_holm = 0.0017495626)
- vehicles_completed: significativo em 4/4 cenarios (p_holm = 0.0017495626)

Leitura por cenario (medias):
- accident: espera 25.05s (AI) vs 65.64s (Traditional), fluxo 5.77 vs 2.31, colisoes 55.97 vs 63.97
- emergency: espera 17.48s vs 69.71s, fluxo 9.64 vs 3.39, colisoes 46.77 vs 60.33
- normal: espera 32.19s vs 70.41s, fluxo 6.24 vs 3.12, colisoes 42.33 vs 48.93
- rush_hour: espera 19.82s vs 46.77s, fluxo 8.15 vs 2.80, colisoes 222.57 vs 235.17

## CO2 e collision_avoided (AI vs Traditional)
- co2_emissions: melhoria clara apenas em emergency (p_holm = 0.0017495626); sem significancia nos outros cenarios (accident, normal, rush_hour).
- collision_avoided: sem diferenca estatisticamente significativa na generalidade (p_holm > 0.22).

## RL no benchmark inferencial (AI, RL, Traditional)
Arquivo: comparison_mode_pairs_rl.csv

Sinais mais robustos:
- AI vs RL:
  - avg_wait_time: AI melhor e significativo em accident e emergency.
  - flow_rate e vehicles_completed: vantagem de AI em accident e emergency; em rush_hour a diferenca nao ficou significativa apos Holm.
- RL vs Traditional:
  - RL mostrou ganhos consistentes em rush_hour e normal para avg_wait_time, flow_rate e vehicles_completed.
  - Em emergency e accident os ganhos de RL foram mais heterogeneos e nem sempre significativos apos Holm.

## Sintese para texto de relatorio
"Nesta execucao, o controlador AI superou de forma estatisticamente robusta o baseline Traditional nas metricas de desempenho operacional centrais (espera media, fluxo, resposta a emergencia, colisoes totais e veiculos concluidos), com consistencia em todos os cenarios e correccao de multiplicidade por Holm-Bonferroni. Os resultados de emissao de CO2 foram cenario-dependentes, com evidencia forte apenas no cenario emergency. O agente RL apresentou comportamento competitivo face ao baseline em varios cenarios, mas com estabilidade inferencial inferior a AI."