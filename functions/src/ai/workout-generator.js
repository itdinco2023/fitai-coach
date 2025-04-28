const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

class WorkoutGenerator {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
      openAIApiKey: functions.config().openai.key,
      modelName: 'gpt-4',
    });
    
    this.prompt = new PromptTemplate({
      template: `Generează un plan de antrenament personalizat în limba română:
      
      Profil utilizator:
      - Nivel: {level}
      - Obiective: {goals}
      - Date fizice: {physicalData}
      - Restricții: {restrictions}
      - Echipamente: {equipment}
      
      Planul trebuie să:
      1. Fie adaptat la nivelul și obiectivele utilizatorului
      2. Să includă exerciții variate și progresive
      3. Să țină cont de restricțiile medicale
      4. Să utilizeze echipamentele disponibile
      
      Formatul răspunsului trebuie să fie JSON cu următoarea structură:
      {
        "workoutPlan": {
          "name": "string",
          "description": "string",
          "duration": "number",
          "difficulty": "string",
          "sessions": [
            {
              "day": "string",
              "focus": "string",
              "exercises": [
                {
                  "name": "string",
                  "sets": "number",
                  "reps": "string",
                  "rest": "string",
                  "notes": "string"
                }
              ]
            }
          ]
        },
        "recommendations": {
          "warmup": "string[]",
          "cooldown": "string[]",
          "tips": "string[]"
        },
        "progression": {
          "weekly": "string",
          "monthly": "string"
        }
      }
      `,
      inputVariables: ["level", "goals", "physicalData", "restrictions", "equipment"],
    });
  }

  async generateWorkoutPlan(userData, gymEquipment) {
    try {
      const userProfile = userData.profile;
      
      const input = {
        level: userProfile.fitnessLevel || 'începător',
        goals: userProfile.fitnessGoals.join(', '),
        physicalData: JSON.stringify({
          height: userProfile.height,
          weight: userProfile.weight,
          age: this.calculateAge(userProfile.birthdate),
          gender: userProfile.gender
        }),
        restrictions: userProfile.medicalConditions.join(', ') || 'Niciuna',
        equipment: gymEquipment.map(eq => eq.name).join(', '),
      };
      
      const prompt = await this.prompt.format(input);
      const response = await this.model.call(prompt);
      const workoutPlan = JSON.parse(response);
      
      // Validare structură
      if (!workoutPlan.workoutPlan || !workoutPlan.recommendations || !workoutPlan.progression) {
        throw new Error('Format invalid: lipsesc secțiunile principale');
      }
      
      // Adăugare metadata
      return {
        ...workoutPlan,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: userData.id,
        status: 'draft',
      };
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw new Error('Nu s-a putut genera planul de antrenament. Vă rugăm încercați din nou.');
    }
  }

  calculateAge(birthdate) {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}

module.exports = WorkoutGenerator; 