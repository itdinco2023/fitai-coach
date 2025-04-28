const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru înregistrarea unei absențe
exports.recordAbsence = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { sessionId, reason, notes } = data;
    const userId = context.auth.uid;
    
    // Validare date
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'ID sesiune lipsă');
    }
    
    // Verificare sesiune
    const sessionRef = admin.firestore().collection('sessions').doc(sessionId);
    const session = await sessionRef.get();
    
    if (!session.exists) {
      throw new functions.https.HttpsError('not-found', 'Sesiunea nu există');
    }
    
    // Creare document absență
    const absenceRef = admin.firestore().collection('users').doc(userId).collection('absences');
    
    await absenceRef.add({
      sessionId,
      reason,
      notes,
      status: 'pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Actualizare prezență în sesiune
    await sessionRef.update({
      [`attendanceList.${userId}`]: 'absent',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru programarea unei recuperări
exports.scheduleRecovery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { absenceId, recoverySessionId } = data;
    const userId = context.auth.uid;
    
    // Validare date
    if (!absenceId || !recoverySessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Date incomplete');
    }
    
    // Verificare absență
    const absenceRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('absences')
      .doc(absenceId);
    
    const absence = await absenceRef.get();
    
    if (!absence.exists) {
      throw new functions.https.HttpsError('not-found', 'Absența nu există');
    }
    
    // Verificare sesiune recuperare
    const recoverySessionRef = admin.firestore().collection('sessions').doc(recoverySessionId);
    const recoverySession = await recoverySessionRef.get();
    
    if (!recoverySession.exists) {
      throw new functions.https.HttpsError('not-found', 'Sesiunea de recuperare nu există');
    }
    
    // Actualizare absență
    await absenceRef.update({
      recoverySessionId,
      status: 'scheduled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Adăugare utilizator în sesiunea de recuperare
    await recoverySessionRef.update({
      temporaryMembers: admin.firestore.FieldValue.arrayUnion({
        userId,
        originalAbsenceId: absenceId
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru obținerea istoricului absențelor
exports.getAbsenceHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { startDate, endDate, status } = data;
    const userId = context.auth.uid;
    
    // Construire query
    let query = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('absences')
      .orderBy('timestamp', 'desc');
    
    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    
    const absences = [];
    snapshot.forEach(doc => {
      absences.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      absences
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru anularea unei recuperări
exports.cancelRecovery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { absenceId } = data;
    const userId = context.auth.uid;
    
    // Validare date
    if (!absenceId) {
      throw new functions.https.HttpsError('invalid-argument', 'ID absență lipsă');
    }
    
    // Verificare absență
    const absenceRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('absences')
      .doc(absenceId);
    
    const absence = await absenceRef.get();
    
    if (!absence.exists) {
      throw new functions.https.HttpsError('not-found', 'Absența nu există');
    }
    
    const absenceData = absence.data();
    
    if (absenceData.status !== 'scheduled') {
      throw new functions.https.HttpsError('failed-precondition', 'Absența nu are o recuperare programată');
    }
    
    // Actualizare absență
    await absenceRef.update({
      recoverySessionId: admin.firestore.FieldValue.delete(),
      status: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Eliminare utilizator din sesiunea de recuperare
    if (absenceData.recoverySessionId) {
      const recoverySessionRef = admin.firestore().collection('sessions').doc(absenceData.recoverySessionId);
      
      await recoverySessionRef.update({
        temporaryMembers: admin.firestore.FieldValue.arrayRemove({
          userId,
          originalAbsenceId: absenceId
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 