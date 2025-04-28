const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');

class MotivationAgent {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
    });
    
    this.prompt = new PromptTemplate({
      template: `Generează un mesaj motivațional personalizat:
      Context:
      - Obiective: {goals}
      - Progres: {progress}
      - Provocări: {challenges}
      - Preferințe: {preferences}
      
      Mesajul trebuie să:
      1. Fie personalizat pentru utilizator
      2. Să includă elemente motivaționale relevante
      3. Să ofere suport și încurajare
      4. Să includă sugestii practice
      
      Formatul răspunsului trebuie să fie JSON cu următoarea structură:
      {
        "message": {
          "greeting": "string",
          "acknowledgment": "string",
          "motivation": "string",
          "support": "string",
          "action": "string"
        },
        "elements": {
          "quotes": "string[]",
          "tips": "string[]",
          "reminders": "string[]"
        },
        "suggestions": {
          "activities": "string[]",
          "resources": "string[]",
          "community": "string[]"
        },
        "followUp": {
          "questions": "string[]",
          "nextSteps": "string[]"
        }
      }
      `,
      inputVariables: ["goals", "progress", "challenges", "preferences"],
    });
  }

  async generateMotivationalMessage(data) {
    try {
      const input = await this.prompt.format(data);
      const response = await this.model.call(input);
      
      // Parsare și validare răspuns
      const message = JSON.parse(response);
      
      // Validare structură
      if (!message.message || !message.elements || !message.suggestions) {
        throw new Error('Format invalid: lipsesc secțiunile principale');
      }
      
      // Validare mesaj
      const messageFields = ['greeting', 'acknowledgment', 'motivation', 'support', 'action'];
      messageFields.forEach(field => {
        if (!message.message[field]) {
          throw new Error(`Format invalid: lipsesc câmpuri pentru mesaj`);
        }
      });
      
      return message;
    } catch (error) {
      console.error('Error generating motivational message:', error);
      throw error;
    }
  }

  async generateDailyMotivation(userData) {
    try {
      const dailyPrompt = new PromptTemplate({
        template: `Generează un mesaj motivațional zilnic:
        Date utilizator: {userData}
        
        Mesajul trebuie să:
        1. Fie scurt și impactant
        2. Să includă un element motivațional
        3. Să fie relevant pentru ziua curentă
        4. Să includă un call-to-action
        
        Formatul răspunsului trebuie să fie JSON cu următoarea structură:
        {
          "dailyMessage": {
            "quote": "string",
            "message": "string",
            "action": "string"
          },
          "reminder": {
            "goal": "string",
            "tip": "string"
          },
          "motivation": {
            "element": "string",
            "reason": "string"
          }
        }
        `,
        inputVariables: ["userData"],
      });
      
      const input = await dailyPrompt.format({
        userData: JSON.stringify(userData),
      });
      
      const response = await this.model.call(input);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating daily motivation:', error);
      throw error;
    }
  }
}

module.exports = MotivationAgent; 