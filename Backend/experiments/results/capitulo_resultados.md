# Capítulo de Resultados Experimentais

## Metodologia Experimental

Foi realizada uma campanha comparativa entre os modos de controlo **IA** e **Tradicional**,
utilizando o mesmo ambiente de simulação, múltiplos cenários urbanos e repetições independentes.

Fonte de dados da campanha: `C:\Users\Lenovo\OneDrive - UTAD\LEI\3º ano\2º semestre\Laboratório de Projeto\Projeto\Projeto-Final-LEI\Frontend\experiments\results\latest.csv`

A análise considerou as métricas:
- tempo médio de espera;
- taxa de fluxo;
- emissões de CO2;
- tempo de resposta de emergência.
- colisões totais;
- colisões evitadas.
- tempo médio de espera por classe (ligeiros e pesados);
- volume concluído por classe (ligeiros e pesados).

Para a inferência estatística foram usados:
- intervalos de confiança (95%);
- teste de permutação bilateral para diferença IA vs Tradicional.

## Resultados por Cenário

### accident
- Na métrica **tempo médio de espera**, o modo IA apresentou média 27.147 (Tradicional: 60.093), com diferença IA-Tradicional de -32.947 (CI95: [-38.304, -27.706]), correspondendo a redução de 54.83%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 3.947 (Tradicional: 1.673), com diferença IA-Tradicional de 2.273 (CI95: [1.980, 2.573]), correspondendo a aumento de 135.86%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 207.454 (Tradicional: 197.295), com diferença IA-Tradicional de 10.159 (CI95: [-4.750, 24.922]), correspondendo a aumento de 5.15%; p=0.2054 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 4.167 (Tradicional: 27.650), com diferença IA-Tradicional de -23.483 (CI95: [-39.951, -9.650]), correspondendo a redução de 84.93%; p=0.0027 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 71.033 (Tradicional: 75.867), com diferença IA-Tradicional de -4.833 (CI95: [-5.767, -3.900]), correspondendo a redução de 6.37%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.433 (Tradicional: 0.167), com diferença IA-Tradicional de 0.267 (CI95: [0.000, 0.533]), correspondendo a aumento de 160.00%; p=0.1120 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 34.743 (Tradicional: 60.380), com diferença IA-Tradicional de -25.637 (CI95: [-30.703, -20.326]), correspondendo a redução de 42.46%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 32.090 (Tradicional: 40.520), com diferença IA-Tradicional de -8.430 (CI95: [-22.360, 5.488]), correspondendo a redução de 20.80%; p=0.2429 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 12.600 (Tradicional: 6.600), com diferença IA-Tradicional de 6.000 (CI95: [4.967, 7.067]), correspondendo a aumento de 90.91%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 3.167 (Tradicional: 1.267), com diferença IA-Tradicional de 1.900 (CI95: [1.233, 2.567]), correspondendo a aumento de 150.00%; p=0.0002 (análise emparelhada (n pares=30)).

### emergency
- Na métrica **tempo médio de espera**, o modo IA apresentou média 27.477 (Tradicional: 62.630), com diferença IA-Tradicional de -35.153 (CI95: [-38.864, -31.596]), correspondendo a redução de 56.13%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 5.547 (Tradicional: 2.267), com diferença IA-Tradicional de 3.280 (CI95: [2.860, 3.687]), correspondendo a aumento de 144.71%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 248.320 (Tradicional: 229.787), com diferença IA-Tradicional de 18.533 (CI95: [-1.786, 39.645]), correspondendo a aumento de 8.07%; p=0.0885 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.910 (Tradicional: 39.833), com diferença IA-Tradicional de -36.923 (CI95: [-54.480, -20.441]), correspondendo a redução de 92.69%; p=0.0005 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 66.467 (Tradicional: 73.500), com diferença IA-Tradicional de -7.033 (CI95: [-8.433, -5.633]), correspondendo a redução de 9.57%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.200 (Tradicional: 0.133), com diferença IA-Tradicional de 0.067 (CI95: [-0.134, 0.267]), correspondendo a aumento de 50.00%; p=0.7481 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 33.560 (Tradicional: 61.530), com diferença IA-Tradicional de -27.970 (CI95: [-32.444, -23.433]), correspondendo a redução de 45.46%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 36.673 (Tradicional: 55.687), com diferença IA-Tradicional de -19.013 (CI95: [-32.718, -6.163]), correspondendo a redução de 34.14%; p=0.0117 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 17.767 (Tradicional: 9.267), com diferença IA-Tradicional de 8.500 (CI95: [6.867, 10.167]), correspondendo a aumento de 91.73%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 4.400 (Tradicional: 1.433), com diferença IA-Tradicional de 2.967 (CI95: [2.233, 3.700]), correspondendo a aumento de 206.98%; p=0.0002 (análise emparelhada (n pares=30)).

