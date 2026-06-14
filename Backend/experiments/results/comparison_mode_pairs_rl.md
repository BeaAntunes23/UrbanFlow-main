# Comparação Inferencial entre Modos

Fonte de dados: C:\Users\Lenovo\OneDrive - UTAD\LEI\3º ano\2º semestre\Laboratório de Projeto\Projeto\Projeto-Final-LEI\Frontend\experiments\results\rl_evaluation_latest.csv

## Cenário: accident
- ai vs rl | avg_wait_time: meanA=22.900, meanB=41.410, Δ=-18.510, CI95=[-27.530, -10.730], impr=44.70%, p=0.0055, p_holm=0.0935
- ai vs rl | flow_rate: meanA=5.770, meanB=3.190, Δ=2.580, CI95=[1.450, 3.550], impr=80.88%, p=0.0072, p_holm=0.1160
- ai vs rl | co2_emissions: meanA=113.378, meanB=106.346, Δ=7.032, CI95=[-15.255, 28.103], impr=-6.61%, p=0.5749, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.820, meanB=36.510, Δ=-33.690, CI95=[-47.690, -19.880], impr=92.28%, p=0.0072, p_holm=0.1160
- ai vs rl | total_collisions: meanA=31.900, meanB=35.200, Δ=-3.300, CI95=[-4.600, -1.700], impr=9.38%, p=0.0082, p_holm=0.1160
- ai vs rl | collision_avoided: meanA=0.400, meanB=0.000, Δ=0.400, CI95=[0.100, 0.700], impr=0.00%, p=0.1300, p_holm=0.8083
- ai vs rl | vehicles_completed: meanA=17.300, meanB=9.600, Δ=7.700, CI95=[4.300, 10.600], impr=80.21%, p=0.0072, p_holm=0.1160
- ai vs traditional | avg_wait_time: meanA=22.900, meanB=57.690, Δ=-34.790, CI95=[-43.641, -25.479], impr=60.31%, p=0.0017, p_holm=0.0367
- ai vs traditional | flow_rate: meanA=5.770, meanB=1.470, Δ=4.300, CI95=[3.490, 5.000], impr=292.52%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=113.378, meanB=88.071, Δ=25.307, CI95=[10.001, 44.302], impr=-28.73%, p=0.0080, p_holm=0.1160
- ai vs traditional | emergency_response_time: meanA=2.820, meanB=14.270, Δ=-11.450, CI95=[-30.401, 2.591], impr=80.24%, p=0.2912, p_holm=1.0000
- ai vs traditional | total_collisions: meanA=31.900, meanB=35.900, Δ=-4.000, CI95=[-5.300, -2.600], impr=11.14%, p=0.0050, p_holm=0.0900
- ai vs traditional | collision_avoided: meanA=0.400, meanB=0.200, Δ=0.200, CI95=[-0.100, 0.600], impr=100.00%, p=0.6256, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=17.300, meanB=4.400, Δ=12.900, CI95=[10.400, 15.000], impr=293.18%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=41.410, meanB=57.690, Δ=-16.280, CI95=[-26.531, -5.729], impr=28.22%, p=0.0257, p_holm=0.2317
- rl vs traditional | flow_rate: meanA=3.190, meanB=1.470, Δ=1.720, CI95=[1.130, 2.250], impr=117.01%, p=0.0075, p_holm=0.1160
- rl vs traditional | co2_emissions: meanA=106.346, meanB=88.071, Δ=18.275, CI95=[5.630, 31.033], impr=-20.75%, p=0.0265, p_holm=0.2317
- rl vs traditional | emergency_response_time: meanA=36.510, meanB=14.270, Δ=22.240, CI95=[-2.330, 45.052], impr=-155.85%, p=0.1155, p_holm=0.8083
- rl vs traditional | total_collisions: meanA=35.200, meanB=35.900, Δ=-0.700, CI95=[-1.700, 0.300], impr=1.95%, p=0.3079, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.000, meanB=0.200, Δ=-0.200, CI95=[-0.500, 0.000], impr=-100.00%, p=0.4994, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=9.600, meanB=4.400, Δ=5.200, CI95=[3.400, 6.800], impr=118.18%, p=0.0075, p_holm=0.1160

