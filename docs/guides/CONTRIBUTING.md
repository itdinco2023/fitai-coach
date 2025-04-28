# Ghid de Contribuție

## Cum să contribui

1. Fork repository-ul
2. Creează un branch nou (`git checkout -b feature/amazing-feature`)
3. Commit schimbările (`git commit -m 'Add some amazing feature'`)
4. Push la branch (`git push origin feature/amazing-feature`)
5. Deschide un Pull Request

## Procesul de dezvoltare

### Configurare mediu de dezvoltare

1. Instalează dependințele:
```bash
npm install
```

2. Configurează variabilele de mediu:
```bash
cp .env.example .env
```

3. Pornește serverul de dezvoltare:
```bash
npm run dev
```

### Codare

- Folosește ESLint pentru consistență
- Scrie teste pentru funcționalități noi
- Documentează codul complex
- Urmează convențiile de numire

### Commit-uri

Formatul pentru mesajele de commit:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Tipuri:
- feat: Nouă funcționalitate
- fix: Reparare bug
- docs: Documentație
- style: Formatare
- refactor: Refactorizare
- test: Teste
- chore: Sarcini de mentenanță

### Pull Requests

1. Actualizează README.md cu detalii despre schimbări
2. Adaugă teste pentru funcționalități noi
3. Asigură-te că toate testele trec
4. Actualizează documentația

## Structura proiectului

```
fitai-coach/
├── src/                    # Cod sursă frontend
├── functions/             # Cloud Functions
├── docs/                  # Documentație
└── firebase/             # Configurări Firebase
```

## Testare

```bash
# Rulare teste
npm test

# Rulare teste cu coverage
npm run test:coverage
```

## Deployment

1. Build:
```bash
npm run build
```

2. Deploy:
```bash
firebase deploy
```

## Cod de conduită

- Fiți respectuoși
- Acceptați feedback constructiv
- Concentrați-vă pe ce este mai bun pentru comunitate
- Mănțineți un mediu prietenos și incluziv

## Licență

Acest proiect este licențiat sub [MIT License](LICENSE). 