### normal
- Na métrica **tempo médio de espera**, o modo IA apresentou média 29.940 (Tradicional: 66.647), com diferença IA-Tradicional de -36.707 (CI95: [-40.367, -33.083]), correspondendo a redução de 55.08%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 5.300 (Tradicional: 2.487), com diferença IA-Tradicional de 2.813 (CI95: [2.573, 3.053]), correspondendo a aumento de 113.14%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 225.267 (Tradicional: 221.743), com diferença IA-Tradicional de 3.524 (CI95: [-15.989, 22.456]), correspondendo a aumento de 1.59%; p=0.7226 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.950 (Tradicional: 27.583), com diferença IA-Tradicional de -24.633 (CI95: [-38.056, -12.338]), correspondendo a redução de 89.31%; p=0.0007 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 49.567 (Tradicional: 56.100), com diferença IA-Tradicional de -6.533 (CI95: [-7.400, -5.667]), correspondendo a redução de 11.65%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.067 (Tradicional: 0.100), com diferença IA-Tradicional de -0.033 (CI95: [-0.167, 0.100]), correspondendo a redução de 33.33%; p=1.0000 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 35.383 (Tradicional: 67.367), com diferença IA-Tradicional de -31.983 (CI95: [-35.640, -27.966]), correspondendo a redução de 47.48%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 36.013 (Tradicional: 55.163), com diferença IA-Tradicional de -19.150 (CI95: [-32.524, -5.818]), correspondendo a redução de 34.72%; p=0.0107 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 17.567 (Tradicional: 9.967), com diferença IA-Tradicional de 7.600 (CI95: [6.600, 8.700]), correspondendo a aumento de 76.25%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 4.800 (Tradicional: 1.733), com diferença IA-Tradicional de 3.067 (CI95: [2.100, 4.000]), correspondendo a aumento de 176.92%; p=0.0002 (análise emparelhada (n pares=30)).

### portugal
- Na métrica **tempo médio de espera**, o modo IA apresentou média 13.733 (Tradicional: 18.767), com diferença IA-Tradicional de -5.033 (CI95: [-6.873, -3.263]), correspondendo a redução de 26.82%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 10.347 (Tradicional: 6.580), com diferença IA-Tradicional de 3.767 (CI95: [3.380, 4.154]), correspondendo a aumento de 57.24%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 301.508 (Tradicional: 288.518), com diferença IA-Tradicional de 12.990 (CI95: [-1.961, 27.581]), correspondendo a aumento de 4.50%; p=0.1002 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.903 (Tradicional: 25.670), com diferença IA-Tradicional de -22.767 (CI95: [-36.524, -11.182]), correspondendo a redução de 88.69%; p=0.0015 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 108.667 (Tradicional: 117.533), com diferença IA-Tradicional de -8.867 (CI95: [-10.267, -7.533]), correspondendo a redução de 7.54%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.333 (Tradicional: 0.367), com diferença IA-Tradicional de -0.033 (CI95: [-0.233, 0.168]), correspondendo a redução de 9.09%; p=1.0000 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 15.557 (Tradicional: 16.740), com diferença IA-Tradicional de -1.183 (CI95: [-2.890, 0.433]), correspondendo a redução de 7.07%; p=0.1805 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 19.880 (Tradicional: 28.597), com diferença IA-Tradicional de -8.717 (CI95: [-16.205, -1.046]), correspondendo a redução de 30.48%; p=0.0335 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 36.833 (Tradicional: 28.033), com diferença IA-Tradicional de 8.800 (CI95: [7.567, 10.033]), correspondendo a aumento de 31.39%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 7.467 (Tradicional: 4.233), com diferença IA-Tradicional de 3.233 (CI95: [2.267, 4.200]), correspondendo a aumento de 76.38%; p=0.0002 (análise emparelhada (n pares=30)).

