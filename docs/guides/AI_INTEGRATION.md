# Integrarea AI în FitAI Coach

## Prezentare generală

FitAI Coach utilizează inteligență artificială pentru a oferi funcționalități avansate în domeniul fitness și nutriție. Acest ghid explică cum sunt integrate serviciile AI în aplicație.

## Servicii AI utilizate

1. **OpenAI GPT-4**
   - Generare planuri de antrenament
   - Analiză nutrițională
   - Chatbot pentru asistență

2. **LangChain**
   - Agenți specializați
   - Procesare limbaj natural
   - Integrare cu baza de date

3. **Vision AI**
   - Analiză imagini mâncăruri
   - Detecție exerciții
   - Verificare formă

## Configurare

### 1. OpenAI

1. Creează un cont în [OpenAI Platform](https://platform.openai.com)
2. Generează un API key
3. Adaugă în `.env`:
```
VITE_OPENAI_API_KEY=your_api_key
```

### 2. LangChain

1. Instalează dependințele:
```bash
cd functions
npm install langchain openai
```

2. Configurează agenții:
```javascript
const { OpenAI } = require('langchain/llms/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');

const model = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
});

const executor = await initializeAgentExecutorWithOptions(
  [/* tools */],
  model,
  {
    agentType: "zero-shot-react-description",
    verbose: true,
  }
);
```

## Implementare

### 1. Agent pentru Antrenamente

```javascript
// functions/src/ai/agents/workout-agent.js
const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');

class WorkoutAgent {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
    });
    
    this.prompt = new PromptTemplate({
      template: `Generează un plan de antrenament pentru:
      Nivel: {level}
      Obiective: {goals}
      Preferințe: {preferences}
      `,
      inputVariables: ["level", "goals", "preferences"],
    });
  }

  async generateWorkoutPlan(params) {
    const input = await this.prompt.format(params);
    const response = await this.model.call(input);
    return this.parseResponse(response);
  }
}
```

### 2. Agent pentru Nutriție

```javascript
// functions/src/ai/agents/nutrition-agent.js
const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');

class NutritionAgent {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
    });
    
    this.prompt = new PromptTemplate({
      template: `Generează un plan nutrițional pentru:
      Calorii: {calories}
      Macros: {macros}
      Preferințe: {preferences}
      `,
      inputVariables: ["calories", "macros", "preferences"],
    });
  }

  async generateMealPlan(params) {
    const input = await this.prompt.format(params);
    const response = await this.model.call(input);
    return this.parseResponse(response);
  }
}
```

### 3. Analiză Imagini

```javascript
// functions/src/ai/food-analyzer.js
const { OpenAI } = require('openai');

class FoodAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeImage(imageBuffer) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analizează această imagine de mâncare și identifică alimentele și valorile nutriționale." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
              },
            },
          ],
        },
      ],
    });

    return this.parseResponse(response);
  }
}
```

## Best Practices

1. **Rate Limiting**
   - Implementează rate limiting pentru API calls
   - Cache rezultatele frecvente
   - Monitorizează utilizarea

2. **Error Handling**
   - Gestionează erorile API
   - Implementează retry logic
   - Logează erorile

3. **Optimizare Costuri**
   - Cache rezultatele
   - Limitează dimensiunea contextului
   - Monitorizează utilizarea

4. **Securitate**
   - Validează input-ul
   - Sanitizează output-ul
   - Protejează API keys

## Testare

```javascript
// functions/src/ai/__tests__/workout-agent.test.js
const { WorkoutAgent } = require('../agents/workout-agent');

describe('WorkoutAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new WorkoutAgent();
  });

  test('generează plan de antrenament valid', async () => {
    const params = {
      level: 'intermediar',
      goals: ['masă musculară', 'forță'],
      preferences: {
        duration: 60,
        equipment: ['greutăți', 'bande elastice'],
      },
    };

    const plan = await agent.generateWorkoutPlan(params);
    expect(plan).toHaveProperty('exercises');
    expect(plan.exercises.length).toBeGreaterThan(0);
  });
});
```

## Monitorizare

1. **Logs**
   - Monitorizează API calls
   - Urmărește erorile
   - Analizează performanța

2. **Metrics**
   - Rate de succes
   - Timp de răspuns
   - Utilizare resurse

3. **Alerts**
   - Erori critice
   - Rate limiting
   - Costuri excesive 