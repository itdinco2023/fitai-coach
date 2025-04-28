const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');

class FeedbackAgent {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
    });
    
    this.prompt = new PromptTemplate({
      template: `Generează feedback personalizat:
      Context:
      - Performanță: {performance}
      - Obiective: {goals}
      - Istoric: {history}
      - Feedback anterior: {previousFeedback}
      
      Feedback-ul trebuie să:
      1. Fie constructiv și specific
      2. Să includă aspecte pozitive și de îmbunătățire
      3. Să ofere sugestii practice
      4. Să fie adaptat la nivelul utilizatorului
      
      Formatul răspunsului trebuie să fie JSON cu următoarea structură:
      {
        "feedback": {
          "positive": "string[]",
          "improvements": "string[]",
          "suggestions": "string[]"
        },
        "analysis": {
          "strengths": "string[]",
          "weaknesses": "string[]",
          "opportunities": "string[]"
        },
        "recommendations": {
          "immediate": "string[]",
          "shortTerm": "string[]",
          "longTerm": "string[]"
        },
        "actionPlan": {
          "steps": "string[]",
          "timeline": "string[]",
          "resources": "string[]"
        }
      }
      `,
      inputVariables: ["performance", "goals", "history", "previousFeedback"],
    });
  }

  async generateFeedback(data) {
    try {
      const input = await this.prompt.format(data);
      const response = await this.model.call(input);
      
      // Parsare și validare răspuns
      const feedback = JSON.parse(response);
      
      // Validare structură
      if (!feedback.feedback || !feedback.analysis || !feedback.recommendations) {
        throw new Error('Format invalid: lipsesc secțiunile principale');
      }
      
      // Validare feedback
      const feedbackFields = ['positive', 'improvements', 'suggestions'];
      feedbackFields.forEach(field => {
        if (!Array.isArray(feedback.feedback[field])) {
          throw new Error(`Format invalid: câmpurile feedback-ului trebuie să fie array-uri`);
        }
      });
      
      return feedback;
    } catch (error) {
      console.error('Error generating feedback:', error);
      throw error;
    }
  }

  async generateProgressFeedback(progressData) {
    try {
      const progressPrompt = new PromptTemplate({
        template: `Generează feedback despre progres:
        Date progres: {progressData}
        
        Feedback-ul trebuie să:
        1. Analizeze progresul față de obiective
        2. Identifice tendințe și pattern-uri
        3. Sugereze ajustări necesare
        4. Să ofere motivație pentru continuare
        
        Formatul răspunsului trebuie să fie JSON cu următoarea structură:
        {
          "progressAnalysis": {
            "achievements": "string[]",
            "challenges": "string[]",
            "trends": "string[]"
          },
          "adjustments": {
            "recommendations": "string[]",
            "modifications": "string[]"
          },
          "motivation": {
            "encouragement": "string",
            "nextSteps": "string[]"
          }
        }
        `,
        inputVariables: ["progressData"],
      });
      
      const input = await progressPrompt.format({
        progressData: JSON.stringify(progressData),
      });
      
      const response = await this.model.call(input);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating progress feedback:', error);
      throw error;
    }
  }
}

module.exports = FeedbackAgent; 