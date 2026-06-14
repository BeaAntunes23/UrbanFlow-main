# 🚀 Deploy Vercel + Render

## **1. Deploy Frontend no Vercel (5 min)**

### Pré-requisitos
- Conta GitHub com repo push access
- Vercel account (vercel.com) — conecta com GitHub

### Passos

#### 1.1 Push code para GitHub
```powershell
git add .
git commit -m "Add Vercel config for production deployment"
git push origin main
```

#### 1.2 No Vercel Dashboard
1. Aceda a https://vercel.com
2. Clique **Add New → Project**
3. Selecione repo `Projeto-Final-LEI`
4. Vercel detecta automáticamente React
5. Em **Environment Variables**, adicione:
   ```
   REACT_APP_BACKEND_URL = https://trafficai-api.onrender.com
   ```
6. Clique **Deploy**

**Resultado:** 
- ✅ Frontend live em `seu-projeto.vercel.app`
- ✅ Auto-deploy a cada push para `main`

---

## **2. Deploy Backend no Render (10 min)**

Backend FastAPI precisa de servidor separado (Vercel é só estática).

### 2.1 Criar `render.yaml`

Na root do projeto, crie `render.yaml`:

```yaml
services:
  - type: web
    name: trafficai-api
    env: python
    plan: free
    buildCommand: pip install -r Backend/requirements.txt
    startCommand: cd Backend && uvicorn server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: "3.11"
```

### 2.2 Push para GitHub
```powershell
git add render.yaml
git commit -m "Add Render deployment config"
git push origin main
```

### 2.3 No Render Dashboard
1. Aceda a https://render.com
2. Clique **New → Web Service**
3. Selecione **Deploy from GitHub** (conecta repo)
4. Selecione `Projeto-Final-LEI`
5. Runtime: **Python**
6. Build command: `pip install -r Backend/requirements.txt`
7. Start command: `cd Backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
8. Environment: **Python 3.11**
9. Plan: **Free** (ou Starter se precisar)
10. Deploy

**Resultado:**
- ✅ Backend live em `trafficai-api.onrender.com`
- ✅ API endpoints: `trafficai-api.onrender.com/api/*`

---

## **3. Configurar URLs Cruzadas**

### Frontend → Backend
**Vercel Dashboard → Settings → Environment Variables:**
```
REACT_APP_BACKEND_URL = https://trafficai-api.onrender.com
```

### Backend → Frontend (opcional)
**Render Dashboard → Environment → CORS:**
```
FRONTEND_URL = https://seu-projeto.vercel.app
```

---

## **4. Verificar Deploy**

```bash
# Frontend
curl https://seu-projeto.vercel.app

# Backend
curl https://trafficai-api.onrender.com/api/health

# Full flow
curl https://seu-projeto.vercel.app/api/rule -X POST \
  -H "Content-Type: application/json" \
  -d '{"rule_text": "Dar prioridade a ambulâncias"}'
```

---

## **5. URLs Finais para Relatório**

```markdown
### Deployment

**Frontend (Vercel):** https://seu-projeto.vercel.app
**Backend API (Render):** https://trafficai-api.onrender.com/api

**Status:**
- Frontend: ✅ Auto-deploy a cada commit
- Backend: ✅ Restart automático a cada 15 min (free tier)

**Nota:** Render free tier dorme após 15 min sem requisições. 
Para produção, considerar upgrade para Starter ($7/mês).
```

---

## **6. Problemas Comuns**

| Problema | Solução |
|----------|---------|
| CORS error | Verificar `REACT_APP_BACKEND_URL` em Vercel env |
| Backend retorna 500 | Ver logs em Render Dashboard |
| Build falha | Verificar `vercel.json` e `render.yaml` sintaxe |
| Dados não persistem | MongoDB gratuito não disponível — usar em-memory ou upgrade |

---

## **7. Adicional: CI/CD**

Ambos auto-deploy a cada push `main`. Para staging, crie branch `develop`:
- `main` → Vercel production
- `develop` → Vercel preview

---

**Tempo total: ~15 minutos**
**Custo: $0 (free tiers) — upgrade quando necessário**