## Cenário: emergency
- ai vs rl | avg_wait_time: meanA=16.140, meanB=37.680, Δ=-21.540, CI95=[-25.021, -18.430], impr=57.17%, p=0.0017, p_holm=0.0367
- ai vs rl | flow_rate: meanA=9.340, meanB=4.060, Δ=5.280, CI95=[4.230, 6.331], impr=130.05%, p=0.0017, p_holm=0.0367
- ai vs rl | co2_emissions: meanA=123.041, meanB=120.897, Δ=2.144, CI95=[-20.105, 26.578], impr=-1.77%, p=0.8655, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.900, meanB=31.500, Δ=-28.600, CI95=[-37.340, -18.990], impr=90.79%, p=0.0040, p_holm=0.0450
- ai vs rl | total_collisions: meanA=27.100, meanB=33.300, Δ=-6.200, CI95=[-7.600, -4.700], impr=18.62%, p=0.0017, p_holm=0.0367
- ai vs rl | collision_avoided: meanA=0.000, meanB=0.000, Δ=0.000, CI95=[0.000, 0.000], impr=0.00%, p=1.0000, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=28.000, meanB=12.200, Δ=15.800, CI95=[12.600, 18.903], impr=129.51%, p=0.0017, p_holm=0.0367
- ai vs traditional | avg_wait_time: meanA=16.140, meanB=62.620, Δ=-46.480, CI95=[-55.611, -37.968], impr=74.23%, p=0.0017, p_holm=0.0367
- ai vs traditional | flow_rate: meanA=9.340, meanB=2.440, Δ=6.900, CI95=[6.190, 7.490], impr=282.79%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=123.041, meanB=118.394, Δ=4.647, CI95=[-8.408, 17.048], impr=-3.93%, p=0.5094, p_holm=1.0000
- ai vs traditional | emergency_response_time: meanA=2.900, meanB=48.370, Δ=-45.470, CI95=[-58.801, -30.377], impr=94.00%, p=0.0037, p_holm=0.0450
- ai vs traditional | total_collisions: meanA=27.100, meanB=33.200, Δ=-6.100, CI95=[-7.500, -4.600], impr=18.37%, p=0.0017, p_holm=0.0367
- ai vs traditional | collision_avoided: meanA=0.000, meanB=0.300, Δ=-0.300, CI95=[-0.600, 0.000], impr=-100.00%, p=0.2512, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=28.000, meanB=7.300, Δ=20.700, CI95=[18.600, 22.500], impr=283.56%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=37.680, meanB=62.620, Δ=-24.940, CI95=[-33.320, -16.870], impr=39.83%, p=0.0017, p_holm=0.0367
- rl vs traditional | flow_rate: meanA=4.060, meanB=2.440, Δ=1.620, CI95=[0.810, 2.420], impr=66.39%, p=0.0075, p_holm=0.0750
- rl vs traditional | co2_emissions: meanA=120.897, meanB=118.394, Δ=2.503, CI95=[-20.752, 24.079], impr=-2.11%, p=0.8340, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=31.500, meanB=48.370, Δ=-16.870, CI95=[-36.851, 2.181], impr=34.88%, p=0.1567, p_holm=1.0000
- rl vs traditional | total_collisions: meanA=33.300, meanB=33.200, Δ=0.100, CI95=[-1.500, 1.503], impr=-0.30%, p=1.0000, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.000, meanB=0.300, Δ=-0.300, CI95=[-0.600, 0.000], impr=-100.00%, p=0.2512, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=12.200, meanB=7.300, Δ=4.900, CI95=[2.500, 7.300], impr=67.12%, p=0.0102, p_holm=0.0922

