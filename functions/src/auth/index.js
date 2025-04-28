const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru crearea unui utilizator nou
exports.createUser = functions.https.onCall(async (data, context) => {
  try {
    const { email, password, name, profile } = data;
    
    // Creare utilizator în Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });
    
    // Creare document în Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      name,
      profile,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea rolului unui utilizator
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot actualiza roluri');
  }
  
  try {
    const { uid, role } = data;
    
    // Actualizare rol în Firestore
    await admin.firestore().collection('users').doc(uid).update({ role });
    
    // Actualizare custom claims
    await admin.auth().setCustomUserClaims(uid, { role });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea abonamentului
exports.updateSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot actualiza abonamente');
  }
  
  try {
    const { uid, subscription } = data;
    
    // Actualizare abonament în Firestore
    await admin.firestore().collection('users').doc(uid).update({
      subscription: {
        ...subscription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });
    
    // Actualizare custom claims
    await admin.auth().setCustomUserClaims(uid, { 
      subscriptionType: subscription.type,
      subscriptionStatus: subscription.status
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 