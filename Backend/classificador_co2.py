# Função para classificar emissões de CO2 de veículos
# Baseado em fatores reais de emissão (EURO 6 / Agência Europeia do Ambiente - EEA)
# Carro: ~120 g/km, Autocarro: ~820 g/km, Ambulância: ~250 g/km
# Limiares em kg CO2 total emitido durante a simulação:
# Bom:       <= 50 kg  (tráfego baixo / simulação curta)
# Aceitável: > 50-200 kg (tráfego urbano moderado)
# Elevado:   > 200 kg  (tráfego intenso / simulação longa)

def classificar_co2(valor_co2):
    """
    Classifica as emissões de CO2 de veículos em três categorias,
    baseado em fatores reais de emissão EURO 6 / EEA:
    - Bom:       <= 50 kg  (tráfego baixo)
    - Aceitável: > 50-200 kg (tráfego moderado)
    - Elevado:   > 200 kg  (tráfego intenso)
    """
    if valor_co2 <= 50:
        return "Bom"
    elif valor_co2 <= 200:
        return "Aceitável"
    else:
        return "Elevado"

if __name__ == "__main__":
    exemplos = [10, 60, 150, 250, 500]
    for valor in exemplos:
        print(f"CO2: {valor} kg => {classificar_co2(valor)}")
