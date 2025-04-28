const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

class MealPlanner {
  constructor() {
    this.model = new OpenAI({
      temperature: 0.7,
      openAIApiKey: functions.config().openai.key,
      modelName: 'gpt-4',
    });
    
    this.prompt = new PromptTemplate({
      template: `Generează un plan nutrițional personalizat în limba română:
      
      Profil utilizator:
      - Obiective: {goals}
      - Date fizice: {physicalData}
      - Restricții alimentare: {restrictions}
      - Preferințe: {preferences}
      - Nivel activitate: {activityLevel}
      
      Planul trebuie să:
      1. Fie adaptat la obiectivele și restricțiile utilizatorului
      2. Să includă mese echilibrate și variate
      3. Să respecte preferințele alimentare
      4. Să ofere alternative pentru ingrediente
      
      Formatul răspunsului trebuie să fie JSON cu următoarea structură:
      {
        "mealPlan": {
          "name": "string",
          "description": "string",
          "dailyCalories": "number",
          "macros": {
            "proteins": "number",
            "carbs": "number",
            "fats": "number"
          },
          "meals": [
            {
              "name": "string",
              "time": "string",
              "calories": "number",
              "ingredients": [
                {
                  "name": "string",
                  "amount": "string",
                  "unit": "string"
                }
              ],
              "instructions": "string[]",
              "alternatives": "string[]"
            }
          ]
        },
        "recommendations": {
          "hydration": "string[]",
          "supplements": "string[]",
          "tips": "string[]"
        },
        "shoppingList": {
          "ingredients": "string[]",
          "quantities": "string[]"
        }
      }
      `,
      inputVariables: ["goals", "physicalData", "restrictions", "preferences", "activityLevel"],
    });
  }

  async generateMealPlan(userData) {
    try {
      const userProfile = userData.profile;
      
      const input = {
        goals: userProfile.fitnessGoals.join(', '),
        physicalData: JSON.stringify({
          height: userProfile.height,
          weight: userProfile.weight,
          age: this.calculateAge(userProfile.birthdate),
          gender: userProfile.gender
        }),
        restrictions: userProfile.dietaryRestrictions.join(', ') || 'Niciuna',
        preferences: userProfile.foodPreferences.join(', ') || 'Nespecificat',
        activityLevel: userProfile.activityLevel || 'moderat',
      };
      
      const prompt = await this.prompt.format(input);
      const response = await this.model.call(prompt);
      const mealPlan = JSON.parse(response);
      
      // Validare structură
      if (!mealPlan.mealPlan || !mealPlan.recommendations || !mealPlan.shoppingList) {
        throw new Error('Format invalid: lipsesc secțiunile principale');
      }
      
      // Adăugare metadata
      return {
        ...mealPlan,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: userData.id,
        status: 'draft',
      };
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error('Nu s-a putut genera planul nutrițional. Vă rugăm încercați din nou.');
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

module.exports = MealPlanner; 