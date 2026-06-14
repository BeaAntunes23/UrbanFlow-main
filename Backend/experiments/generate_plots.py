from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

METRIC_LABELS = {
    "avg_wait_time": "Tempo médio de espera (s)",
    "flow_rate": "Taxa de fluxo (veíc/min)",
    "co2_emissions": "Emissões de CO2 (kg)",
    "emergency_response_time": "Tempo de resposta emergência (s)",
    "total_collisions": "Colisões totais (contagem)",
    "collision_avoided": "Colisões evitadas (contagem)",
    "light_avg_wait_time": "Espera média — ligeiros (s)",
    "heavy_avg_wait_time": "Espera média — pesados (s)",
    "light_completed": "Ligeiros concluídos (contagem)",
    "heavy_completed": "Pesados concluídos (contagem)",
}

PLOT_METRICS = list(METRIC_LABELS.keys())


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def make_boxplots(raw_df: pd.DataFrame, output_dir: Path) -> list[Path]:
    files = []

    for metric in PLOT_METRICS:
        scenarios = sorted(raw_df["scenario"].unique())
        fig, axes = plt.subplots(1, len(scenarios), figsize=(4.8 * len(scenarios), 4.8), sharey=True)

        if len(scenarios) == 1:
            axes = [axes]

        for idx, scenario in enumerate(scenarios):
            ax = axes[idx]
            subset = raw_df[raw_df["scenario"] == scenario]
            ai_values = subset[subset["mode"] == "ai"][metric].astype(float).to_numpy()
            trad_values = subset[subset["mode"] == "traditional"][metric].astype(float).to_numpy()

            ax.boxplot([trad_values, ai_values], tick_labels=["Tradicional", "IA"], patch_artist=True)
            ax.set_title(f"{scenario}")
            ax.set_xlabel("Modo")
            if idx == 0:
                ax.set_ylabel(METRIC_LABELS[metric])
            ax.grid(alpha=0.25, axis="y")

        fig.suptitle(f"Distribuição por cenário — {METRIC_LABELS[metric]}")
        fig.tight_layout()

        out = output_dir / f"boxplot_{metric}.png"
        fig.savefig(out, dpi=180)
        plt.close(fig)
        files.append(out)

    return files


def make_ci_bars(summary_df: pd.DataFrame, output_dir: Path) -> list[Path]:
    files = []

    for metric in PLOT_METRICS:
        scenarios = sorted(summary_df["scenario"].unique())

        trad_means = []
        trad_err_low = []
        trad_err_high = []

        ai_means = []
        ai_err_low = []
        ai_err_high = []

        for scenario in scenarios:
            trad_row = summary_df[(summary_df["scenario"] == scenario) & (summary_df["mode"] == "traditional")].iloc[0]
            ai_row = summary_df[(summary_df["scenario"] == scenario) & (summary_df["mode"] == "ai")].iloc[0]

            t_mean = float(trad_row[f"{metric}_mean"])
            t_lo = float(trad_row[f"{metric}_ci95_lo"])
            t_hi = float(trad_row[f"{metric}_ci95_hi"])

            a_mean = float(ai_row[f"{metric}_mean"])
            a_lo = float(ai_row[f"{metric}_ci95_lo"])
            a_hi = float(ai_row[f"{metric}_ci95_hi"])

            trad_means.append(t_mean)
            trad_err_low.append(max(0.0, t_mean - t_lo))
            trad_err_high.append(max(0.0, t_hi - t_mean))

            ai_means.append(a_mean)
            ai_err_low.append(max(0.0, a_mean - a_lo))
            ai_err_high.append(max(0.0, a_hi - a_mean))

        x = np.arange(len(scenarios))
        width = 0.35

        fig, ax = plt.subplots(figsize=(11, 5.2))
        ax.bar(
            x - width / 2,
            trad_means,
            width,
            label="Tradicional",
            yerr=np.array([trad_err_low, trad_err_high]),
            capsize=4,
        )
        ax.bar(
            x + width / 2,
            ai_means,
            width,
            label="IA",
            yerr=np.array([ai_err_low, ai_err_high]),
            capsize=4,
        )

        ax.set_xticks(x)
        ax.set_xticklabels(scenarios)
        ax.set_ylabel(METRIC_LABELS[metric])
        ax.set_title(f"Média e CI95 por cenário — {METRIC_LABELS[metric]}")
        ax.legend()
        ax.grid(alpha=0.25, axis="y")

        fig.tight_layout()
        out = output_dir / f"bar_ci_{metric}.png"
        fig.savefig(out, dpi=180)
        plt.close(fig)
        files.append(out)

    return files


def main() -> None:
    parser = argparse.ArgumentParser(description="Gerar gráficos da campanha UrbanFlow")
    parser.add_argument(
        "--raw",
        type=str,
        default=str(
            Path(__file__).resolve().parents[2]
            / "Frontend"
            / "experiments"
            / "results"
            / "latest.csv"
        ),
        help="CSV bruto (corridas individuais)",
    )
    parser.add_argument(
        "--summary",
        type=str,
        default=str(Path(__file__).resolve().parent / "results" / "summary_by_mode.csv"),
        help="CSV de resumo por cenário/modo",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).resolve().parent / "results" / "figuras"),
        help="Diretório de saída para PNG",
    )
    args = parser.parse_args()

    raw_path = Path(args.raw).resolve()
    summary_path = Path(args.summary).resolve()
    output_dir = Path(args.output_dir).resolve()
    ensure_dir(output_dir)

    raw_df = pd.read_csv(raw_path)
    summary_df = pd.read_csv(summary_path)

    files = []
    files.extend(make_boxplots(raw_df, output_dir))
    files.extend(make_ci_bars(summary_df, output_dir))

    for file in files:
        print(f"[plot] {file}")


if __name__ == "__main__":
    main()
