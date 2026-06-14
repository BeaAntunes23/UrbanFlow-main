from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

METRIC_NAMES = {
    "avg_wait_time": "tempo médio de espera",
    "flow_rate": "taxa de fluxo",
    "co2_emissions": "emissões de CO2",
    "emergency_response_time": "tempo de resposta de emergência",
    "total_collisions": "colisões totais",
    "collision_avoided": "colisões evitadas",
    "light_avg_wait_time": "tempo médio de espera (ligeiros)",
    "heavy_avg_wait_time": "tempo médio de espera (pesados)",
    "light_completed": "veículos ligeiros concluídos",
    "heavy_completed": "veículos pesados concluídos",
}

LOWER_IS_BETTER = {
    "avg_wait_time",
    "co2_emissions",
    "emergency_response_time",
    "total_collisions",
    "light_avg_wait_time",
    "heavy_avg_wait_time",
}

RL_METRICS = [
    "avg_wait_time",
    "flow_rate",
    "co2_emissions",
    "emergency_response_time",
    "total_collisions",
]


def interpretation(metric: str, improvement: float) -> str:
    if metric in LOWER_IS_BETTER:
        direction = "redução" if improvement >= 0 else "aumento"
    else:
        direction = "aumento" if improvement >= 0 else "redução"

    return f"{direction} de {abs(improvement):.2f}%"


def _mode_metric_value(summary_df: pd.DataFrame, scenario: str, mode: str, metric: str) -> float | None:
    row = summary_df[(summary_df["scenario"] == scenario) & (summary_df["mode"] == mode)]
    if row.empty:
        return None

    column = f"{metric}_mean"
    if column not in row.columns:
        return None

    return float(row.iloc[0][column])


def _best_mode(summary_df: pd.DataFrame, scenario: str, metric: str) -> tuple[str, float] | tuple[None, None]:
    column = f"{metric}_mean"
    scenario_df = summary_df[summary_df["scenario"] == scenario]
    if scenario_df.empty or column not in scenario_df.columns:
        return None, None

    data = scenario_df[["mode", column]].dropna()
    if data.empty:
        return None, None

    if metric in LOWER_IS_BETTER:
        idx = data[column].idxmin()
    else:
        idx = data[column].idxmax()

    best_row = data.loc[idx]
    return str(best_row["mode"]), float(best_row[column])


def build_rl_section(rl_summary: dict) -> list[str]:
    lines: list[str] = []
    summary_rows = rl_summary.get("summary", [])
    if not summary_rows:
        return lines

    summary_df = pd.DataFrame(summary_rows)
    required_columns = {"scenario", "mode"}
    if not required_columns.issubset(set(summary_df.columns)):
        return lines

    lines.append("## Integração de RL na Comparação Final")
    lines.append("")
    lines.append(
        "Além da comparação principal IA vs Tradicional, foi incluída uma avaliação adicional com "
        "o agente **RL (Q-Learning)** para posicionar o seu desempenho relativo no mesmo conjunto de cenários."
    )

    cfg = rl_summary.get("config", {})
    repetitions = cfg.get("repetitions", "?")
    duration = cfg.get("duration", "?")
    dt = cfg.get("dt", "?")
    grid_size = cfg.get("gridSize", "?")

    lines.append("")
    lines.append("Configuração da avaliação RL:")
    lines.append(f"- repetições por cenário/modo: {repetitions};")
    lines.append(f"- duração por corrida: {duration}s; dt={dt};")
    lines.append(f"- dimensão da grelha: {grid_size}x{grid_size}.")
    lines.append("")
    lines.append("### Resultados RL por Cenário")
    lines.append("")

    for scenario in sorted(summary_df["scenario"].unique()):
        lines.append(f"#### {scenario}")

        ai_wait = _mode_metric_value(summary_df, scenario, "ai", "avg_wait_time")
        rl_wait = _mode_metric_value(summary_df, scenario, "rl", "avg_wait_time")
        trad_wait = _mode_metric_value(summary_df, scenario, "traditional", "avg_wait_time")

        ai_flow = _mode_metric_value(summary_df, scenario, "ai", "flow_rate")
        rl_flow = _mode_metric_value(summary_df, scenario, "rl", "flow_rate")
        trad_flow = _mode_metric_value(summary_df, scenario, "traditional", "flow_rate")

        ai_coll = _mode_metric_value(summary_df, scenario, "ai", "total_collisions")
        rl_coll = _mode_metric_value(summary_df, scenario, "rl", "total_collisions")
        trad_coll = _mode_metric_value(summary_df, scenario, "traditional", "total_collisions")

        if None not in (ai_wait, rl_wait, trad_wait):
            lines.append(
                f"- Espera média: RL={rl_wait:.3f}s, IA={ai_wait:.3f}s, Tradicional={trad_wait:.3f}s."
            )
        if None not in (ai_flow, rl_flow, trad_flow):
            lines.append(
                f"- Fluxo médio: RL={rl_flow:.3f} veíc/min, IA={ai_flow:.3f} veíc/min, Tradicional={trad_flow:.3f} veíc/min."
            )
        if None not in (ai_coll, rl_coll, trad_coll):
            lines.append(
                f"- Colisões totais: RL={rl_coll:.3f}, IA={ai_coll:.3f}, Tradicional={trad_coll:.3f}."
            )

        best_descriptions = []
        for metric in RL_METRICS:
            best_mode, best_value = _best_mode(summary_df, scenario, metric)
            if best_mode is None:
                continue
            metric_name = METRIC_NAMES.get(metric, metric)
            best_descriptions.append(f"{metric_name}: {best_mode.upper()} ({best_value:.3f})")

        if best_descriptions:
            lines.append("- Melhor modo por métrica: " + "; ".join(best_descriptions) + ".")

        lines.append("")

    lines.append("### Nota Metodológica")
    lines.append("")
    lines.append(
        "A comparação com RL neste capítulo é **descritiva** (médias por cenário/modo). "
        "Para conclusão inferencial forte, recomenda-se repetir a análise emparelhada e os testes "
        "estatísticos também para o modo RL no mesmo desenho experimental da comparação IA vs Tradicional."
    )
    lines.append("")

    return lines


