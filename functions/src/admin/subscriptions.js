const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru actualizarea unui abonament
exports.updateSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot actualiza abonamente');
  }
  
  try {
    const { userId, subscription } = data;
    
    const userRef = admin.firestore().collection('users').doc(userId);
    
    await userRef.update({
      subscription: {
        ...subscription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });
    
    // Actualizare custom claims
    await admin.auth().setCustomUserClaims(userId, {
      subscriptionType: subscription.type,
      subscriptionStatus: subscription.status
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru procesarea unei plăți
exports.processPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot procesa plăți');
  }
  
  try {
    const { userId, amount, subscriptionType } = data;
    
    const userRef = admin.firestore().collection('users').doc(userId);
    const user = await userRef.get();
    
    if (!user.exists) {
      throw new functions.https.HttpsError('not-found', 'Utilizatorul nu există');
    }
    
    const userData = user.data();
    const currentSubscription = userData.subscription || {};
    
    // Calculare date abonament
    const startDate = admin.firestore.Timestamp.now();
    const endDate = new Date(startDate.toDate());
    endDate.setDate(endDate.getDate() + 30); // 30 zile
    
    // Adăugare plată în istoric
    const paymentHistory = currentSubscription.paymentHistory || [];
    paymentHistory.push({
      date: startDate,
      amount,
      status: 'paid',
      confirmedBy: context.auth.uid
    });
    
    // Actualizare abonament
    await userRef.update({
      subscription: {
        type: subscriptionType,
        startDate,
        endDate: admin.firestore.Timestamp.fromDate(endDate),
        status: 'active',
        paymentHistory,
        totalDue: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    });
    
    // Actualizare custom claims
    await admin.auth().setCustomUserClaims(userId, {
      subscriptionType,
      subscriptionStatus: 'active'
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru verificarea abonamentelor expirate
exports.checkExpiredSubscriptions = functions.pubsub.schedule('0 0 * * *').onRun(async (context) => {
  try {
    const now = admin.firestore.Timestamp.now();
    
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef
      .where('subscription.status', '==', 'active')
      .where('subscription.endDate', '<=', now)
      .get();
    
    const batch = admin.firestore().batch();
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        'subscription.status': 'expired',
        'subscription.updatedAt': now
      });
      
      // Actualizare custom claims
      admin.auth().setCustomUserClaims(doc.id, {
        subscriptionStatus: 'expired'
      });
    });
    
    await batch.commit();
    
    return { success: true, expiredCount: snapshot.size };
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return { success: false, error: error.message };
  }
});

// Funcție pentru obținerea raportului financiar
exports.getFinancialReport = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot accesa rapoartele');
  }
  
  try {
    const { startDate, endDate } = data;
    
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef
      .where('subscription.paymentHistory.date', '>=', startDate)
      .where('subscription.paymentHistory.date', '<=', endDate)
      .get();
    
    const report = {
      totalRevenue: 0,
      subscriptionsByType: {},
      paymentsByDate: {}
    };
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      const payments = userData.subscription?.paymentHistory || [];
      
      payments.forEach(payment => {
        if (payment.date >= startDate && payment.date <= endDate) {
          report.totalRevenue += payment.amount;
          
          // Agregare după tip abonament
          const type = userData.subscription.type;
          report.subscriptionsByType[type] = (report.subscriptionsByType[type] || 0) + payment.amount;
          
          // Agregare după dată
          const date = payment.date.toDate().toISOString().split('T')[0];
          report.paymentsByDate[date] = (report.paymentsByDate[date] || 0) + payment.amount;
        }
      });
    });
    
    return { success: true, report };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 