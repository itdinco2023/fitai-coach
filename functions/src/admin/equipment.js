const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru adăugarea unui echipament nou
exports.addEquipment = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot adăuga echipamente');
  }
  
  try {
    const { name, description, status, restrictions, muscleGroups } = data;
    
    const equipmentRef = admin.firestore().collection('gyms').doc('main').collection('equipment');
    
    const equipment = await equipmentRef.add({
      name,
      description,
      status,
      restrictions,
      muscleGroups,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true, id: equipment.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea unui echipament
exports.updateEquipment = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot actualiza echipamente');
  }
  
  try {
    const { id, ...updates } = data;
    
    const equipmentRef = admin.firestore().collection('gyms').doc('main').collection('equipment').doc(id);
    
    await equipmentRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru ștergerea unui echipament
exports.deleteEquipment = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot șterge echipamente');
  }
  
  try {
    const { id } = data;
    
    const equipmentRef = admin.firestore().collection('gyms').doc('main').collection('equipment').doc(id);
    
    await equipmentRef.delete();
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru obținerea listei de echipamente
exports.getEquipment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const equipmentRef = admin.firestore().collection('gyms').doc('main').collection('equipment');
    const snapshot = await equipmentRef.get();
    
    const equipment = [];
    snapshot.forEach(doc => {
      equipment.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, equipment };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 