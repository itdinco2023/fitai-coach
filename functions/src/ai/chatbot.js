const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

class Chatbot {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
      openAIApiKey: functions.config().openai.key,
      modelName: 'gpt-4',
    });
    
    this.prompt = new PromptTemplate({
      template: `Ești un asistent fitness și nutrițional personalizat. Răspunde la întrebările utilizatorului:
      
      Context:
      - Profil utilizator: {userProfile}
      - Istoric conversație: {conversationHistory}
      - Întrebare curentă: {currentQuestion}
      
      Răspunsul trebuie să:
      1. Fie relevant și personalizat
      2. Să includă informații științifice
      3. Să fie în limba română
      4. Să fie concis și clar
      
      Formatul răspunsului trebuie să fie JSON cu următoarea structură:
      {
        "response": {
          "text": "string",
          "tone": "string",
          "confidence": "number"
        },
        "suggestions": {
          "relatedTopics": "string[]",
          "nextSteps": "string[]"
        },
        "resources": {
          "articles": "string[]",
          "videos": "string[]"
        }
      }
      `,
      inputVariables: ["userProfile", "conversationHistory", "currentQuestion"],
    });
  }

  async generateResponse(userData, conversationHistory, question) {
    try {
      const userProfile = userData.profile;
      
      const input = {
        userProfile: JSON.stringify({
          fitnessLevel: userProfile.fitnessLevel,
          goals: userProfile.fitnessGoals,
          restrictions: userProfile.medicalConditions,
          preferences: userProfile.foodPreferences
        }),
        conversationHistory: JSON.stringify(conversationHistory),
        currentQuestion: question,
      };
      
      const prompt = await this.prompt.format(input);
      const response = await this.model.call(prompt);
      const chatbotResponse = JSON.parse(response);
      
      // Validare structură
      if (!chatbotResponse.response || !chatbotResponse.suggestions || !chatbotResponse.resources) {
        throw new Error('Format invalid: lipsesc secțiunile principale');
      }
      
      // Adăugare metadata
      return {
        ...chatbotResponse,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userData.id,
      };
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      throw new Error('Nu s-a putut genera răspunsul. Vă rugăm încercați din nou.');
    }
  }

  async analyzeUserIntent(question) {
    try {
      const intentPrompt = new PromptTemplate({
        template: `Analizează intenția utilizatorului din întrebarea:
        {question}
        
        Identifică:
        1. Subiectul principal
        2. Tipul de informație căutată
        3. Nivelul de detaliu necesar
        
        Formatul răspunsului trebuie să fie JSON cu următoarea structură:
        {
          "intent": {
            "mainTopic": "string",
            "subTopics": "string[]",
            "type": "string"
          },
          "context": {
            "level": "string",
            "urgency": "string"
          },
          "requiredInfo": {
            "specifics": "string[]",
            "details": "string[]"
          }
        }
        `,
        inputVariables: ["question"],
      });
      
      const prompt = await intentPrompt.format({ question });
      const response = await this.model.call(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing user intent:', error);
      throw new Error('Nu s-a putut analiza intenția utilizatorului. Vă rugăm încercați din nou.');
    }
  }
}

module.exports = Chatbot; 