## Cenário: normal
- ai vs rl | avg_wait_time: meanA=33.460, meanB=37.540, Δ=-4.080, CI95=[-11.750, 2.881], impr=10.87%, p=0.3179, p_holm=1.0000
- ai vs rl | flow_rate: meanA=5.720, meanB=4.830, Δ=0.890, CI95=[-0.020, 1.820], impr=18.43%, p=0.1350, p_holm=1.0000
- ai vs rl | co2_emissions: meanA=120.123, meanB=121.467, Δ=-1.344, CI95=[-16.008, 10.598], impr=1.11%, p=0.8663, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.860, meanB=11.820, Δ=-8.960, CI95=[-19.760, 0.270], impr=75.80%, p=0.2124, p_holm=1.0000
- ai vs rl | total_collisions: meanA=23.900, meanB=25.600, Δ=-1.700, CI95=[-3.100, -0.400], impr=6.64%, p=0.0540, p_holm=0.6478
- ai vs rl | collision_avoided: meanA=0.000, meanB=0.000, Δ=0.000, CI95=[0.000, 0.000], impr=0.00%, p=1.0000, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=17.200, meanB=14.500, Δ=2.700, CI95=[0.000, 5.500], impr=18.62%, p=0.1360, p_holm=1.0000
- ai vs traditional | avg_wait_time: meanA=33.460, meanB=58.970, Δ=-25.510, CI95=[-36.632, -16.939], impr=43.26%, p=0.0017, p_holm=0.0367
- ai vs traditional | flow_rate: meanA=5.720, meanB=2.230, Δ=3.490, CI95=[2.610, 4.390], impr=156.50%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=120.123, meanB=92.852, Δ=27.271, CI95=[13.580, 39.686], impr=-29.37%, p=0.0077, p_holm=0.1007
- ai vs traditional | emergency_response_time: meanA=2.860, meanB=4.660, Δ=-1.800, CI95=[-8.680, 2.870], impr=38.63%, p=0.5981, p_holm=1.0000
- ai vs traditional | total_collisions: meanA=23.900, meanB=27.300, Δ=-3.400, CI95=[-4.900, -2.100], impr=12.45%, p=0.0017, p_holm=0.0367
- ai vs traditional | collision_avoided: meanA=0.000, meanB=0.100, Δ=-0.100, CI95=[-0.300, 0.000], impr=-100.00%, p=1.0000, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=17.200, meanB=6.700, Δ=10.500, CI95=[7.900, 13.200], impr=156.72%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=37.540, meanB=58.970, Δ=-21.430, CI95=[-30.291, -12.669], impr=36.34%, p=0.0017, p_holm=0.0367
- rl vs traditional | flow_rate: meanA=4.830, meanB=2.230, Δ=2.600, CI95=[1.730, 3.350], impr=116.59%, p=0.0050, p_holm=0.0800
- rl vs traditional | co2_emissions: meanA=121.467, meanB=92.852, Δ=28.615, CI95=[17.067, 39.289], impr=-30.82%, p=0.0050, p_holm=0.0800
- rl vs traditional | emergency_response_time: meanA=11.820, meanB=4.660, Δ=7.160, CI95=[-2.100, 18.361], impr=-153.65%, p=0.2509, p_holm=1.0000
- rl vs traditional | total_collisions: meanA=25.600, meanB=27.300, Δ=-1.700, CI95=[-3.300, 0.000], impr=6.23%, p=0.1252, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.000, meanB=0.100, Δ=-0.100, CI95=[-0.300, 0.000], impr=-100.00%, p=1.0000, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=14.500, meanB=6.700, Δ=7.800, CI95=[5.200, 10.000], impr=116.42%, p=0.0050, p_holm=0.0800