### portugal_interior
- Na métrica **tempo médio de espera**, o modo IA apresentou média 9.820 (Tradicional: 11.997), com diferença IA-Tradicional de -2.177 (CI95: [-3.517, -0.820]), correspondendo a redução de 18.14%; p=0.0052 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 13.027 (Tradicional: 8.807), com diferença IA-Tradicional de 4.220 (CI95: [3.760, 4.634]), correspondendo a aumento de 47.92%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 286.738 (Tradicional: 262.995), com diferença IA-Tradicional de 23.743 (CI95: [8.110, 38.113]), correspondendo a aumento de 9.03%; p=0.0032 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.810 (Tradicional: 32.590), com diferença IA-Tradicional de -29.780 (CI95: [-40.268, -20.169]), correspondendo a redução de 91.38%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 94.033 (Tradicional: 103.867), com diferença IA-Tradicional de -9.833 (CI95: [-11.200, -8.500]), correspondendo a redução de 9.47%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.300 (Tradicional: 0.233), com diferença IA-Tradicional de 0.067 (CI95: [-0.200, 0.333]), correspondendo a aumento de 28.57%; p=0.8213 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 10.540 (Tradicional: 10.317), com diferença IA-Tradicional de 0.223 (CI95: [-1.210, 1.660]), correspondendo a aumento de 2.16%; p=0.7718 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 13.687 (Tradicional: 13.843), com diferença IA-Tradicional de -0.157 (CI95: [-3.311, 2.733]), correspondendo a redução de 1.13%; p=0.9170 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 43.300 (Tradicional: 34.267), com diferença IA-Tradicional de 9.033 (CI95: [7.300, 10.700]), correspondendo a aumento de 26.36%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 13.500 (Tradicional: 8.600), com diferença IA-Tradicional de 4.900 (CI95: [3.833, 5.967]), correspondendo a aumento de 56.98%; p=0.0002 (análise emparelhada (n pares=30)).

### portugal_litoral
- Na métrica **tempo médio de espera**, o modo IA apresentou média 12.047 (Tradicional: 16.340), com diferença IA-Tradicional de -4.293 (CI95: [-5.270, -3.350]), correspondendo a redução de 26.27%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 11.220 (Tradicional: 7.353), com diferença IA-Tradicional de 3.867 (CI95: [3.433, 4.327]), correspondendo a aumento de 52.58%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 310.399 (Tradicional: 299.725), com diferença IA-Tradicional de 10.674 (CI95: [1.665, 19.692]), correspondendo a aumento de 3.56%; p=0.0302 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.830 (Tradicional: 28.923), com diferença IA-Tradicional de -26.093 (CI95: [-35.868, -16.357]), correspondendo a redução de 90.22%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 118.800 (Tradicional: 128.000), com diferença IA-Tradicional de -9.200 (CI95: [-10.467, -7.900]), correspondendo a redução de 7.19%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.300 (Tradicional: 0.333), com diferença IA-Tradicional de -0.033 (CI95: [-0.367, 0.267]), correspondendo a redução de 10.00%; p=1.0000 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 15.017 (Tradicional: 16.690), com diferença IA-Tradicional de -1.673 (CI95: [-3.133, -0.140]), correspondendo a redução de 10.03%; p=0.0442 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 11.847 (Tradicional: 11.127), com diferença IA-Tradicional de 0.720 (CI95: [-2.690, 4.103]), correspondendo a aumento de 6.47%; p=0.6838 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 37.333 (Tradicional: 27.833), com diferença IA-Tradicional de 9.500 (CI95: [7.733, 11.400]), correspondendo a aumento de 34.13%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 9.867 (Tradicional: 7.867), com diferença IA-Tradicional de 2.000 (CI95: [0.967, 3.101]), correspondendo a aumento de 25.42%; p=0.0010 (análise emparelhada (n pares=30)).

