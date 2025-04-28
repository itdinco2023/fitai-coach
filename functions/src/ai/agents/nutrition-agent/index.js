// functions/src/ai/agents/nutrition-agent.js
const { initializeAgent } = require('langchain/agents');
const { PromptTemplate } = require('langchain/prompts');
const { StructuredOutputParser } = require('langchain/output_parsers');
const functions = require('firebase-functions');
const { Anthropic } = require('@anthropic-ai/sdk');

/**
 * Agent specializat pentru generarea planurilor nutriționale personalizate
 * Utilizează Claude API pentru a genera meniuri și recomandări adaptate
 */
class NutritionAgent {
  constructor() {
    // Inițializare client Claude
    this.claude = new Anthropic({
      apiKey: functions.config().claude.key,
    });
    
    // Structura output pentru a asigura un format consistent
    this.parser = StructuredOutputParser.fromNamesAndDescriptions({
      meals: "Lista de mese pentru ziua curentă, inclusiv ingrediente și cantități.",
      macros: "Valori macronutrienți (proteine, carbohidrați, grăsimi, calorii totale).",
      alternatives: "Alternative pentru alimente, pentru diversificare.",
      hydration: "Recomandări privind hidratarea.",
      notes: "Sfaturi nutriționale sau mențiuni importante."
    });
    
    // Template pentru prompt
    this.promptTemplate = `
    Generează un plan nutrițional personalizat în limba română pentru un utilizator cu următorul profil:
    
    Obiective: {goals}
    Date fizice: Înălțime {height}cm, Greutate {weight}kg, Vârstă {age} ani, Gen {gender}
    Restricții alimentare: {restrictions}
    Preferințe culinare: {preferences}
    Alimente preferate: {likedFoods}
    Alimente evitate: {dislikedFoods}
    Nivel de activitate: {activityLevel}
    
    Planul nutrițional trebuie să fie adaptat la obiectivele utilizatorului, să respecte restricțiile alimentare și să includă preferințele culinare.
    
    Asigură-te că:
    1. Meniurile sunt variate și echilibrate nutrițional
    2. Sunt indicate porțiile și cantitățile (în grame)
    3. Sunt calculate macronutrienții și caloriile pentru fiecare masă
    4. Sunt oferite alternative pentru ingredientele principale
    5. Meniurile sunt adaptate bucătăriei românești
    
    Răspunsul tău trebuie să urmeze acest format:
    {format_instructions}
    `;
  }
  
  /**
   * Generează un plan nutrițional personalizat
   * @param {Object} userData - Datele utilizatorului
   * @returns {Object} - Planul nutrițional generat
   */
  async generateMealPlan(userData) {
    try {
      // Construim datele de input pentru prompt
      const userProfile = userData.profile;
      const foodPreferences = userProfile.foodPreferences || { liked: [], disliked: [] };
      
      // Calculăm necesarul caloric bazat pe datele utilizatorului
      const calorieNeeds = this.calculateCalorieNeeds(
        userProfile.height,
        userProfile.weight,
        this.calculateAge(userProfile.birthdate),
        userProfile.gender,
        userProfile.activityLevel || 'moderat'
      );
      
      // Construim prompt-ul complet
      const prompt = this.promptTemplate
        .replace('{goals}', userProfile.fitnessGoals.join(', '))
        .replace('{height}', userProfile.height)
        .replace('{weight}', userProfile.weight)
        .replace('{age}', this.calculateAge(userProfile.birthdate))
        .replace('{gender}', userProfile.gender)
        .replace('{restrictions}', userProfile.dietaryRestrictions.join(', ') || 'Niciuna')
        .replace('{preferences}', userProfile.dietaryPreferences || 'Fără preferințe specifice')
        .replace('{likedFoods}', foodPreferences.liked.join(', ') || 'Nespecificat')
        .replace('{dislikedFoods}', foodPreferences.disliked.join(', ') || 'Nespecificat')
        .replace('{activityLevel}', userProfile.activityLevel || 'moderat')
        .replace('{format_instructions}', this.parser.getFormatInstructions());
      
      // Apelăm Claude API
      const response = await this.claude.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        temperature: 0.7,
        system: "Ești un nutriționist expert care creează planuri alimentare personalizate în limba română.",
        messages: [
          { role: "user", content: prompt }
        ]
      });
      
      // Parsăm răspunsul în formatul structurat
      const content = response.content[0].text;
      const parsedPlan = await this.parser.parse(content);
      
      // Adăugăm metadata și necesarul caloric calculat
      return {
        ...parsedPlan,
        calorieNeeds,
        createdAt: new Date().toISOString(),
        userId: userData.id,
        status: 'draft', // Planul trebuie aprobat de admin
      };
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error('Nu s-a putut genera planul nutrițional. Vă rugăm încercați din nou.');
    }
  }
  
  /**
   * Calculează vârsta în funcție de data nașterii
   * @param {string} birthdate - Data nașterii
   * @returns {number} - Vârsta calculată
   */
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
  
  /**
   * Calculează necesarul caloric zilnic
   * @param {number} height - Înălțimea în cm
   * @param {number} weight - Greutatea în kg
   * @param {number} age - Vârsta
   * @param {string} gender - Genul (masculin/feminin)
   * @param {string} activityLevel - Nivelul de activitate
   * @returns {number} - Necesarul caloric estimat
   */
  calculateCalorieNeeds(height, weight, age, gender, activityLevel) {
    // Calculul BMR (Basal Metabolic Rate) folosind formula Harris-Benedict
    let bmr;
    
    if (gender.toLowerCase() === 'masculin') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    // Ajustarea în funcție de nivelul de activitate
    const activityMultipliers = {
      'sedentar': 1.2,
      'ușor': 1.375,
      'moderat': 1.55,
      'activ': 1.725,
      'foarte activ': 1.9
    };
    
    const multiplier = activityMultipliers[activityLevel.toLowerCase()] || 1.55;
    
    return Math.round(bmr * multiplier);
  }
}

module.exports = NutritionAgent;