## Cenário: portugal
- ai vs rl | avg_wait_time: meanA=13.190, meanB=15.900, Δ=-2.710, CI95=[-6.420, 0.450], impr=17.04%, p=0.2167, p_holm=1.0000
- ai vs rl | flow_rate: meanA=12.590, meanB=9.620, Δ=2.970, CI95=[1.800, 4.150], impr=30.87%, p=0.0037, p_holm=0.0637
- ai vs rl | co2_emissions: meanA=160.688, meanB=154.893, Δ=5.795, CI95=[-13.566, 23.003], impr=-3.74%, p=0.5599, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.870, meanB=28.610, Δ=-25.740, CI95=[-32.550, -19.350], impr=89.97%, p=0.0017, p_holm=0.0367
- ai vs rl | total_collisions: meanA=50.600, meanB=55.300, Δ=-4.700, CI95=[-6.800, -2.697], impr=8.50%, p=0.0050, p_holm=0.0750
- ai vs rl | collision_avoided: meanA=0.200, meanB=0.200, Δ=0.000, CI95=[-0.400, 0.500], impr=0.00%, p=1.0000, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=37.800, meanB=28.800, Δ=9.000, CI95=[5.500, 12.500], impr=31.25%, p=0.0037, p_holm=0.0637
- ai vs traditional | avg_wait_time: meanA=13.190, meanB=17.080, Δ=-3.890, CI95=[-7.820, 0.010], impr=22.78%, p=0.0925, p_holm=1.0000
- ai vs traditional | flow_rate: meanA=12.590, meanB=6.980, Δ=5.610, CI95=[4.810, 6.430], impr=80.37%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=160.688, meanB=139.043, Δ=21.645, CI95=[4.733, 36.879], impr=-15.57%, p=0.0440, p_holm=0.5279
- ai vs traditional | emergency_response_time: meanA=2.870, meanB=18.470, Δ=-15.600, CI95=[-31.800, -1.258], impr=84.46%, p=0.1855, p_holm=1.0000
- ai vs traditional | total_collisions: meanA=50.600, meanB=55.900, Δ=-5.300, CI95=[-6.600, -3.800], impr=9.48%, p=0.0035, p_holm=0.0630
- ai vs traditional | collision_avoided: meanA=0.200, meanB=0.100, Δ=0.100, CI95=[-0.300, 0.600], impr=100.00%, p=1.0000, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=37.800, meanB=20.900, Δ=16.900, CI95=[14.500, 19.400], impr=80.86%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=15.900, meanB=17.080, Δ=-1.180, CI95=[-6.550, 4.761], impr=6.91%, p=0.7181, p_holm=1.0000
- rl vs traditional | flow_rate: meanA=9.620, meanB=6.980, Δ=2.640, CI95=[1.230, 3.830], impr=37.82%, p=0.0147, p_holm=0.2064
- rl vs traditional | co2_emissions: meanA=154.893, meanB=139.043, Δ=15.850, CI95=[-4.010, 42.628], impr=-11.40%, p=0.2854, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=28.610, meanB=18.470, Δ=10.140, CI95=[-8.391, 27.053], impr=-54.90%, p=0.3237, p_holm=1.0000
- rl vs traditional | total_collisions: meanA=55.300, meanB=55.900, Δ=-0.600, CI95=[-2.800, 1.603], impr=1.07%, p=0.6806, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.200, meanB=0.100, Δ=0.100, CI95=[0.000, 0.300], impr=100.00%, p=1.0000, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=28.800, meanB=20.900, Δ=7.900, CI95=[3.700, 11.500], impr=37.80%, p=0.0147, p_holm=0.2064

## Cenário: portugal_interior
- ai vs rl | avg_wait_time: meanA=9.100, meanB=11.830, Δ=-2.730, CI95=[-5.320, -0.530], impr=23.08%, p=0.0607, p_holm=0.6073
- ai vs rl | flow_rate: meanA=14.260, meanB=11.070, Δ=3.190, CI95=[1.600, 4.800], impr=28.82%, p=0.0087, p_holm=0.1487
- ai vs rl | co2_emissions: meanA=152.117, meanB=148.988, Δ=3.129, CI95=[-4.156, 11.372], impr=-2.10%, p=0.4971, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.820, meanB=25.160, Δ=-22.340, CI95=[-31.161, -13.609], impr=88.79%, p=0.0035, p_holm=0.0630
- ai vs rl | total_collisions: meanA=48.800, meanB=52.800, Δ=-4.000, CI95=[-6.900, -1.100], impr=7.58%, p=0.0392, p_holm=0.4709
- ai vs rl | collision_avoided: meanA=0.300, meanB=0.200, Δ=0.100, CI95=[-0.200, 0.400], impr=50.00%, p=1.0000, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=42.800, meanB=33.200, Δ=9.600, CI95=[4.800, 14.400], impr=28.92%, p=0.0087, p_holm=0.1487
- ai vs traditional | avg_wait_time: meanA=9.100, meanB=13.060, Δ=-3.960, CI95=[-7.270, -0.490], impr=30.32%, p=0.0627, p_holm=0.6073
- ai vs traditional | flow_rate: meanA=14.260, meanB=8.430, Δ=5.830, CI95=[4.810, 6.800], impr=69.16%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=152.117, meanB=144.443, Δ=7.674, CI95=[-15.996, 31.816], impr=-5.31%, p=0.5584, p_holm=1.0000
- ai vs traditional | emergency_response_time: meanA=2.820, meanB=55.390, Δ=-52.570, CI95=[-77.890, -27.020], impr=94.91%, p=0.0095, p_holm=0.1487
- ai vs traditional | total_collisions: meanA=48.800, meanB=56.000, Δ=-7.200, CI95=[-9.303, -4.800], impr=12.86%, p=0.0017, p_holm=0.0367
- ai vs traditional | collision_avoided: meanA=0.300, meanB=0.200, Δ=0.100, CI95=[-0.500, 0.700], impr=50.00%, p=1.0000, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=42.800, meanB=25.300, Δ=17.500, CI95=[14.500, 20.400], impr=69.17%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=11.830, meanB=13.060, Δ=-1.230, CI95=[-4.940, 2.600], impr=9.42%, p=0.5479, p_holm=1.0000
- rl vs traditional | flow_rate: meanA=11.070, meanB=8.430, Δ=2.640, CI95=[1.120, 4.101], impr=31.32%, p=0.0145, p_holm=0.2029
- rl vs traditional | co2_emissions: meanA=148.988, meanB=144.443, Δ=4.545, CI95=[-18.261, 26.380], impr=-3.15%, p=0.7173, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=25.160, meanB=55.390, Δ=-30.230, CI95=[-53.600, -7.266], impr=54.58%, p=0.0410, p_holm=0.4709
- rl vs traditional | total_collisions: meanA=52.800, meanB=56.000, Δ=-3.200, CI95=[-6.800, 0.200], impr=5.71%, p=0.1317, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.200, meanB=0.200, Δ=0.000, CI95=[-0.300, 0.300], impr=0.00%, p=1.0000, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=33.200, meanB=25.300, Δ=7.900, CI95=[3.300, 12.303], impr=31.23%, p=0.0145, p_holm=0.2029

