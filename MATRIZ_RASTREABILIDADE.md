# Matriz de Rastreabilidade (Documento -> Código -> Artefacto)

## RL - Parâmetros e Estado

- alpha=0.2, gamma=0.9, epsilon inicial=0.25
- Fonte de verdade:
  - Frontend/src/componentes/simulation/engine.js
- Artefactos:
  - Frontend/experiments/results/rl_policy_latest.json
  - Frontend/experiments/results/rl_training_history_latest.csv

## Campanha AI vs Traditional

- Pareamento por cenário+repetição+seed
- Fonte de verdade:
  - Frontend/scripts/run-experiments.cjs
- Artefactos:
  - Frontend/experiments/results/latest.csv
  - Frontend/experiments/results/latest.json

## Avaliação RL (AI vs Traditional vs RL)

- Repetições emparelhadas por seed
- Fonte de verdade:
  - Frontend/scripts/evaluate-rl-agent.cjs
- Artefactos:
  - Frontend/experiments/results/rl_evaluation_latest.csv
  - Frontend/experiments/results/rl_evaluation_summary_latest.json

## Inferência Estatística

- AI vs Traditional + correção Holm por cenário:
  - Backend/experiments/analyze_campaign.py
- Comparação inferencial entre quaisquer pares de modos (incluindo RL):
  - Backend/experiments/analyze_mode_pairs.py
- Artefactos:
  - Backend/experiments/results/comparison_ai_vs_traditional.csv
  - Backend/experiments/results/comparison_mode_pairs_ai_vs_traditional.csv
  - Backend/experiments/results/comparison_mode_pairs_rl.csv

## Estudos de Robustez

- Ablation AI:
  - Frontend/scripts/run-ablation.cjs
  - Resultado: Frontend/experiments/results/ablation_summary_latest.json

- Sensibilidade (grid/duração):
  - Frontend/scripts/run-sensitivity.cjs
  - Resultado: Frontend/experiments/results/sensitivity_summary_latest.json

## Custo Computacional

- Treino RL grava runtime e custo médio por episódio:
  - Frontend/scripts/train-rl-agent.cjs
- Avaliação RL grava runtime e custo médio por corrida:
  - Frontend/scripts/evaluate-rl-agent.cjs

## Reprodutibilidade One-Command

- Script principal:
  - scripts/reproduce-excellence.ps1
- Manifesto reproduzível (hash+artefactos):
  - Backend/experiments/results/repro_manifest_*.json

## Unidades

- Emissões CO2 reportadas como kg-equivalente na interface e relatório.
- Recomenda-se manter esta convenção em todos os ficheiros CSV/JSON de saída.