### portugal_sul
- Na métrica **tempo médio de espera**, o modo IA apresentou média 10.043 (Tradicional: 12.610), com diferença IA-Tradicional de -2.567 (CI95: [-4.217, -0.856]), correspondendo a redução de 20.35%; p=0.0080 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 12.900 (Tradicional: 9.927), com diferença IA-Tradicional de 2.973 (CI95: [2.493, 3.467]), correspondendo a aumento de 29.95%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 274.419 (Tradicional: 269.245), com diferença IA-Tradicional de 5.173 (CI95: [-10.326, 21.249]), correspondendo a aumento de 1.92%; p=0.5476 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.943 (Tradicional: 40.543), com diferença IA-Tradicional de -37.600 (CI95: [-50.117, -25.490]), correspondendo a redução de 92.74%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 95.200 (Tradicional: 102.300), com diferença IA-Tradicional de -7.100 (CI95: [-8.334, -5.833]), correspondendo a redução de 6.94%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.333 (Tradicional: 0.200), com diferença IA-Tradicional de 0.133 (CI95: [-0.067, 0.333]), correspondendo a aumento de 66.67%; p=0.3649 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 13.457 (Tradicional: 14.660), com diferença IA-Tradicional de -1.203 (CI95: [-3.560, 1.090]), correspondendo a redução de 8.21%; p=0.3299 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 6.730 (Tradicional: 5.237), com diferença IA-Tradicional de 1.493 (CI95: [-0.130, 3.110]), correspondendo a aumento de 28.52%; p=0.0905 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 39.033 (Tradicional: 32.433), com diferença IA-Tradicional de 6.600 (CI95: [4.833, 8.433]), correspondendo a aumento de 20.35%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 17.833 (Tradicional: 15.967), com diferença IA-Tradicional de 1.867 (CI95: [0.333, 3.467]), correspondendo a aumento de 11.69%; p=0.0275 (análise emparelhada (n pares=30)).

### rush_hour
- Na métrica **tempo médio de espera**, o modo IA apresentou média 17.940 (Tradicional: 48.827), com diferença IA-Tradicional de -30.887 (CI95: [-34.377, -27.330]), correspondendo a redução de 63.26%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 6.640 (Tradicional: 1.993), com diferença IA-Tradicional de 4.647 (CI95: [4.187, 5.080]), correspondendo a aumento de 233.11%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 455.582 (Tradicional: 441.901), com diferença IA-Tradicional de 13.681 (CI95: [0.380, 25.712]), correspondendo a aumento de 3.10%; p=0.0500 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.767 (Tradicional: 25.570), com diferença IA-Tradicional de -22.803 (CI95: [-34.281, -12.293]), correspondendo a redução de 89.18%; p=0.0010 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 231.833 (Tradicional: 243.033), com diferença IA-Tradicional de -11.200 (CI95: [-12.900, -9.500]), correspondendo a redução de 4.61%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 1.000 (Tradicional: 1.067), com diferença IA-Tradicional de -0.067 (CI95: [-0.567, 0.367]), correspondendo a redução de 6.25%; p=0.8975 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 26.280 (Tradicional: 50.097), com diferença IA-Tradicional de -23.817 (CI95: [-27.547, -20.123]), correspondendo a redução de 47.54%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 24.067 (Tradicional: 33.567), com diferença IA-Tradicional de -9.500 (CI95: [-20.057, 0.948]), correspondendo a redução de 28.30%; p=0.1012 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 19.600 (Tradicional: 8.033), com diferença IA-Tradicional de 11.567 (CI95: [9.900, 13.134]), correspondendo a aumento de 143.98%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 2.833 (Tradicional: 1.067), com diferença IA-Tradicional de 1.767 (CI95: [1.067, 2.500]), correspondendo a aumento de 165.63%; p=0.0002 (análise emparelhada (n pares=30)).