## Cenário: portugal_litoral
- ai vs rl | avg_wait_time: meanA=10.550, meanB=13.260, Δ=-2.710, CI95=[-4.581, -0.920], impr=20.44%, p=0.0297, p_holm=0.3867
- ai vs rl | flow_rate: meanA=12.070, meanB=9.260, Δ=2.810, CI95=[2.110, 3.600], impr=30.35%, p=0.0017, p_holm=0.0367
- ai vs rl | co2_emissions: meanA=165.151, meanB=166.953, Δ=-1.802, CI95=[-11.090, 8.555], impr=1.08%, p=0.7423, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.790, meanB=20.640, Δ=-17.850, CI95=[-26.400, -9.159], impr=86.48%, p=0.0072, p_holm=0.1160
- ai vs rl | total_collisions: meanA=66.200, meanB=70.200, Δ=-4.000, CI95=[-5.300, -2.600], impr=5.70%, p=0.0017, p_holm=0.0367
- ai vs rl | collision_avoided: meanA=0.300, meanB=0.100, Δ=0.200, CI95=[0.000, 0.500], impr=200.00%, p=0.4994, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=36.200, meanB=27.800, Δ=8.400, CI95=[6.300, 10.800], impr=30.22%, p=0.0017, p_holm=0.0367
- ai vs traditional | avg_wait_time: meanA=10.550, meanB=15.860, Δ=-5.310, CI95=[-8.570, -2.390], impr=33.48%, p=0.0107, p_holm=0.1612
- ai vs traditional | flow_rate: meanA=12.070, meanB=8.290, Δ=3.780, CI95=[2.970, 4.750], impr=45.60%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=165.151, meanB=163.114, Δ=2.037, CI95=[-12.814, 17.182], impr=-1.25%, p=0.8040, p_holm=1.0000
- ai vs traditional | emergency_response_time: meanA=2.790, meanB=32.070, Δ=-29.280, CI95=[-51.520, -9.559], impr=91.30%, p=0.0410, p_holm=0.4919
- ai vs traditional | total_collisions: meanA=66.200, meanB=68.500, Δ=-2.300, CI95=[-3.900, -0.900], impr=3.36%, p=0.0170, p_holm=0.2379
- ai vs traditional | collision_avoided: meanA=0.300, meanB=0.000, Δ=0.300, CI95=[0.000, 0.600], impr=0.00%, p=0.2504, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=36.200, meanB=24.900, Δ=11.300, CI95=[8.900, 14.200], impr=45.38%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=13.260, meanB=15.860, Δ=-2.600, CI95=[-5.791, 0.260], impr=16.39%, p=0.1735, p_holm=1.0000
- rl vs traditional | flow_rate: meanA=9.260, meanB=8.290, Δ=0.970, CI95=[-0.320, 2.180], impr=11.70%, p=0.1837, p_holm=1.0000
- rl vs traditional | co2_emissions: meanA=166.953, meanB=163.114, Δ=3.839, CI95=[-9.470, 17.772], impr=-2.35%, p=0.6231, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=20.640, meanB=32.070, Δ=-11.430, CI95=[-40.181, 13.511], impr=35.64%, p=0.4736, p_holm=1.0000
- rl vs traditional | total_collisions: meanA=70.200, meanB=68.500, Δ=1.700, CI95=[-0.700, 3.700], impr=-2.48%, p=0.2079, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.100, meanB=0.000, Δ=0.100, CI95=[0.000, 0.300], impr=0.00%, p=1.0000, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=27.800, meanB=24.900, Δ=2.900, CI95=[-1.000, 6.500], impr=11.65%, p=0.1970, p_holm=1.0000

