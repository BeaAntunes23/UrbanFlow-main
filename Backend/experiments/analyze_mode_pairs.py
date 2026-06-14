from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List

import numpy as np
import pandas as pd

METRICS = [
    'avg_wait_time',
    'flow_rate',
    'co2_emissions',
    'emergency_response_time',
    'total_collisions',
    'collision_avoided',
    'vehicles_completed',
]

LOWER_IS_BETTER = {
    'avg_wait_time',
    'co2_emissions',
    'emergency_response_time',
    'total_collisions',
}


def permutation_pvalue(a: np.ndarray, b: np.ndarray, n_perm: int = 4000, seed: int = 20260301) -> float:
    rng = np.random.default_rng(seed)
    observed = float(np.mean(a) - np.mean(b))
    combined = np.concatenate([a, b])
    count = 0
    for _ in range(n_perm):
        rng.shuffle(combined)
        perm_a = combined[: len(a)]
        perm_b = combined[len(a) :]
        diff = float(np.mean(perm_a) - np.mean(perm_b))
        if abs(diff) >= abs(observed):
            count += 1
    return (count + 1) / (n_perm + 1)


def paired_permutation_pvalue(a: np.ndarray, b: np.ndarray, n_perm: int = 4000, seed: int = 20260301) -> float:
    rng = np.random.default_rng(seed)
    diffs = a - b
    observed = float(np.mean(diffs))
    count = 0

    for _ in range(n_perm):
        signs = rng.choice(np.array([1.0, -1.0]), size=len(diffs), replace=True)
        permuted = diffs * signs
        if abs(float(np.mean(permuted))) >= abs(observed):
            count += 1

    return (count + 1) / (n_perm + 1)


def bootstrap_ci_difference(a: np.ndarray, b: np.ndarray, n_boot: int = 3000, seed: int = 20260301) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    diffs: List[float] = []

    for _ in range(n_boot):
        sample_a = rng.choice(a, size=len(a), replace=True)
        sample_b = rng.choice(b, size=len(b), replace=True)
        diffs.append(float(np.mean(sample_a) - np.mean(sample_b)))

    lo, hi = np.percentile(diffs, [2.5, 97.5])
    return (float(lo), float(hi))


def paired_bootstrap_ci_difference(a: np.ndarray, b: np.ndarray, n_boot: int = 3000, seed: int = 20260301) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    diffs = a - b
    means: List[float] = []

    for _ in range(n_boot):
        sample = rng.choice(diffs, size=len(diffs), replace=True)
        means.append(float(np.mean(sample)))

    lo, hi = np.percentile(means, [2.5, 97.5])
    return (float(lo), float(hi))


def holm_bonferroni(pvalues: pd.Series) -> pd.Series:
    values = pvalues.to_numpy(dtype=float)
    m = len(values)
    adjusted = np.zeros(m, dtype=float)

    order = np.argsort(values)
    ranked = values[order]

    prev = 0.0
    for i, p in enumerate(ranked):
        factor = m - i
        candidate = min(1.0, p * factor)
        candidate = max(candidate, prev)
        adjusted[i] = candidate
        prev = candidate

    out = np.empty(m, dtype=float)
    out[order] = adjusted
    return pd.Series(out, index=pvalues.index)


def parse_mode_pairs(text: str, available: Iterable[str]) -> list[tuple[str, str]]:
    modes = sorted(set(str(m) for m in available))
    if text.strip().lower() == 'all':
        pairs: list[tuple[str, str]] = []
        for i in range(len(modes)):
            for j in range(i + 1, len(modes)):
                pairs.append((modes[i], modes[j]))
        return pairs

    pairs: list[tuple[str, str]] = []
    for item in text.split(','):
        if ':' not in item:
            continue
        a, b = [s.strip() for s in item.split(':', 1)]
        if a and b and a in modes and b in modes and a != b:
            pairs.append((a, b))

    return pairs


def pair_keys(df: pd.DataFrame) -> list[str]:
    if 'pair_id' in df.columns:
        return ['pair_id']

    keys: list[str] = []
    for column in ['scenario', 'repetition', 'seed']:
        if column in df.columns:
            keys.append(column)
    return keys


def build_paired_subset(subset: pd.DataFrame, mode_a: str, mode_b: str, metric: str) -> pd.DataFrame:
    keys = pair_keys(subset)
    if not keys:
        return pd.DataFrame()

    pivot = (
        subset[keys + ['mode', metric]]
        .pivot_table(index=keys, columns='mode', values=metric, aggfunc='mean')
        .dropna(subset=[mode_a, mode_b])
        .reset_index()
    )
    return pivot


