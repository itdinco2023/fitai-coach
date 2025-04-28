const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');

class ProgressAgent {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
    });
    
    this.prompt = new PromptTemplate({
      template: `Analizează progresul utilizatorului și oferă recomandări:
      Date de progres:
      - Măsurători: {measurements}
      - Performanță: {performance}
      - Consistență: {consistency}
      - Obiective: {goals}
      
      Analiza trebuie să includă:
      1. Evaluarea progresului față de obiective
      2. Identificarea zonelor de îmbunătățire
      3. Recomandări pentru ajustări
      4. Sugestii pentru menținerea motivației
      
      Formatul răspunsului trebuie să fie JSON cu următoarea structură:
      {
        "progress": {
          "strength": {
            "current": "number",
            "target": "number",
            "percentage": "number"
          },
          "endurance": {
            "current": "number",
            "target": "number",
            "percentage": "number"
          },
          "bodyComposition": {
            "current": "object",
            "target": "object",
            "percentage": "number"
          }
        },
        "analysis": {
          "strengths": "string[]",
          "weaknesses": "string[]",
          "recommendations": "string[]"
        },
        "adjustments": {
          "workout": "object",
          "nutrition": "object",
          "recovery": "object"
        },
        "motivation": {
          "tips": "string[]",
          "milestones": "object[]"
        }
      }
      `,
      inputVariables: ["measurements", "performance", "consistency", "goals"],
    });
  }

  async analyzeProgress(data) {
    try {
      const input = await this.prompt.format(data);
      const response = await this.model.call(input);
      
      // Parsare și validare răspuns
      const analysis = JSON.parse(response);
      
      // Validare structură
      if (!analysis.progress || !analysis.analysis || !analysis.adjustments) {
        throw new Error('Format invalid: lipsesc secțiunile principale');
      }
      
      // Validare progres
      const progressFields = ['strength', 'endurance', 'bodyComposition'];
      progressFields.forEach(field => {
        if (!analysis.progress[field] || !analysis.progress[field].current || !analysis.progress[field].target) {
          throw new Error(`Format invalid: lipsesc câmpuri pentru ${field}`);
        }
      });
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing progress:', error);
      throw error;
    }
  }

  async generateRecommendations(analysis) {
    try {
      const recommendationPrompt = new PromptTemplate({
        template: `Generează recomandări bazate pe analiza progresului:
        Analiză: {analysis}
        
        Recomandările trebuie să:
        1. Se bazeze pe datele de progres
        2. Fie specifice și acționabile
        3. Țină cont de obiective
        4. Să includă pași clari
        
        Formatul răspunsului trebuie să fie JSON cu următoarea structură:
        {
          "workout": {
            "exercises": "object[]",
            "intensity": "string",
            "frequency": "string"
          },
          "nutrition": {
            "calories": "number",
            "macros": "object",
            "timing": "object"
          },
          "recovery": {
            "rest": "string",
            "techniques": "string[]"
          },
          "nextSteps": "string[]"
        }
        `,
        inputVariables: ["analysis"],
      });
      
      const input = await recommendationPrompt.format({
        analysis: JSON.stringify(analysis),
      });
      
      const response = await this.model.call(input);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
}

module.exports = ProgressAgent; 