def build_chapter(comparison_df: pd.DataFrame, source_csv: Path, rl_summary: dict | None = None) -> str:
    lines = []

    lines.append("# Capítulo de Resultados Experimentais")
    lines.append("")
    lines.append("## Metodologia Experimental")
    lines.append("")
    lines.append("Foi realizada uma campanha comparativa entre os modos de controlo **IA** e **Tradicional**,")
    lines.append("utilizando o mesmo ambiente de simulação, múltiplos cenários urbanos e repetições independentes.")
    lines.append("")
    lines.append(f"Fonte de dados da campanha: `{source_csv}`")
    lines.append("")
    lines.append("A análise considerou as métricas:")
    lines.append("- tempo médio de espera;")
    lines.append("- taxa de fluxo;")
    lines.append("- emissões de CO2;")
    lines.append("- tempo de resposta de emergência.")
    lines.append("- colisões totais;")
    lines.append("- colisões evitadas.")
    lines.append("- tempo médio de espera por classe (ligeiros e pesados);")
    lines.append("- volume concluído por classe (ligeiros e pesados).")
    lines.append("")
    lines.append("Para a inferência estatística foram usados:")
    lines.append("- intervalos de confiança (95%);")
    lines.append("- teste de permutação bilateral para diferença IA vs Tradicional.")
    lines.append("")
    lines.append("## Resultados por Cenário")
    lines.append("")

    for scenario in sorted(comparison_df["scenario"].unique()):
        lines.append(f"### {scenario}")
        scenario_df = comparison_df[comparison_df["scenario"] == scenario]

        for _, row in scenario_df.iterrows():
            metric = row["metric"]
            metric_name = METRIC_NAMES.get(metric, metric)
            improvement = float(row["improvement_percent"])
            pvalue = float(row["pvalue_permutation"])
            ai_mean = float(row["ai_mean"])
            trad_mean = float(row["traditional_mean"])
            diff = float(row["difference_ai_minus_traditional"])
            ci_lo = float(row["difference_ci95_lo"])
            ci_hi = float(row["difference_ci95_hi"])
            analysis_type = row.get("analysis_type", "unpaired")
            n_pairs = int(row.get("n_pairs", 0))
            n_ai = int(row.get("n_ai", 0))
            n_traditional = int(row.get("n_traditional", 0))

            if analysis_type == "paired":
                method_text = f"análise emparelhada (n pares={n_pairs})"
            else:
                method_text = f"análise não emparelhada (n IA={n_ai}, n Tradicional={n_traditional})"

            lines.append(
                f"- Na métrica **{metric_name}**, o modo IA apresentou média {ai_mean:.3f} "
                f"(Tradicional: {trad_mean:.3f}), com diferença IA-Tradicional de {diff:.3f} "
                f"(CI95: [{ci_lo:.3f}, {ci_hi:.3f}]), correspondendo a {interpretation(metric, improvement)}; "
                f"p={pvalue:.4f} ({method_text})."
            )

        lines.append("")

    if rl_summary:
        lines.extend(build_rl_section(rl_summary))

    lines.append("## Síntese")
    lines.append("")
    lines.append("De forma global, os resultados permitem quantificar ganhos e limitações do controlo IA")
    lines.append("em diferentes cenários. A interpretação final deve considerar simultaneamente magnitude")
    lines.append("do efeito, consistência entre cenários e significância estatística.")
    lines.append("")
    lines.append("## Figuras recomendadas")
    lines.append("")
    lines.append("- Boxplots por cenário e métrica (distribuição das corridas).")
    lines.append("- Barras com média e CI95 para IA vs Tradicional por cenário.")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Gerar capítulo académico de resultados")
    parser.add_argument(
        "--comparison",
        type=str,
        default=str(Path(__file__).resolve().parent / "results" / "comparison_ai_vs_traditional.csv"),
        help="CSV de comparação IA vs Tradicional",
    )
    parser.add_argument(
        "--source-csv",
        type=str,
        default=str(
            Path(__file__).resolve().parents[2]
            / "Frontend"
            / "experiments"
            / "results"
            / "latest.csv"
        ),
        help="CSV bruto da campanha",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parent / "results" / "capitulo_resultados.md"),
        help="Ficheiro markdown de saída",
    )
    parser.add_argument(
        "--rl-summary",
        type=str,
        default=str(
            Path(__file__).resolve().parents[2]
            / "Frontend"
            / "experiments"
            / "results"
            / "rl_evaluation_summary_latest.json"
        ),
        help="Resumo JSON da avaliação RL (opcional)",
    )
    args = parser.parse_args()

    comparison_path = Path(args.comparison).resolve()
    source_csv = Path(args.source_csv).resolve()
    output = Path(args.output).resolve()
    rl_summary_path = Path(args.rl_summary).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    comparison_df = pd.read_csv(comparison_path)

    rl_summary = None
    if rl_summary_path.exists():
        try:
            rl_summary = json.loads(rl_summary_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            rl_summary = None

    chapter_md = build_chapter(comparison_df, source_csv, rl_summary=rl_summary)
    output.write_text(chapter_md, encoding="utf-8")

    print(f"[chapter] {output}")


if __name__ == "__main__":
    main()
