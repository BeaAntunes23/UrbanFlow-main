import pytest
from rule_engine import (
    translate_rule_text,
    _normalize,
    _extract_target,
    _extract_scenario,
    _extract_time_window,
    _extract_seconds,
    _extract_reduce_wait_factor,
)


class TestNormalize:
    def test_lowercase(self):
        assert _normalize("HELLO") == "hello"

    def test_removes_accents(self):
        assert _normalize("Emergência") == "emergencia"
        assert _normalize("Acidente") == "acidente"
        assert _normalize("Peão") == "peao"
        assert _normalize("Prioridade") == "prioridade"

    def test_empty_string(self):
        assert _normalize("") == ""


class TestExtractTarget:
    def test_ambulance_keyword(self):
        assert _extract_target("priorizar ambulancia") == "ambulance"

    def test_emergency_keyword(self):
        assert _extract_target("situacao de emergencia") == "ambulance"

    def test_socorro_keyword(self):
        assert _extract_target("dar passagem ao socorro") == "ambulance"

    def test_bus_autocarro(self):
        assert _extract_target("priorizar autocarro") == "bus"

    def test_bus_onibus(self):
        assert _extract_target("dar passagem ao onibus") == "bus"

    def test_bus_keyword(self):
        assert _extract_target("priorizar bus") == "bus"

    def test_car_carro(self):
        assert _extract_target("bloquear carro") == "car"

    def test_car_automovel(self):
        assert _extract_target("restringir automovel") == "car"

    def test_car_veiculo(self):
        assert _extract_target("controlar veiculo") == "car"

    def test_pedestrian_peao(self):
        assert _extract_target("priorizar peao") == "pedestrian"

    def test_pedestrian_pedestre(self):
        assert _extract_target("priorizar pedestre") == "pedestrian"

    def test_default_all(self):
        assert _extract_target("aumentar tempo verde") == "all"

    def test_ambulance_takes_priority_over_bus(self):
        # ambulance keywords come first in the check chain
        assert _extract_target("ambulancia e autocarro") == "ambulance"


class TestExtractScenario:
    def test_rush_hour(self):
        assert _extract_scenario("hora de ponta") == "rush_hour"

    def test_rush_keyword(self):
        assert _extract_scenario("rush") == "rush_hour"

    def test_pico_keyword(self):
        assert _extract_scenario("hora de pico") == "rush_hour"

    def test_accident_acidente(self):
        assert _extract_scenario("acidente na via") == "accident"

    def test_accident_colisao(self):
        assert _extract_scenario("colisao registada") == "accident"

    def test_emergency_emergencia(self):
        assert _extract_scenario("emergencia") == "emergency"

    def test_emergency_ambulancia(self):
        assert _extract_scenario("ambulancia a caminho") == "emergency"

    def test_emergency_socorro(self):
        assert _extract_scenario("socorro na estrada") == "emergency"

    def test_normal(self):
        assert _extract_scenario("fluxo normal") == "normal"

    def test_no_match(self):
        assert _extract_scenario("aumentar verde") is None


class TestExtractTimeWindow:
    def test_valid_window_with_e(self):
        start, end = _extract_time_window("entre 08:00 e 09:00")
        assert start == "08:00"
        assert end == "09:00"

    def test_valid_window_with_ate(self):
        start, end = _extract_time_window("entre 17:30 ate 19:00")
        assert start == "17:30"
        assert end == "19:00"

    def test_no_window(self):
        start, end = _extract_time_window("priorizar ambulancias")
        assert start is None
        assert end is None

    def test_case_insensitive(self):
        start, end = _extract_time_window("ENTRE 08:00 E 09:00")
        assert start == "08:00"
        assert end == "09:00"

    def test_single_digit_hour(self):
        start, end = _extract_time_window("entre 8:00 e 9:30")
        assert start == "8:00"
        assert end == "9:30"


class TestExtractSeconds:
    def test_seconds_full_word(self):
        assert _extract_seconds("aumentar para 30 segundos") == 30

    def test_seconds_abbrev_s(self):
        assert _extract_seconds("tempo de 45s") == 45

    def test_seconds_abbrev_seg(self):
        assert _extract_seconds("15 seg verde") == 15

    def test_minutes_full_word(self):
        assert _extract_seconds("2 minutos de verde") == 120

    def test_minutes_abbrev_min(self):
        assert _extract_seconds("3 min verde") == 180

    def test_bare_number_with_semaforo(self):
        assert _extract_seconds("semaforo 20") == 20

    def test_bare_number_with_tempo(self):
        assert _extract_seconds("tempo 25") == 25

    def test_bare_number_with_verde(self):
        assert _extract_seconds("verde 15") == 15

    def test_no_match(self):
        assert _extract_seconds("priorizar emergencia") is None


