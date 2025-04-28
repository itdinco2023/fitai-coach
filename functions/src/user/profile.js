const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru actualizarea profilului utilizatorului
exports.updateProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { profile } = data;
    const userId = context.auth.uid;
    
    // Validare date profil
    if (!profile || typeof profile !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Profil invalid');
    }
    
    // Actualizare profil în Firestore
    await admin.firestore().collection('users').doc(userId).update({
      profile: {
        ...profile,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru obținerea profilului utilizatorului
exports.getProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const userId = context.auth.uid;
    
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Utilizatorul nu există');
    }
    
    return {
      success: true,
      profile: userDoc.data().profile
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea obiectivelor fitness
exports.updateFitnessGoals = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { goals } = data;
    const userId = context.auth.uid;
    
    // Validare obiective
    if (!Array.isArray(goals)) {
      throw new functions.https.HttpsError('invalid-argument', 'Obiectivele trebuie să fie un array');
    }
    
    // Actualizare obiective în Firestore
    await admin.firestore().collection('users').doc(userId).update({
      'profile.fitnessGoals': goals,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea restricțiilor medicale
exports.updateMedicalRestrictions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { restrictions } = data;
    const userId = context.auth.uid;
    
    // Validare restricții
    if (!Array.isArray(restrictions)) {
      throw new functions.https.HttpsError('invalid-argument', 'Restricțiile trebuie să fie un array');
    }
    
    // Actualizare restricții în Firestore
    await admin.firestore().collection('users').doc(userId).update({
      'profile.medicalConditions': restrictions,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea preferințelor alimentare
exports.updateFoodPreferences = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { preferences } = data;
    const userId = context.auth.uid;
    
    // Validare preferințe
    if (!Array.isArray(preferences)) {
      throw new functions.https.HttpsError('invalid-argument', 'Preferințele trebuie să fie un array');
    }
    
    // Actualizare preferințe în Firestore
    await admin.firestore().collection('users').doc(userId).update({
      'profile.foodPreferences': preferences,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 