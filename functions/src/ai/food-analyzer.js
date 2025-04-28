// functions/src/ai/food-analyzer.js
const functions = require('firebase-functions');
const OpenAI = require('openai');
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');

/**
 * Serviciu specializat pentru analiza fotografiilor cu mâncăruri
 * Utilizează Vision AI pentru a identifica alimentele și a verifica conformitatea cu planul
 */
class FoodAnalyzer {
  constructor() {
    // Inițializare client OpenAI
    this.openai = new OpenAI({
      apiKey: functions.config().openai.key,
    });
    
    // Inițializare Firebase Storage
    this.storage = getStorage();
  }
  
  /**
   * Analizează o fotografie cu mâncare și verifică conformitatea cu planul nutrițional
   * @param {String} userId - ID-ul utilizatorului
   * @param {String} photoUrl - URL-ul fotografiei în Storage
   * @param {Object} mealPlan - Planul nutrițional pentru verificare
   * @returns {Object} - Rezultatul analizei
   */
  async analyzeMealPhoto(userId, photoUrl, mealPlan) {
    try {
      // Obținem imaginea din Firebase Storage
      const bucket = this.storage.bucket();
      const file = bucket.file(photoUrl);
      
      // Convert to base64
      const [content] = await file.download();
      const base64Image = content.toString('base64');
      
      // Construim prompt-ul pentru analiză
      let prompt = `Analizează această imagine cu mâncare și identifică următoarele:
      1. Ce alimente sunt prezente în imagine (specificând cantitățile aproximative)
      2. Valorile nutriționale estimate (calorii, proteine, carbohidrați, grăsimi)
      3. Dacă mâncarea respectă următorul plan nutrițional: ${JSON.stringify(mealPlan.meals)}
      
      Informațiile trebuie să fie structurate clar, iar analiza conformității trebuie să fie detaliată.`;
      
      // Apelăm OpenAI Vision API
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });
      
      // Procesăm răspunsul pentru a extrage informațiile relevante
      const analysis = this.extractAnalysisFromResponse(response.choices[0].message.content);
      
      // Salvăm rezultatul analizei în Firestore
      await admin.firestore().collection('users').doc(userId).collection('nutrition').doc('mealPhotos').collection('analyses').add({
        photoUrl,
        analysis,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        mealPlanId: mealPlan.id,
      });
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing meal photo:', error);
      throw new Error('Nu s-a putut analiza fotografia. Vă rugăm încercați din nou.');
    }
  }
  
  /**
   * Extrage informațiile structurate din răspunsul OpenAI
   * @param {String} response - Răspunsul OpenAI
   * @returns {Object} - Informații structurate
   */
  extractAnalysisFromResponse(response) {
    try {
      // Structurăm manual răspunsul pentru a extrage informațiile relevante
      // Aceasta este o implementare simplificată; într-o aplicație reală,
      // ar trebui utilizată o soluție mai robustă de parsare
      
      const foodItemsMatch = response.match(/alimente.*?prezente:?([\s\S]*?)(?=valori|caloriile|conformitate|dacă)/i);
      const nutritionMatch = response.match(/valori.*?nutriționale:?([\s\S]*?)(?=conformitate|dacă|concluzie)/i);
      const conformityMatch = response.match(/conform.*?plan:?([\s\S]*?)(?=concluzie|$)/i);
      
      const foodItems = foodItemsMatch ? foodItemsMatch[1].trim().split('\n').map(item => item.trim()).filter(Boolean) : [];
      
      // Determinăm dacă mâncarea respectă planul bazat pe textul de conformitate
      let followsPlan = false;
      let conformityText = conformityMatch ? conformityMatch[1].trim() : '';
      
      if (conformityText.match(/da|respect[aă]|conform[aă]|corespunde/i)) {
        followsPlan = true;
      }
      
      return {
        foodItems,
        nutritionalValues: nutritionMatch ? nutritionMatch[1].trim() : 'Nu s-au putut determina valorile nutriționale.',
        followsPlan,
        aiComments: conformityText,
      };
    } catch (error) {
      console.error('Error extracting analysis:', error);
      return {
        foodItems: [],
        nutritionalValues: 'Nu s-au putut determina valorile nutriționale.',
        followsPlan: false,
        aiComments: 'Nu s-a putut analiza conformitatea cu planul nutrițional.',
      };
    }
  }
}

module.exports = FoodAnalyzer;