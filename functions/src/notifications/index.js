const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru trimiterea unei notificări
exports.sendNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { userId, title, body, data: notificationData, type } = data;
    
    // Validare date
    if (!userId || !title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'Date incomplete');
    }
    
    // Obținere token-uri FCM
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Utilizatorul nu există');
    }
    
    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || [];
    
    if (fcmTokens.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Utilizatorul nu are token-uri FCM');
    }
    
    // Construire mesaj notificare
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...notificationData,
        type: type || 'general',
        timestamp: Date.now().toString()
      },
      tokens: fcmTokens
    };
    
    // Trimitere notificare
    const response = await admin.messaging().sendMulticast(message);
    
    // Actualizare token-uri invalide
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          invalidTokens.push(fcmTokens[idx]);
        }
      });
      
      if (invalidTokens.length > 0) {
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        });
      }
    }
    
    // Salvare notificare în istoric
    await admin.firestore().collection('users').doc(userId).collection('notifications').add({
      title,
      body,
      data: notificationData,
      type: type || 'general',
      status: 'sent',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return {
      success: true,
      sentCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru trimiterea notificărilor de programare
exports.sendScheduleNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { sessionId, type } = data;
    
    // Validare date
    if (!sessionId || !type) {
      throw new functions.https.HttpsError('invalid-argument', 'Date incomplete');
    }
    
    // Obținere date sesiune
    const sessionRef = admin.firestore().collection('sessions').doc(sessionId);
    const session = await sessionRef.get();
    
    if (!session.exists) {
      throw new functions.https.HttpsError('not-found', 'Sesiunea nu există');
    }
    
    const sessionData = session.data();
    
    // Obținere membri grupei
    const groupRef = admin.firestore().collection('groups').doc(sessionData.groupId);
    const group = await groupRef.get();
    
    if (!group.exists) {
      throw new functions.https.HttpsError('not-found', 'Grupa nu există');
    }
    
    const groupData = group.data();
    const memberIds = groupData.memberIds || [];
    
    // Construire mesaj notificare
    let title, body;
    
    switch (type) {
      case 'reminder':
        title = 'Reminder sesiune';
        body = `Nu uitați că aveți o sesiune programată pentru ${sessionData.date.toDate().toLocaleString()}`;
        break;
      case 'cancellation':
        title = 'Sesiune anulată';
        body = `Sesiunea programată pentru ${sessionData.date.toDate().toLocaleString()} a fost anulată`;
        break;
      case 'modification':
        title = 'Modificare sesiune';
        body = `Sesiunea programată pentru ${sessionData.date.toDate().toLocaleString()} a fost modificată`;
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Tip notificare invalid');
    }
    
    // Trimitere notificări către toți membrii
    const notifications = memberIds.map(async (memberId) => {
      const userDoc = await admin.firestore().collection('users').doc(memberId).get();
      
      if (!userDoc.exists) return null;
      
      const userData = userDoc.data();
      const fcmTokens = userData.fcmTokens || [];
      
      if (fcmTokens.length === 0) return null;
      
      const message = {
        notification: { title, body },
        data: {
          sessionId,
          type,
          timestamp: Date.now().toString()
        },
        tokens: fcmTokens
      };
      
      return admin.messaging().sendMulticast(message);
    });
    
    const results = await Promise.all(notifications.filter(Boolean));
    
    // Procesare rezultate
    let totalSent = 0;
    let totalFailed = 0;
    
    results.forEach((response) => {
      if (response) {
        totalSent += response.successCount;
        totalFailed += response.failureCount;
      }
    });
    
    return {
      success: true,
      sentCount: totalSent,
      failureCount: totalFailed
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru trimiterea notificărilor de progres
exports.sendProgressNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { userId, type, data: progressData } = data;
    
    // Validare date
    if (!userId || !type || !progressData) {
      throw new functions.https.HttpsError('invalid-argument', 'Date incomplete');
    }
    
    // Obținere date utilizator
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Utilizatorul nu există');
    }
    
    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || [];
    
    if (fcmTokens.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Utilizatorul nu are token-uri FCM');
    }
    
    // Construire mesaj notificare
    let title, body;
    
    switch (type) {
      case 'milestone':
        title = 'Obiectiv atins!';
        body = `Felicitări! Ați atins obiectivul: ${progressData.milestone}`;
        break;
      case 'improvement':
        title = 'Progres semnificativ';
        body = `Ați înregistrat o îmbunătățire în ${progressData.area}`;
        break;
      case 'reminder':
        title = 'Actualizare progres';
        body = 'Nu uitați să vă actualizați progresul pentru această săptămână';
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Tip notificare invalid');
    }
    
    const message = {
      notification: { title, body },
      data: {
        ...progressData,
        type,
        timestamp: Date.now().toString()
      },
      tokens: fcmTokens
    };
    
    // Trimitere notificare
    const response = await admin.messaging().sendMulticast(message);
    
    // Actualizare token-uri invalide
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          invalidTokens.push(fcmTokens[idx]);
        }
      });
      
      if (invalidTokens.length > 0) {
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        });
      }
    }
    
    return {
      success: true,
      sentCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 