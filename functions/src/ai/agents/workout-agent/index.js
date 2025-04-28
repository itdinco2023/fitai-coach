// functions/src/ai/agents/workout-agent.js
const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');
const { StructuredOutputParser } = require('langchain/output_parsers');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Agent specializat pentru generarea planurilor de antrenament personalizate
 * Utilizează OpenAI pentru a genera planuri adaptate la profilul și obiectivele utilizatorului
 */
class WorkoutAgent {
  constructor() {
    // Inițializare model OpenAI
    this.model = new OpenAI({
      temperature: 0.7,
      openAIApiKey: functions.config().openai.key,
      modelName: 'gpt-4',
    });
    
    // Structura output pentru a asigura un format consistent
    this.parser = StructuredOutputParser.fromNamesAndDescriptions({
      exercises: "Lista de exerciții, fiecare cu nume, serii, repetări, greutate și notițe.",
      duration: "Durata estimată a antrenamentului în minute.",
      difficulty: "Nivelul de dificultate (începător, intermediar, avansat).",
      muscleGroups: "Grupele musculare principale vizate.",
      notes: "Instrucțiuni sau sfaturi adiționale."
    });
    
    // Template pentru prompt
    this.prompt = new PromptTemplate({
      template: `Generează un plan de antrenament personalizat în limba română pentru un utilizator cu următorul profil:
      
      Nivel de fitness: {level}
      Obiective: {goals}
      Date fizice: Înălțime {height}cm, Greutate {weight}kg, Vârstă {age} ani, Gen {gender}
      Restricții medicale: {restrictions}
      Echipamente disponibile: {equipment}
      
      Planul trebuie să fie adaptat la nivelul utilizatorului, să urmărească obiectivele specificate și să țină cont de restricțiile medicale.
      
      Răspunsul tău trebuie să urmeze acest format:
      {format_instructions}
      `,
      inputVariables: ["level", "goals", "height", "weight", "age", "gender", "restrictions", "equipment"],
      partialVariables: {
        format_instructions: this.parser.getFormatInstructions(),
      }
    });
  }
  
  /**
   * Generează un plan de antrenament personalizat
   * @param {Object} userData - Datele utilizatorului
   * @param {Array} gymEquipment - Echipamentele disponibile
   * @returns {Object} - Planul de antrenament generat
   */
  async generateWorkoutPlan(userData, gymEquipment) {
    try {
      // Construim datele de input pentru prompt
      const userProfile = userData.profile;
      const input = {
        level: userProfile.fitnessLevel || 'începător',
        goals: userProfile.fitnessGoals.join(', '),
        height: userProfile.height,
        weight: userProfile.weight,
        age: this.calculateAge(userProfile.birthdate),
        gender: userProfile.gender,
        restrictions: userProfile.medicalConditions.join(', ') || 'Niciuna',
        equipment: gymEquipment.map(eq => eq.name).join(', '),
      };
      
      // Formatează prompt-ul cu datele utilizatorului
      const prompt = await this.prompt.format(input);
      
      // Obține răspunsul de la OpenAI
      const response = await this.model.call(prompt);
      
      // Parsează răspunsul în formatul structurat
      const parsedPlan = await this.parser.parse(response);
      
      // Adaugă metadata
      return {
        ...parsedPlan,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: userData.id,
        status: 'draft', // Planul trebuie aprobat de admin
      };
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw new Error('Nu s-a putut genera planul de antrenament. Vă rugăm încercați din nou.');
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
}

module.exports = WorkoutAgent;