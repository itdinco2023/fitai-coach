# Arhitectura FitAI Coach

## Stack Tehnic

### Frontend
- React.js
- Material UI
- React Router
- React Query
- Chart.js

### Backend
- Firebase Authentication
- Firestore
- Realtime Database
- Firebase Storage
- Cloud Functions

### AI Services
- OpenAI API (GPT-4)
- Claude API
- Vision AI

### Hosting & Deployment
- Firebase Hosting
- GitHub Actions CI/CD

## Diagramă Arhitecturală

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │◄────┤    Firebase     │◄────┤    AI Services  │
│    (React)      │     │    Backend      │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       ▲                       ▲
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Material UI  │     │    Firestore    │     │    OpenAI API   │
│    Components   │     │    Database     │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Structura Bazei de Date

### Firestore Collections

1. **Users**
   - Profile (date personale, medicale, preferințe)
   - Progress (tracking, măsurători)
   - Subscription (tip, status, plată)
   - Group (apartenență, absențe, recuperări)
   - Nutrition (planuri, fotografii)

2. **Gyms**
   - Equipment (dotări, status)
   - Admins (roluri)
   - Settings (configurări)

3. **Groups**
   - Detalii grupă
   - Program
   - Membri
   - Antrenori

4. **Sessions**
   - Prezențe
   - Recuperări
   - Note

### Realtime Database

1. **Workout Plans**
   - Exerciții
   - Status
   - Note

2. **Meal Plans**
   - Mese
   - Macros
   - Note

3. **Chat History**
   - Mesaje
   - Timestamp
   - Sender

## Fluxuri de Date

### 1. Autentificare & Autorizare
- Firebase Auth pentru autentificare
- Custom Claims pentru roluri
- JWT pentru sesiuni

### 2. Operațiuni CRUD
- Cloud Functions pentru validare
- Firestore pentru stocare
- Realtime DB pentru sincronizare

### 3. Procesare AI
- OpenAI pentru antrenamente
- Claude pentru nutriție
- Vision AI pentru analiză mese

## Securitate

### 1. Autentificare
- Multi-factor authentication
- Rate limiting
- Session management

### 2. Autorizare
- Role-based access control
- Custom claims
- Security rules

### 3. Date
- Encryption at rest
- Secure transmission
- GDPR compliance

## Scalabilitate

### 1. Arhitectură
- Serverless
- Microservices
- Event-driven

### 2. Performanță
- Caching
- Indexing
- Load balancing

### 3. Monitorizare
- Logging
- Metrics
- Alerts

## Optimizări Locale

### 1. Conținut
- Baza de date alimente românești
- Terminologie fitness în română
- Recomandări sezoniere

### 2. Performanță
- CDN local
- Caching regional
- Optimizare latency

### 3. UX
- Interfață în română
- Format dată/ora local
- Support pentru RON 

Structură GitHub Repository FitAI Coach
fitai-coach/
│
├── .github/                        # Configurații GitHub
│   ├── workflows/                  # GitHub Actions pentru CI/CD
│   │   ├── deploy-functions.yml    # Workflow pentru deployarea Cloud Functions
│   │   └── deploy-frontend.yml     # Workflow pentru deployarea Frontend
│   └── ISSUE_TEMPLATE/             # Template-uri pentru issues
│
├── docs/                           # Documentație
│   ├── architecture/               # Diagrame și documentație arhitectură
│   ├── api/                        # Documentație API
│   └── guides/                     # Ghiduri și tutoriale
│
├── firebase/                       # Configurări Firebase
│   ├── firestore.rules             # Reguli securitate Firestore
│   ├── storage.rules               # Reguli securitate Storage
│   ├── database.rules.json         # Reguli Realtime Database
│   └── firebase.json               # Configurație Firebase
│
├── functions/                      # Cloud Functions
│   ├── src/
│   │   ├── auth/                   # Funcții pentru autentificare și roluri
│   │   ├── admin/                  # Funcții pentru administrare
│   │   │   ├── equipment.js        # Gestionare echipamente
│   │   │   ├── groups.js           # Gestionare grupe
│   │   │   ├── subscriptions.js    # Gestionare abonamente
│   │   │   └── attendance.js       # Gestionare prezențe și recuperări
│   │   ├── ai/                     # Funcții AI
│   │   │   ├── agents/             # Agenții LangChain
│   │   │   │   ├── workout-agent/  # Agent pentru antrenamente
│   │   │   │   ├── nutrition-agent/# Agent pentru nutriție
│   │   │   │   └── medical-agent/  # Agent pentru evaluări medicale
│   │   │   ├── workout-generator.js# Generare planuri antrenament
│   │   │   ├── meal-planner.js     # Generare planuri nutriționale
│   │   │   ├── food-analyzer.js    # Analiză fotografii mâncăruri
│   │   │   └── chatbot.js          # Funcționalitate chatbot
│   │   ├── user/                   # Funcții specifice utilizatorilor
│   │   │   ├── profile.js          # Gestionare profil
│   │   │   ├── progress.js         # Tracking progres
│   │   │   └── absences.js         # Gestionare absențe
│   │   └── notifications/          # Sistem notificări
│   ├── package.json                # Dependințe Node.js
│   └── index.js                    # Punct de intrare Cloud Functions
│
├── src/                            # Codul sursă frontend (React)
│   ├── assets/                     # Resurse statice (imagini, fonturi)
│   ├── components/                 # Componente React
│   │   ├── common/                 # Componente comune
│   │   ├── admin/                  # Componente pentru admin
│   │   │   ├── Dashboard/          # Dashboard admin
│   │   │   ├── Equipment/          # Gestionare echipamente
│   │   │   ├── Groups/             # Gestionare grupe
│   │   │   ├── Subscriptions/      # Gestionare abonamente
│   │   │   └── Attendance/         # Gestionare prezențe și recuperări
│   │   └── user/                   # Componente pentru utilizatori
│   │       ├── Profile/            # Profil utilizator
│   │       ├── Workout/            # Planuri antrenament
│   │       ├── Nutrition/          # Planuri nutriționale
│   │       ├── Progress/           # Tracking progres
│   │       └── Absences/           # Gestionare absențe și recuperări
│   ├── contexts/                   # Contexte React
│   │   ├── AuthContext.js          # Context autentificare
│   │   └── UserContext.js          # Context date utilizator
│   ├── hooks/                      # Hooks personalizate
│   │   ├── useFirestore.js         # Hook pentru interacțiuni Firestore
│   │   └── useWorkout.js           # Hook pentru planuri antrenament
│   ├── pages/                      # Pagini aplicație
│   │   ├── auth/                   # Pagini autentificare
│   │   ├── admin/                  # Pagini administrator
│   │   └── user/                   # Pagini utilizator
│   ├── services/                   # Servicii
│   │   ├── firebase.js             # Configurare Firebase
│   │   ├── api.js                  # Comunicare API
│   │   └── storage.js              # Interacțiuni Firebase Storage
│   ├── utils/                      # Utilități
│   │   ├── format.js               # Formatare date
│   │   └── validators.js           # Validare formulare
│   ├── App.js                      # Componenta principală
│   ├── index.js                    # Punct de intrare
│   └── routes.js                   # Configurare rutare
│
├── public/                         # Fișiere publice
│   ├── index.html                  # Template HTML
│   └── favicon.ico                 # Favicon
│
├── .gitignore                      # Fișiere ignorate de Git
├── README.md                       # Documentație proiect
├── package.json                    # Dependințe proiect
└── firebase.json                   # Configurații Firebase