### vila_real
- Na métrica **tempo médio de espera**, o modo IA apresentou média 17.307 (Tradicional: 31.240), com diferença IA-Tradicional de -13.933 (CI95: [-16.797, -11.120]), correspondendo a redução de 44.60%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **taxa de fluxo**, o modo IA apresentou média 6.273 (Tradicional: 3.973), com diferença IA-Tradicional de 2.300 (CI95: [1.987, 2.633]), correspondendo a aumento de 57.89%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **emissões de CO2**, o modo IA apresentou média 229.497 (Tradicional: 243.573), com diferença IA-Tradicional de -14.076 (CI95: [-27.193, -3.447]), correspondendo a redução de 5.78%; p=0.0257 (análise emparelhada (n pares=30)).
- Na métrica **tempo de resposta de emergência**, o modo IA apresentou média 2.527 (Tradicional: 7.130), com diferença IA-Tradicional de -4.603 (CI95: [-11.470, 0.530]), correspondendo a redução de 64.56%; p=0.1862 (análise emparelhada (n pares=30)).
- Na métrica **colisões totais**, o modo IA apresentou média 94.733 (Tradicional: 100.000), com diferença IA-Tradicional de -5.267 (CI95: [-6.133, -4.433]), correspondendo a redução de 5.27%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **colisões evitadas**, o modo IA apresentou média 0.433 (Tradicional: 0.267), com diferença IA-Tradicional de 0.167 (CI95: [-0.100, 0.433]), correspondendo a aumento de 62.50%; p=0.3357 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (ligeiros)**, o modo IA apresentou média 24.760 (Tradicional: 39.410), com diferença IA-Tradicional de -14.650 (CI95: [-18.494, -11.093]), correspondendo a redução de 37.17%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **tempo médio de espera (pesados)**, o modo IA apresentou média 8.213 (Tradicional: 6.917), com diferença IA-Tradicional de 1.297 (CI95: [-1.577, 3.983]), correspondendo a aumento de 18.75%; p=0.3989 (análise emparelhada (n pares=30)).
- Na métrica **veículos ligeiros concluídos**, o modo IA apresentou média 20.700 (Tradicional: 14.567), com diferença IA-Tradicional de 6.133 (CI95: [4.800, 7.400]), correspondendo a aumento de 42.11%; p=0.0002 (análise emparelhada (n pares=30)).
- Na métrica **veículos pesados concluídos**, o modo IA apresentou média 3.167 (Tradicional: 4.900), com diferença IA-Tradicional de -1.733 (CI95: [-2.600, -0.967]), correspondendo a redução de 35.37%; p=0.0005 (análise emparelhada (n pares=30)).

## Integração de RL na Comparação Final

Além da comparação principal IA vs Tradicional, foi incluída uma avaliação adicional com o agente **RL (Q-Learning)** para posicionar o seu desempenho relativo no mesmo conjunto de cenários.

Configuração da avaliação RL:
- repetições por cenário/modo: 10;
- duração por corrida: 180s; dt=0.2;
- dimensão da grelha: 6x6.

### Resultados RL por Cenário

#### accident
- Espera média: RL=41.410s, IA=22.900s, Tradicional=57.690s.
- Fluxo médio: RL=3.190 veíc/min, IA=5.770 veíc/min, Tradicional=1.470 veíc/min.
- Colisões totais: RL=35.200, IA=31.900, Tradicional=35.900.
- Melhor modo por métrica: tempo médio de espera: AI (22.900); taxa de fluxo: AI (5.770); emissões de CO2: TRADITIONAL (88.071); tempo de resposta de emergência: AI (2.820); colisões totais: AI (31.900).

#### emergency
- Espera média: RL=37.680s, IA=16.140s, Tradicional=62.620s.
- Fluxo médio: RL=4.060 veíc/min, IA=9.340 veíc/min, Tradicional=2.440 veíc/min.
- Colisões totais: RL=33.300, IA=27.100, Tradicional=33.200.
- Melhor modo por métrica: tempo médio de espera: AI (16.140); taxa de fluxo: AI (9.340); emissões de CO2: TRADITIONAL (118.394); tempo de resposta de emergência: AI (2.900); colisões totais: AI (27.100).

#### normal
- Espera média: RL=37.540s, IA=33.460s, Tradicional=58.970s.
- Fluxo médio: RL=4.830 veíc/min, IA=5.720 veíc/min, Tradicional=2.230 veíc/min.
- Colisões totais: RL=25.600, IA=23.900, Tradicional=27.300.
- Melhor modo por métrica: tempo médio de espera: AI (33.460); taxa de fluxo: AI (5.720); emissões de CO2: TRADITIONAL (92.852); tempo de resposta de emergência: AI (2.860); colisões totais: AI (23.900).

