import re
import unicodedata


def _normalize(text: str) -> str:
  normalized = unicodedata.normalize("NFKD", text.lower())
  return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _extract_target(text: str) -> str:
  if any(token in text for token in ["ambulancia", "emergencia", "socorro"]):
    return "ambulance"
  if any(token in text for token in ["autocarro", "onibus", "bus"]):
    return "bus"
  if any(token in text for token in ["carro", "automovel", "veiculo"]):
    return "car"
  if any(token in text for token in ["peao", "pedestre"]):
    return "pedestrian"
  return "all"


def _extract_scenario(text: str) -> str | None:
  if any(token in text for token in ["hora de ponta", "rush", "pico"]):
    return "rush_hour"
  if any(token in text for token in ["acidente", "colisao"]):
    return "accident"
  if any(token in text for token in ["emergencia", "ambulancia", "socorro"]):
    return "emergency"
  if "normal" in text:
    return "normal"
  return None


def _extract_time_window(original_text: str) -> tuple[str | None, str | None]:
  match = re.search(
    r"entre\s+(\d{1,2}:\d{2})\s+(?:e|ate)\s+(\d{1,2}:\d{2})",
    original_text,
    flags=re.IGNORECASE,
  )
  if not match:
    return None, None
  return match.group(1), match.group(2)


def _extract_seconds(text: str) -> int | None:
  match_sec = re.search(r"(\d+)\s*(?:s|seg|segundo|segundos)\b", text)
  if match_sec:
    return int(match_sec.group(1))

  match_min = re.search(r"(\d+)\s*(?:m|min|minuto|minutos)\b", text)
  if match_min:
    return int(match_min.group(1)) * 60

  bare_number = re.search(r"\b(\d{1,3})\b", text)
  if bare_number and any(token in text for token in ["verde", "semaforo", "tempo", "fase"]):
    return int(bare_number.group(1))

  return None


def _extract_reduce_wait_factor(text: str) -> float | None:
  pct = re.search(r"(\d{1,2}|100)\s*%", text)
  if pct:
    percent = float(pct.group(1))
    return round(max(0.1, min(1.0, 1.0 - percent / 100.0)), 2)

  if any(token in text for token in ["reduzir espera", "diminuir espera", "aliviar fila", "descongestionar"]):
    return 0.8
  return None


def translate_rule_text(text: str) -> dict:
  original_text = text.strip()
  normalized = _normalize(original_text)

  rule_type = "timing"
  if any(token in normalized for token in ["bloquear", "fechar", "interditar", "cortar"]):
    rule_type = "block"
  elif any(token in normalized for token in ["prioridade", "priorizar", "dar prioridade", "preferencia"]):
    rule_type = "priority"
  elif any(token in normalized for token in ["densidade", "congestion", "fila", "espera", "fluxo"]):
    rule_type = "density"

  target = _extract_target(normalized)
  scenario = _extract_scenario(normalized)
  time_start, time_end = _extract_time_window(original_text)
  extend_seconds = _extract_seconds(normalized)
  reduce_wait_factor = _extract_reduce_wait_factor(normalized)

  action = {
    "green_priority": False,
    "extend_green_seconds": None,
    "block_intersection": False,
    "reduce_wait_factor": None,
  }

  if rule_type == "priority":
    action["green_priority"] = True
  elif rule_type == "block":
    action["block_intersection"] = True
  elif rule_type == "timing":
    action["extend_green_seconds"] = extend_seconds if extend_seconds is not None else 10
  elif rule_type == "density":
    action["reduce_wait_factor"] = reduce_wait_factor if reduce_wait_factor is not None else 0.85

  return {
    "type": rule_type,
    "target": target,
    "conditions": {
      "time_start": time_start,
      "time_end": time_end,
      "scenario": scenario,
      "location": "all",
    },
    "action": action,
    "description_pt": original_text or "Regra traduzida localmente",
  }
