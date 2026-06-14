# TrafficAI — Sistema de Simulação e Gestão Inteligente de Tráfego Urbano

Plataforma web de simulação de tráfego urbano com controlo semafórico adaptativo (AI/RL), motor de regras em linguagem natural, integração de dados GTFS reais e análise comparativa em tempo real.

> Projeto Final de Licenciatura em Engenharia Informática · Beatriz Antunes · 2026

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 18+ |
| Python | 3.11+ |
| MongoDB | 6+ (local ou Atlas) |
| npm | 9+ |

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/BeaAntunes23/Projeto-Final-LEI.git
cd Projeto-Final-LEI
```

### 2. Backend (Python / FastAPI)

```bash
cd Backend
pip install -r requirements.txt
```

Cria o ficheiro de ambiente copiando o exemplo:

```bash
cp .env.example .env   # Linux/Mac
copy .env.example .env # Windows
```

Edita `.env` com os teus valores (o MongoDB é obrigatório):

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=urbanflow
CORS_ORIGINS=http://localhost:3000
```

### 3. Frontend (React)

```bash
cd Frontend
npm install
```

---

## Executar o projeto

### Opção A — Iniciar tudo de uma vez (Windows)

```bash
cd Frontend
npm run dev
```

### Opção B — Iniciar separadamente

**Backend:**
```bash
cd Backend
uvicorn server:app --reload --port 8000
```

**Frontend** (outro terminal):
```bash
cd Frontend
npm start
```

A aplicação fica disponível em **http://localhost:3000**.

> O frontend funciona **sem backend** — a simulação e o motor de regras têm fallback local. O backend é necessário apenas para persistência de métricas em MongoDB.

---

## Estrutura do projeto

```
Projeto-Final-LEI/
├── Backend/
│   ├── server.py            # API FastAPI
│   ├── rule_engine.py       # Motor de regras em linguagem natural
│   ├── classificador_co2.py # Classificador de emissões CO₂
│   ├── requirements.txt
│   └── .env.example
├── Frontend/
│   ├── src/
│   │   ├── App.js                        # Orquestrador principal
│   │   ├── componentes/
│   │   │   ├── simulation/
│   │   │   │   ├── engine.js             # Motor de simulação (JS puro)
│   │   │   │   └── SimulationCanvas.js   # Canvas de renderização
│   │   │   └── dashboard/               # Vistas analíticas
│   └── public/data/                     # Dados GTFS (18 distritos)
├── scripts/                             # Scripts de dados e experimentos
├── RELATORIO.md                         # Relatório técnico completo
└── RELATORIO.docx                       # Relatório em formato Word
```

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Simulação em tempo real** | Grelha configurável (2×2 a 10×10), veículos, peões |
| **3 modos de controlo** | AI adaptativa, Ciclo fixo, Q-Learning (RL) |
| **Shadow engine** | Comparação AI vs. Tradicional em paralelo com mesma semente |
| **Motor de regras** | Regras em português natural (ex: "Priorizar ambulâncias") |
| **Integração GTFS** | Dados reais de 18 distritos portugueses |
| **9 vistas analíticas** | Dashboard, Ambiental, Segurança, Comparação, Histórico, Logs... |
| **Exportação** | Relatórios e logs em CSV |

---

## Testes

**Backend:**
```bash
cd Backend
pytest tests/
```

**Frontend (engine JS):**
```bash
cd Frontend
npm test
```

---

## Relatório

O relatório técnico completo está disponível em [`RELATORIO.md`](RELATORIO.md) e [`RELATORIO.docx`](RELATORIO.docx), cobrindo arquitetura, diagramas UML, requisitos, implementação, testes e referências bibliográficas.