## Cenário: portugal_sul
- ai vs rl | avg_wait_time: meanA=10.750, meanB=13.260, Δ=-2.510, CI95=[-6.700, 1.341], impr=18.93%, p=0.3084, p_holm=1.0000
- ai vs rl | flow_rate: meanA=14.060, meanB=11.540, Δ=2.520, CI95=[1.680, 3.320], impr=21.84%, p=0.0017, p_holm=0.0367
- ai vs rl | co2_emissions: meanA=148.264, meanB=149.493, Δ=-1.229, CI95=[-23.077, 17.415], impr=0.82%, p=0.9420, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.870, meanB=31.360, Δ=-28.490, CI95=[-37.300, -18.679], impr=90.85%, p=0.0037, p_holm=0.0637
- ai vs rl | total_collisions: meanA=49.400, meanB=51.400, Δ=-2.000, CI95=[-3.300, -0.800], impr=3.89%, p=0.0135, p_holm=0.1755
- ai vs rl | collision_avoided: meanA=0.100, meanB=0.100, Δ=0.000, CI95=[-0.300, 0.300], impr=0.00%, p=1.0000, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=42.200, meanB=34.600, Δ=7.600, CI95=[5.100, 10.000], impr=21.97%, p=0.0017, p_holm=0.0367
- ai vs traditional | avg_wait_time: meanA=10.750, meanB=13.840, Δ=-3.090, CI95=[-6.490, 0.060], impr=22.33%, p=0.1282, p_holm=1.0000
- ai vs traditional | flow_rate: meanA=14.060, meanB=8.980, Δ=5.080, CI95=[4.240, 5.950], impr=56.57%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=148.264, meanB=140.191, Δ=8.073, CI95=[-3.249, 19.100], impr=-5.76%, p=0.2459, p_holm=1.0000
- ai vs traditional | emergency_response_time: meanA=2.870, meanB=30.560, Δ=-27.690, CI95=[-43.180, -11.939], impr=90.61%, p=0.0295, p_holm=0.3244
- ai vs traditional | total_collisions: meanA=49.400, meanB=54.400, Δ=-5.000, CI95=[-6.900, -3.000], impr=9.19%, p=0.0037, p_holm=0.0637
- ai vs traditional | collision_avoided: meanA=0.100, meanB=0.100, Δ=0.000, CI95=[-0.300, 0.300], impr=0.00%, p=1.0000, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=42.200, meanB=26.900, Δ=15.300, CI95=[12.700, 17.900], impr=56.88%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=13.260, meanB=13.840, Δ=-0.580, CI95=[-6.690, 4.810], impr=4.19%, p=0.8633, p_holm=1.0000
- rl vs traditional | flow_rate: meanA=11.540, meanB=8.980, Δ=2.560, CI95=[1.410, 3.690], impr=28.51%, p=0.0060, p_holm=0.0900
- rl vs traditional | co2_emissions: meanA=149.493, meanB=140.191, Δ=9.302, CI95=[-11.515, 32.276], impr=-6.64%, p=0.4581, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=31.360, meanB=30.560, Δ=0.800, CI95=[-19.451, 20.392], impr=-2.62%, p=0.9445, p_holm=1.0000
- rl vs traditional | total_collisions: meanA=51.400, meanB=54.400, Δ=-3.000, CI95=[-4.600, -1.200], impr=5.51%, p=0.0187, p_holm=0.2249
- rl vs traditional | collision_avoided: meanA=0.100, meanB=0.100, Δ=0.000, CI95=[-0.300, 0.300], impr=0.00%, p=1.0000, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=34.600, meanB=26.900, Δ=7.700, CI95=[4.200, 11.100], impr=28.62%, p=0.0060, p_holm=0.0900