#### portugal
- Espera média: RL=15.900s, IA=13.190s, Tradicional=17.080s.
- Fluxo médio: RL=9.620 veíc/min, IA=12.590 veíc/min, Tradicional=6.980 veíc/min.
- Colisões totais: RL=55.300, IA=50.600, Tradicional=55.900.
- Melhor modo por métrica: tempo médio de espera: AI (13.190); taxa de fluxo: AI (12.590); emissões de CO2: TRADITIONAL (139.043); tempo de resposta de emergência: AI (2.870); colisões totais: AI (50.600).

#### portugal_interior
- Espera média: RL=11.830s, IA=9.100s, Tradicional=13.060s.
- Fluxo médio: RL=11.070 veíc/min, IA=14.260 veíc/min, Tradicional=8.430 veíc/min.
- Colisões totais: RL=52.800, IA=48.800, Tradicional=56.000.
- Melhor modo por métrica: tempo médio de espera: AI (9.100); taxa de fluxo: AI (14.260); emissões de CO2: TRADITIONAL (144.443); tempo de resposta de emergência: AI (2.820); colisões totais: AI (48.800).

#### portugal_litoral
- Espera média: RL=13.260s, IA=10.550s, Tradicional=15.860s.
- Fluxo médio: RL=9.260 veíc/min, IA=12.070 veíc/min, Tradicional=8.290 veíc/min.
- Colisões totais: RL=70.200, IA=66.200, Tradicional=68.500.
- Melhor modo por métrica: tempo médio de espera: AI (10.550); taxa de fluxo: AI (12.070); emissões de CO2: TRADITIONAL (163.114); tempo de resposta de emergência: AI (2.790); colisões totais: AI (66.200).

#### portugal_sul
- Espera média: RL=13.260s, IA=10.750s, Tradicional=13.840s.
- Fluxo médio: RL=11.540 veíc/min, IA=14.060 veíc/min, Tradicional=8.980 veíc/min.
- Colisões totais: RL=51.400, IA=49.400, Tradicional=54.400.
- Melhor modo por métrica: tempo médio de espera: AI (10.750); taxa de fluxo: AI (14.060); emissões de CO2: TRADITIONAL (140.191); tempo de resposta de emergência: AI (2.870); colisões totais: AI (49.400).

#### rush_hour
- Espera média: RL=19.420s, IA=20.170s, Tradicional=45.200s.
- Fluxo médio: RL=6.610 veíc/min, IA=7.500 veíc/min, Tradicional=2.390 veíc/min.
- Colisões totais: RL=131.500, IA=130.800, Tradicional=135.600.
- Melhor modo por métrica: tempo médio de espera: RL (19.420); taxa de fluxo: AI (7.500); emissões de CO2: TRADITIONAL (250.467); tempo de resposta de emergência: AI (2.960); colisões totais: AI (130.800).

#### vila_real
- Espera média: RL=25.970s, IA=14.460s, Tradicional=25.280s.
- Fluxo médio: RL=4.370 veíc/min, IA=7.700 veíc/min, Tradicional=3.570 veíc/min.
- Colisões totais: RL=53.000, IA=48.100, Tradicional=54.100.
- Melhor modo por métrica: tempo médio de espera: AI (14.460); taxa de fluxo: AI (7.700); emissões de CO2: TRADITIONAL (123.277); tempo de resposta de emergência: AI (2.460); colisões totais: AI (48.100).

### Nota Metodológica

A comparação com RL neste capítulo é **descritiva** (médias por cenário/modo). Para conclusão inferencial forte, recomenda-se repetir a análise emparelhada e os testes estatísticos também para o modo RL no mesmo desenho experimental da comparação IA vs Tradicional.

## Síntese

De forma global, os resultados permitem quantificar ganhos e limitações do controlo IA
em diferentes cenários. A interpretação final deve considerar simultaneamente magnitude
do efeito, consistência entre cenários e significância estatística.

## Figuras recomendadas

- Boxplots por cenário e métrica (distribuição das corridas).
- Barras com média e CI95 para IA vs Tradicional por cenário.