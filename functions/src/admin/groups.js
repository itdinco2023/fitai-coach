const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru crearea unei grupe noi
exports.createGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot crea grupe');
  }
  
  try {
    const { name, description, difficultyLevel, maxCapacity, schedule, trainer } = data;
    
    const groupRef = admin.firestore().collection('groups');
    
    const group = await groupRef.add({
      name,
      description,
      difficultyLevel,
      maxCapacity,
      schedule,
      trainer,
      memberIds: [],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true, id: group.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea unei grupe
exports.updateGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot actualiza grupe');
  }
  
  try {
    const { id, ...updates } = data;
    
    const groupRef = admin.firestore().collection('groups').doc(id);
    
    await groupRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru adăugarea unui membru în grupă
exports.addMemberToGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot adăuga membri');
  }
  
  try {
    const { groupId, userId } = data;
    
    const groupRef = admin.firestore().collection('groups').doc(groupId);
    const group = await groupRef.get();
    
    if (!group.exists) {
      throw new functions.https.HttpsError('not-found', 'Grupa nu există');
    }
    
    const groupData = group.data();
    if (groupData.memberIds.length >= groupData.maxCapacity) {
      throw new functions.https.HttpsError('failed-precondition', 'Grupa este plină');
    }
    
    await groupRef.update({
      memberIds: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Actualizare document utilizator
    await admin.firestore().collection('users').doc(userId).update({
      'group.groupId': groupId,
      'group.joinDate': admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru eliminarea unui membru din grupă
exports.removeMemberFromGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot elimina membri');
  }
  
  try {
    const { groupId, userId } = data;
    
    const groupRef = admin.firestore().collection('groups').doc(groupId);
    
    await groupRef.update({
      memberIds: admin.firestore.FieldValue.arrayRemove(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Actualizare document utilizator
    await admin.firestore().collection('users').doc(userId).update({
      'group.groupId': admin.firestore.FieldValue.delete(),
      'group.joinDate': admin.firestore.FieldValue.delete(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru obținerea listei de grupe
exports.getGroups = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const groupsRef = admin.firestore().collection('groups');
    const snapshot = await groupsRef.get();
    
    const groups = [];
    snapshot.forEach(doc => {
      groups.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, groups };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 