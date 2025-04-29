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



# Structură GitHub Repository FitAI Coach

```
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
```

## Explicații și Recomandări

### 1. Structură modulară

Structura este organizată modular, separând clar:
- Frontend (React)
- Backend (Cloud Functions)
- Configurări Firebase
- Documentație

### 2. Organizarea Cloud Functions

Cloud Functions sunt grupate pe domenii funcționale:
- `admin/` - Funcții pentru gestionarea sălii, echipamentelor, grupelor
- `ai/` - Funcții pentru integrarea cu OpenAI și Claude API, inclusiv agenții LangChain
- `user/` - Funcții specifice utilizatorilor obișnuiți

### 3. Organizarea Frontend

Componentele React sunt structurate pe tipuri de utilizatori:
- `admin/` - Toate componentele pentru panoul de administrator
- `user/` - Componentele pentru aplicația client
- `common/` - Componente reutilizabile (butoane, formulare, etc.)

### 4. Fluxul de Dezvoltare

1. Începe cu setarea structurii de bază și configurația Firebase
2. Implementează autentificarea și sistemul de roluri
3. Dezvoltă funcționalitățile de bază pentru administrator
4. Implementează modulele pentru utilizatori în ordinea priorității
5. Integrează agenții AI pas cu pas

### 5. Branch-uri Recomandate

- `main` - Codul stabil, testat
- `develop` - Integrarea feature-urilor
- `feature/nume-feature` - Branch-uri pentru dezvoltarea feature-urilor individuale
- `release/x.y.z` - Branch-uri pentru pregătirea release-urilor

### 6. GitHub Actions

Configurația GitHub Actions permite:
- Deployment automat la Firebase după merge în `main`
- Rularea testelor pentru fiecare Pull Request
- Verificarea codului prin linting

Această structură este optimizată pentru o echipă de dezvoltare care lucrează modular și pentru implementarea treptată a funcționalităților, începând cu MVP și adăugând treptat caracteristici avansate.
# Lista Fișierelor pentru Proiectul FitAI Coach

## Arhitectură și Planuri
1. **Arhitectură FitAI Coach - Plan de Implementare** (generat în conversație)
   - Structură detaliată a proiectului
   - Plan pe faze de execuție
   - Schema bazei de date
   - Endpoint-uri Cloud Functions

2. **Structură GitHub Repository FitAI Coach** (generat în conversație)
   - Structura folder-ilor pentru repository
   - Organizarea fișierelor pentru frontend și backend

## Structura de Fișiere de Implementat

### Frontend (React)
1. **Configurare Firebase**
   - `src/services/firebase.js` - Configurare și inițializare Firebase

2. **Autentificare & Utilizatori**
   - `src/contexts/AuthContext.js` - Context pentru starea de autentificare
   - `src/pages/auth/Login.js` - Pagina de login
   - `src/pages/auth/Register.js` - Pagina de înregistrare
   - `src/components/user/Profile/ProfileForm.js` - Formular profil utilizator

3. **Interfața Administrator**
   - `src/pages/admin/Dashboard.js` - Dashboard principal admin
   - `src/components/admin/Equipment/EquipmentManager.js` - Gestionare echipamente
   - `src/components/admin/Groups/GroupManager.js` - Gestionare grupe
   - `src/components/admin/Subscriptions/SubscriptionManager.js` - Gestionare abonamente
   - `src/components/admin/Attendance/AttendanceTracker.js` - Tracking prezențe

4. **Interfața Utilizator**
   - `src/pages/user/Dashboard.js` - Dashboard utilizator
   - `src/components/user/Workout/WorkoutPlan.js` - Vizualizare plan antrenament
   - `src/components/user/Nutrition/MealPlan.js` - Vizualizare plan nutrițional
   - `src/components/user/Progress/ProgressTracker.js` - Tracking progres
   - `src/components/user/Absences/AbsenceForm.js` - Formular pentru absențe

5. **Componente Comune**
   - `src/components/common/Calendar.js` - Calendar pentru programare
   - `src/components/common/Navigation.js` - Meniu navigare
   - `src/components/common/ProtectedRoute.js` - Rutare bazată pe roluri

### Backend (Cloud Functions)

6. **Configurare Firebase**
   - `firebase/firestore.rules` - Reguli de securitate Firestore
   - `firebase/storage.rules` - Reguli de securitate Storage
   - `firebase.json` - Configurații Firebase

7. **Cloud Functions pentru Autentificare**
   - `functions/src/auth/createUser.js` - Creare utilizator nou
   - `functions/src/auth/setUserRole.js` - Setare roluri utilizator
   - `functions/src/auth/setSubscriptionPermissions.js` - Permisiuni bazate pe abonament

8. **Cloud Functions pentru Administrator**
   - `functions/src/admin/equipment.js` - Gestionare echipamente
   - `functions/src/admin/groups.js` - Gestionare grupe antrenament
   - `functions/src/admin/subscriptions.js` - Gestionare abonamente
   - `functions/src/admin/attendance.js` - Gestionare prezențe și recuperări

9. **Cloud Functions pentru Utilizator**
   - `functions/src/user/profile.js` - Gestionare profil
   - `functions/src/user/progress.js` - Tracking progres
   - `functions/src/user/absences.js` - Gestionare absențe

10. **Cloud Functions pentru AI**
    - `functions/src/ai/workout-generator.js` - Generare planuri antrenament
    - `functions/src/ai/meal-planner.js` - Generare planuri nutriționale
    - `functions/src/ai/food-analyzer.js` - Analiză fotografii mâncăruri
    - `functions/src/ai/chatbot.js` - Funcționalitate chatbot

11. **Agenți AI cu LangChain**
    - `functions/src/ai/agents/workout-agent/index.js` - Agent pentru antrenamente
    - `functions/src/ai/agents/nutrition-agent/index.js` - Agent pentru nutriție
    - `functions/src/ai/agents/medical-agent/index.js` - Agent pentru evaluări medicale
    - `functions/src/ai/agents/utils/prompts.js` - Template-uri de prompturi

12. **Notificări**
    - `functions/src/notifications/sms.js` - Trimitere notificări SMS
    - `functions/src/notifications/subscriptionReminders.js` - Remindere abonamente

### DevOps & Configurare

13. **CI/CD**
    - `.github/workflows/deploy-functions.yml` - Workflow pentru deployarea Cloud Functions
    - `.github/workflows/deploy-frontend.yml` - Workflow pentru deployarea Frontend

14. **Documentație**
    - `docs/architecture/system-overview.md` - Privire de ansamblu asupra sistemului
    - `docs/api/cloud-functions.md` - Documentație API Cloud Functions
    - `docs/guides/development-setup.md` - Ghid configurare mediu de dezvoltare

### Fișiere Generale

15. **Configurare Proiect**
    - `package.json` - Dependințe proiect
    - `.gitignore` - Fișiere ignorate de Git
    - `README.md` - Documentație generală proiect