## Cenário: rush_hour
- ai vs rl | avg_wait_time: meanA=20.170, meanB=19.420, Δ=0.750, CI95=[-2.590, 4.490], impr=-3.86%, p=0.7013, p_holm=1.0000
- ai vs rl | flow_rate: meanA=7.500, meanB=6.610, Δ=0.890, CI95=[-0.420, 2.340], impr=13.46%, p=0.2724, p_holm=1.0000
- ai vs rl | co2_emissions: meanA=267.961, meanB=254.721, Δ=13.240, CI95=[1.482, 25.379], impr=-5.20%, p=0.0685, p_holm=0.6848
- ai vs rl | emergency_response_time: meanA=2.960, meanB=13.450, Δ=-10.490, CI95=[-19.160, -3.039], impr=77.99%, p=0.0345, p_holm=0.4256
- ai vs rl | total_collisions: meanA=130.800, meanB=131.500, Δ=-0.700, CI95=[-3.000, 1.700], impr=0.53%, p=0.6376, p_holm=1.0000
- ai vs rl | collision_avoided: meanA=0.400, meanB=0.400, Δ=0.000, CI95=[-0.500, 0.400], impr=0.00%, p=1.0000, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=22.500, meanB=19.800, Δ=2.700, CI95=[-1.200, 7.003], impr=13.64%, p=0.2774, p_holm=1.0000
- ai vs traditional | avg_wait_time: meanA=20.170, meanB=45.200, Δ=-25.030, CI95=[-33.100, -17.489], impr=55.38%, p=0.0017, p_holm=0.0367
- ai vs traditional | flow_rate: meanA=7.500, meanB=2.390, Δ=5.110, CI95=[4.100, 6.020], impr=213.81%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=267.961, meanB=250.467, Δ=17.494, CI95=[4.009, 28.990], impr=-6.98%, p=0.0415, p_holm=0.4564
- ai vs traditional | emergency_response_time: meanA=2.960, meanB=42.180, Δ=-39.220, CI95=[-60.890, -17.065], impr=92.98%, p=0.0327, p_holm=0.4256
- ai vs traditional | total_collisions: meanA=130.800, meanB=135.600, Δ=-4.800, CI95=[-6.502, -3.200], impr=3.54%, p=0.0050, p_holm=0.0750
- ai vs traditional | collision_avoided: meanA=0.400, meanB=0.700, Δ=-0.300, CI95=[-1.000, 0.300], impr=-42.86%, p=0.5871, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=22.500, meanB=7.200, Δ=15.300, CI95=[12.298, 18.100], impr=212.50%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=19.420, meanB=45.200, Δ=-25.780, CI95=[-33.121, -19.909], impr=57.04%, p=0.0017, p_holm=0.0367
- rl vs traditional | flow_rate: meanA=6.610, meanB=2.390, Δ=4.220, CI95=[3.220, 5.160], impr=176.57%, p=0.0017, p_holm=0.0367
- rl vs traditional | co2_emissions: meanA=254.721, meanB=250.467, Δ=4.254, CI95=[-8.637, 17.058], impr=-1.70%, p=0.5544, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=13.450, meanB=42.180, Δ=-28.730, CI95=[-55.072, 0.510], impr=68.11%, p=0.0887, p_holm=0.7986
- rl vs traditional | total_collisions: meanA=131.500, meanB=135.600, Δ=-4.100, CI95=[-6.000, -2.200], impr=3.02%, p=0.0097, p_holm=0.1365
- rl vs traditional | collision_avoided: meanA=0.400, meanB=0.700, Δ=-0.300, CI95=[-0.800, 0.100], impr=-42.86%, p=0.4956, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=19.800, meanB=7.200, Δ=12.600, CI95=[9.600, 15.400], impr=175.00%, p=0.0017, p_holm=0.0367

