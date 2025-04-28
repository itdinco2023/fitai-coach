# Ghid de Configurare

## Cerințe preliminare

- Node.js (v18 sau mai nou)
- npm (v8 sau mai nou)
- Git
- Cont Firebase
- Cont OpenAI
- Cont Claude API

## Pași de configurare

### 1. Clonare repository

```bash
git clone https://github.com/yourusername/fitai-coach.git
cd fitai-coach
```

### 2. Instalare dependințe

```bash
# Instalare dependințe frontend
npm install

# Instalare dependințe Cloud Functions
cd functions
npm install
cd ..
```

### 3. Configurare Firebase

1. Creează un proiect nou în [Firebase Console](https://console.firebase.google.com)
2. Activează serviciile:
   - Authentication (Email, Google, Facebook)
   - Firestore
   - Realtime Database
   - Storage
   - Cloud Functions
   - Hosting

3. Instalează Firebase CLI:
```bash
npm install -g firebase-tools
```

4. Autentifică-te:
```bash
firebase login
```

5. Inițializează proiectul:
```bash
firebase init
```

### 4. Configurare variabile de mediu

1. Creează fișierul `.env`:
```bash
cp .env.example .env
```

2. Completează variabilele:
```
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key

# Claude
VITE_CLAUDE_API_KEY=your_claude_api_key
```

### 5. Configurare baze de date

1. Creează colecțiile în Firestore:
   - users
   - gyms
   - groups
   - sessions
   - exercises
   - foods

2. Configurează Realtime Database:
   - workout_plans
   - meal_plans
   - chats

3. Configurează regulile de securitate:
   - Copiază regulile din `firebase/firestore.rules`
   - Copiază regulile din `firebase/database.rules.json`
   - Aplică regulile în Firebase Console

### 6. Configurare Storage

1. Creează directoarele în Storage:
   - users
   - workouts
   - nutrition
   - progress

2. Configurează regulile de securitate:
   - Copiază regulile din `firebase/storage.rules`
   - Aplică regulile în Firebase Console

### 7. Configurare Cloud Functions

1. Instalează dependințele pentru AI:
```bash
cd functions
npm install openai @anthropic-ai/sdk
```

2. Configurează variabilele de mediu pentru Cloud Functions:
```bash
firebase functions:config:set openai.key="your_openai_api_key" claude.key="your_claude_api_key"
```

3. Deploy Cloud Functions:
```bash
npm run deploy
```

### 8. Configurare Autentificare

1. Activează metodele de autentificare în Firebase Console:
   - Email/Password
   - Google
   - Facebook

2. Configurează OAuth:
   - Adaugă domeniile autorizate
   - Configurează redirect URLs

### 9. Configurare Hosting

1. Build aplicația:
```bash
npm run build
```

2. Deploy:
```bash
firebase deploy
```

## Verificare instalare

1. Deschide aplicația în browser: `http://localhost:5173`
2. Verifică autentificarea
3. Testează funcționalitățile de bază:
   - Înregistrare utilizator
   - Autentificare
   - Acces la dashboard
   - Generare plan antrenament
   - Generare plan nutrițional

## Depanare

### Probleme comune

1. **Eroare de autentificare Firebase**
   - Verifică credențialele în `.env`
   - Asigură-te că serviciile sunt activate în Firebase Console
   - Verifică configurația OAuth

2. **Eroare Cloud Functions**
   - Verifică logs: `firebase functions:log`
   - Asigură-te că ai permisiunile necesare
   - Verifică variabilele de mediu

3. **Eroare Storage**
   - Verifică regulile de securitate
   - Asigură-te că directoarele există
   - Verifică permisiunile

4. **Eroare AI Services**
   - Verifică API keys
   - Verifică rate limits
   - Verifică logs pentru erori

### Suport

Pentru probleme tehnice, deschide un issue în repository. 