class TestExtractReduceWaitFactor:
    def test_percentage_50(self):
        assert _extract_reduce_wait_factor("reduzir espera 50%") == pytest.approx(0.5)

    def test_percentage_30(self):
        assert _extract_reduce_wait_factor("reduzir espera 30%") == pytest.approx(0.7)

    def test_percentage_100_clamped(self):
        # 100% reduction is clamped to factor 0.1
        assert _extract_reduce_wait_factor("reduzir espera 100%") == pytest.approx(0.1)

    def test_percentage_0_clamped(self):
        # 0% reduction stays at 1.0, clamped to max 1.0
        assert _extract_reduce_wait_factor("reduzir espera 0%") == pytest.approx(1.0)

    def test_keyword_reduzir_espera(self):
        assert _extract_reduce_wait_factor("reduzir espera") == pytest.approx(0.8)

    def test_keyword_diminuir_espera(self):
        assert _extract_reduce_wait_factor("diminuir espera") == pytest.approx(0.8)

    def test_keyword_aliviar_fila(self):
        assert _extract_reduce_wait_factor("aliviar fila") == pytest.approx(0.8)

    def test_keyword_descongestionar(self):
        assert _extract_reduce_wait_factor("descongestionar via") == pytest.approx(0.8)

    def test_no_match(self):
        assert _extract_reduce_wait_factor("priorizar ambulancia") is None


class TestTranslateRuleText:
    def test_priority_rule_structure(self):
        result = translate_rule_text("Priorizar ambulancias")
        assert result["type"] == "priority"
        assert result["action"]["green_priority"] is True
        assert result["action"]["block_intersection"] is False
        assert result["action"]["extend_green_seconds"] is None
        assert result["action"]["reduce_wait_factor"] is None

    def test_priority_target_ambulance(self):
        result = translate_rule_text("Priorizar ambulancias")
        assert result["target"] == "ambulance"

    def test_priority_bus(self):
        result = translate_rule_text("Dar prioridade ao autocarro")
        assert result["type"] == "priority"
        assert result["target"] == "bus"

    def test_block_rule(self):
        result = translate_rule_text("Bloquear intersecao central")
        assert result["type"] == "block"
        assert result["action"]["block_intersection"] is True
        assert result["action"]["green_priority"] is False

    def test_block_keywords(self):
        for keyword in ["fechar", "interditar", "cortar"]:
            result = translate_rule_text(f"{keyword} a via")
            assert result["type"] == "block", f"Expected block for '{keyword}'"

    def test_density_rule(self):
        result = translate_rule_text("Reduzir espera em 30% na hora de ponta")
        assert result["type"] == "density"
        assert result["action"]["reduce_wait_factor"] == pytest.approx(0.7)
        assert result["conditions"]["scenario"] == "rush_hour"

    def test_density_default_factor(self):
        # "fluxo" triggers density but has no percentage or keyword match in
        # _extract_reduce_wait_factor, so the default 0.85 is used
        result = translate_rule_text("Aumentar fluxo de veiculos")
        assert result["type"] == "density"
        assert result["action"]["reduce_wait_factor"] == pytest.approx(0.85)

    def test_timing_rule_with_seconds(self):
        result = translate_rule_text("Aumentar verde para 45 segundos")
        assert result["type"] == "timing"
        assert result["action"]["extend_green_seconds"] == 45

    def test_timing_default_seconds(self):
        result = translate_rule_text("Aumentar tempo verde semaforo")
        assert result["type"] == "timing"
        assert result["action"]["extend_green_seconds"] == 10

    def test_result_has_all_keys(self):
        result = translate_rule_text("Priorizar autocarros na hora de ponta")
        assert set(result.keys()) == {"type", "target", "conditions", "action", "description_pt"}
        assert set(result["conditions"].keys()) == {"time_start", "time_end", "scenario", "location"}
        assert set(result["action"].keys()) == {
            "green_priority", "extend_green_seconds", "block_intersection", "reduce_wait_factor"
        }

    def test_conditions_location_always_all(self):
        result = translate_rule_text("Qualquer regra")
        assert result["conditions"]["location"] == "all"

    def test_time_window_in_conditions(self):
        result = translate_rule_text("Priorizar autocarros entre 08:00 e 09:00")
        assert result["conditions"]["time_start"] == "08:00"
        assert result["conditions"]["time_end"] == "09:00"

    def test_no_time_window_gives_none(self):
        result = translate_rule_text("Priorizar ambulancias")
        assert result["conditions"]["time_start"] is None
        assert result["conditions"]["time_end"] is None

    def test_description_preserved(self):
        text = "Priorizar ambulancias no centro"
        result = translate_rule_text(text)
        assert result["description_pt"] == text

    def test_empty_text_fallback_description(self):
        result = translate_rule_text("")
        assert result["description_pt"] == "Regra traduzida localmente"

    def test_whitespace_only_fallback_description(self):
        result = translate_rule_text("   ")
        assert result["description_pt"] == "Regra traduzida localmente"

    def test_accented_priority_input(self):
        result = translate_rule_text("Dar preferência à ambulância")
        assert result["type"] == "priority"
        assert result["target"] == "ambulance"

    def test_accented_block_input(self):
        result = translate_rule_text("Interditar cruzamento em situação de acidente")
        assert result["type"] == "block"
        assert result["conditions"]["scenario"] == "accident"

    def test_accident_scenario_detected(self):
        result = translate_rule_text("Gerir trafego em caso de acidente")
        assert result["conditions"]["scenario"] == "accident"

    def test_emergency_scenario_detected(self):
        result = translate_rule_text("Priorizar ambulancia em emergencia")
        assert result["conditions"]["scenario"] == "emergency"