## Cenário: vila_real
- ai vs rl | avg_wait_time: meanA=14.460, meanB=25.970, Δ=-11.510, CI95=[-16.980, -6.249], impr=44.32%, p=0.0037, p_holm=0.0562
- ai vs rl | flow_rate: meanA=7.700, meanB=4.370, Δ=3.330, CI95=[2.670, 3.910], impr=76.20%, p=0.0017, p_holm=0.0367
- ai vs rl | co2_emissions: meanA=127.836, meanB=128.604, Δ=-0.768, CI95=[-10.260, 8.654], impr=0.60%, p=0.8795, p_holm=1.0000
- ai vs rl | emergency_response_time: meanA=2.460, meanB=12.430, Δ=-9.970, CI95=[-14.130, -5.550], impr=80.21%, p=0.0080, p_holm=0.1120
- ai vs rl | total_collisions: meanA=48.100, meanB=53.000, Δ=-4.900, CI95=[-6.200, -3.700], impr=9.25%, p=0.0017, p_holm=0.0367
- ai vs rl | collision_avoided: meanA=0.000, meanB=0.200, Δ=-0.200, CI95=[-0.500, 0.000], impr=-100.00%, p=0.5031, p_holm=1.0000
- ai vs rl | vehicles_completed: meanA=23.100, meanB=13.100, Δ=10.000, CI95=[8.000, 11.800], impr=76.34%, p=0.0017, p_holm=0.0367
- ai vs traditional | avg_wait_time: meanA=14.460, meanB=25.280, Δ=-10.820, CI95=[-16.070, -5.230], impr=42.80%, p=0.0140, p_holm=0.1820
- ai vs traditional | flow_rate: meanA=7.700, meanB=3.570, Δ=4.130, CI95=[3.340, 4.900], impr=115.69%, p=0.0017, p_holm=0.0367
- ai vs traditional | co2_emissions: meanA=127.836, meanB=123.277, Δ=4.559, CI95=[-5.816, 15.919], impr=-3.70%, p=0.4431, p_holm=1.0000
- ai vs traditional | emergency_response_time: meanA=2.460, meanB=14.200, Δ=-11.740, CI95=[-21.320, -3.140], impr=82.68%, p=0.0652, p_holm=0.6523
- ai vs traditional | total_collisions: meanA=48.100, meanB=54.100, Δ=-6.000, CI95=[-7.900, -3.900], impr=11.09%, p=0.0035, p_holm=0.0560
- ai vs traditional | collision_avoided: meanA=0.000, meanB=0.100, Δ=-0.100, CI95=[-0.300, 0.000], impr=-100.00%, p=1.0000, p_holm=1.0000
- ai vs traditional | vehicles_completed: meanA=23.100, meanB=10.700, Δ=12.400, CI95=[10.100, 14.700], impr=115.89%, p=0.0017, p_holm=0.0367
- rl vs traditional | avg_wait_time: meanA=25.970, meanB=25.280, Δ=0.690, CI95=[-7.481, 8.850], impr=-2.73%, p=0.8848, p_holm=1.0000
- rl vs traditional | flow_rate: meanA=4.370, meanB=3.570, Δ=0.800, CI95=[0.250, 1.300], impr=22.41%, p=0.0332, p_holm=0.3989
- rl vs traditional | co2_emissions: meanA=128.604, meanB=123.277, Δ=5.327, CI95=[-11.257, 19.832], impr=-4.32%, p=0.5396, p_holm=1.0000
- rl vs traditional | emergency_response_time: meanA=12.430, meanB=14.200, Δ=-1.770, CI95=[-10.702, 6.660], impr=12.46%, p=0.7176, p_holm=1.0000
- rl vs traditional | total_collisions: meanA=53.000, meanB=54.100, Δ=-1.100, CI95=[-3.200, 1.000], impr=2.03%, p=0.3919, p_holm=1.0000
- rl vs traditional | collision_avoided: meanA=0.200, meanB=0.100, Δ=0.100, CI95=[-0.200, 0.400], impr=100.00%, p=1.0000, p_holm=1.0000
- rl vs traditional | vehicles_completed: meanA=13.100, meanB=10.700, Δ=2.400, CI95=[0.800, 3.900], impr=22.43%, p=0.0332, p_holm=0.3989

## Nota Metodológica
- Teste de permutação com 4000 iterações (paired quando aplicável).
- Intervalos de confiança via bootstrap (3000 amostras).
- Correção de múltiplos testes por cenário via Holm-Bonferroni.