def compare_pairs(df: pd.DataFrame, pairs: list[tuple[str, str]]) -> pd.DataFrame:
    rows = []
    scenarios = sorted(df['scenario'].unique()) if 'scenario' in df.columns else ['all']

    for scenario in scenarios:
        subset = df[df['scenario'] == scenario] if 'scenario' in df.columns else df

        for mode_a, mode_b in pairs:
            a_df = subset[subset['mode'] == mode_a]
            b_df = subset[subset['mode'] == mode_b]
            if a_df.empty or b_df.empty:
                continue

            for metric in METRICS:
                a_vals = a_df[metric].astype(float).to_numpy()
                b_vals = b_df[metric].astype(float).to_numpy()

                paired = build_paired_subset(subset, mode_a, mode_b, metric)
                if not paired.empty:
                    a_p = paired[mode_a].astype(float).to_numpy()
                    b_p = paired[mode_b].astype(float).to_numpy()
                    diff = float(np.mean(a_p) - np.mean(b_p))
                    pvalue = paired_permutation_pvalue(a_p, b_p)
                    ci_lo, ci_hi = paired_bootstrap_ci_difference(a_p, b_p)
                    analysis_type = 'paired'
                    n_pairs = int(len(paired))
                else:
                    diff = float(np.mean(a_vals) - np.mean(b_vals))
                    pvalue = permutation_pvalue(a_vals, b_vals)
                    ci_lo, ci_hi = bootstrap_ci_difference(a_vals, b_vals)
                    analysis_type = 'unpaired'
                    n_pairs = 0

                denominator = np.mean(b_vals)
                if metric in LOWER_IS_BETTER:
                    improvement_pct = float((np.mean(b_vals) - np.mean(a_vals)) / denominator * 100) if denominator else 0.0
                else:
                    improvement_pct = float((np.mean(a_vals) - np.mean(b_vals)) / denominator * 100) if denominator else 0.0

                rows.append(
                    {
                        'scenario': scenario,
                        'mode_a': mode_a,
                        'mode_b': mode_b,
                        'metric': metric,
                        'analysis_type': analysis_type,
                        'n_pairs': n_pairs,
                        'n_mode_a': int(len(a_vals)),
                        'n_mode_b': int(len(b_vals)),
                        'mode_a_mean': float(np.mean(a_vals)),
                        'mode_b_mean': float(np.mean(b_vals)),
                        'difference_a_minus_b': diff,
                        'difference_ci95_lo': ci_lo,
                        'difference_ci95_hi': ci_hi,
                        'improvement_percent': improvement_pct,
                        'pvalue_permutation': pvalue,
                    }
                )

    out = pd.DataFrame(rows)
    if out.empty:
        return out

    out['pvalue_holm'] = np.nan
    for scenario in sorted(out['scenario'].unique()):
        mask = out['scenario'] == scenario
        out.loc[mask, 'pvalue_holm'] = holm_bonferroni(out.loc[mask, 'pvalue_permutation'])

    return out


def to_markdown(df: pd.DataFrame, source_csv: Path) -> str:
    lines: list[str] = []
    lines.append('# Comparação Inferencial entre Modos')
    lines.append('')
    lines.append(f'Fonte de dados: {source_csv}')
    lines.append('')

    if df.empty:
        lines.append('Sem dados suficientes para comparação entre modos.')
        return '\n'.join(lines)

    for scenario in sorted(df['scenario'].unique()):
        lines.append(f'## Cenário: {scenario}')
        scoped = df[df['scenario'] == scenario]
        for _, row in scoped.iterrows():
            lines.append(
                f"- {row['mode_a']} vs {row['mode_b']} | {row['metric']}: "
                f"meanA={row['mode_a_mean']:.3f}, meanB={row['mode_b_mean']:.3f}, "
                f"Δ={row['difference_a_minus_b']:.3f}, "
                f"CI95=[{row['difference_ci95_lo']:.3f}, {row['difference_ci95_hi']:.3f}], "
                f"impr={row['improvement_percent']:.2f}%, "
                f"p={row['pvalue_permutation']:.4f}, p_holm={row['pvalue_holm']:.4f}"
            )
        lines.append('')

    lines.append('## Nota Metodológica')
    lines.append('- Teste de permutação com 4000 iterações (paired quando aplicável).')
    lines.append('- Intervalos de confiança via bootstrap (3000 amostras).')
    lines.append('- Correção de múltiplos testes por cenário via Holm-Bonferroni.')

    return '\n'.join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description='Comparação inferencial entre quaisquer pares de modos')
    parser.add_argument('--input', required=True, type=str, help='CSV de avaliação/campanha')
    parser.add_argument('--output-csv', required=True, type=str, help='CSV de saída com comparações')
    parser.add_argument('--output-md', required=True, type=str, help='Markdown de saída com resumo inferencial')
    parser.add_argument('--mode-pairs', type=str, default='all', help='Pares no formato a:b,c:d ou all')
    args = parser.parse_args()

    source_csv = Path(args.input).resolve()
    output_csv = Path(args.output_csv).resolve()
    output_md = Path(args.output_md).resolve()

    df = pd.read_csv(source_csv)
    required = {'mode', *METRICS}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f'CSV inválido. Colunas em falta: {sorted(missing)}')

    if 'scenario' not in df.columns:
        df['scenario'] = 'all'

    pairs = parse_mode_pairs(args.mode_pairs, df['mode'].unique())
    if not pairs:
        raise ValueError('Nenhum par de modos válido para comparar.')

    comparison_df = compare_pairs(df, pairs)

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    output_md.parent.mkdir(parents=True, exist_ok=True)

    comparison_df.to_csv(output_csv, index=False)
    output_md.write_text(to_markdown(comparison_df, source_csv), encoding='utf-8')

    payload = {
        'source_csv': str(source_csv),
        'mode_pairs': pairs,
        'rows': comparison_df.to_dict(orient='records'),
    }
    output_json = output_csv.with_suffix('.json')
    output_json.write_text(json.dumps(payload, indent=2), encoding='utf-8')

    print(f'[mode-pairs] csv: {output_csv}')
    print(f'[mode-pairs] md: {output_md}')
    print(f'[mode-pairs] json: {output_json}')


if __name__ == '__main__':
    main()
