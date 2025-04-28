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