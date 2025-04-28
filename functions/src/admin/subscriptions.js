// functions/src/admin/subscriptions.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Serviciu pentru gestionarea abonamentelor
 * Gestionează tipurile de abonamente, reînnoiri și notificări
 */
class SubscriptionService {
  /**
   * Creează sau actualizează un abonament pentru un utilizator
   * @param {String} userId - ID-ul utilizatorului
   * @param {Object} subscriptionData - Datele abonamentului
   * @returns {Object} - Abonamentul actualizat
   */
  async updateUserSubscription(userId, subscriptionData) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const { type, startDate, endDate, price } = subscriptionData;
      
      // Validăm tipul abonamentului
      const validTypes = ['basic', 'fitness', 'nutrition', 'complete'];
      if (!validTypes.includes(type)) {
        throw new Error(`Tip de abonament invalid: ${type}`);
      }
      
      // Convertim datele în timestamp-uri Firestore dacă sunt furnizate ca string-uri
      let startTimestamp = startDate;
      let endTimestamp = endDate;
      
      if (typeof startDate === 'string') {
        startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
      }
      
      if (typeof endDate === 'string') {
        endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));
      }
      
      // Stabilim permisiunile în funcție de tipul abonamentului
      const permissions = {
        canAccessFitnessPlans: ['fitness', 'complete'].includes(type),
        canAccessNutritionPlans: ['nutrition', 'complete'].includes(type),
        canUploadMealPhotos: ['nutrition', 'complete'].includes(type),
        canTrackProgress: ['fitness', 'nutrition', 'complete'].includes(type),
        canScheduleRecoveries: ['fitness', 'complete'].includes(type)
      };
      
      // Creăm sau actualizăm abonamentul
      const subscription = {
        type,
        startDate: startTimestamp,
        endDate: endTimestamp,
        status: 'active',
        paymentHistory: admin.firestore.FieldValue.arrayUnion({
          date: admin.firestore.FieldValue.serverTimestamp(),
          amount: price || 0,
          status: 'paid',
          confirmedBy: admin.auth().currentUser.uid // Admin-ul care a confirmat
        })
      };
      
      // Actualizăm profilul utilizatorului
      await userRef.update({
        'subscription': subscription,
        'permissions': permissions,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Programăm notificarea pentru expirarea abonamentului
      await this.scheduleSubscriptionExpiryReminder(userId, endTimestamp);
      
      return {
        success: true,
        message: 'Abonamentul a fost actualizat cu succes.',
        subscription
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Nu s-a putut actualiza abonamentul: ${error.message}`);
    }
  }
  
  /**
   * Procesează reînnoirea unui abonament
   * @param {String} userId - ID-ul utilizatorului
   * @param {Boolean} paid - Starea plății
   * @returns {Object} - Rezultatul procesării
   */
  async processSubscriptionRenewal(userId, paid) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription) {
        throw new Error('Utilizatorul nu are un abonament existent.');
      }
      
      // Calculăm data de sfârșit a noului abonament
      const currentEndDate = subscription.endDate.toDate();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1); // Adăugăm o lună
      
      // Construim obiectul pentru actualizarea istoricului plăților
      const paymentRecord = {
        date: admin.firestore.FieldValue.serverTimestamp(),
        amount: 0, // Suma va fi setată de admin
        status: paid ? 'paid' : 'unpaid',
        confirmedBy: admin.auth().currentUser.uid
      };
      
      // Actualizăm starea abonamentului
      if (paid) {
        await userRef.update({
          'subscription.endDate': admin.firestore.Timestamp.fromDate(newEndDate),
          'subscription.status': 'active',
          'subscription.paymentHistory': admin.firestore.FieldValue.arrayUnion(paymentRecord),
          'updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Programăm notificarea pentru expirarea abonamentului
        await this.scheduleSubscriptionExpiryReminder(userId, admin.firestore.Timestamp.fromDate(newEndDate));
      } else {
        // Dacă nu s-a plătit, adăugăm doar în istoric și actualizăm status-ul
        await userRef.update({
          'subscription.status': 'pending_renewal',
          'subscription.paymentHistory': admin.firestore.FieldValue.arrayUnion(paymentRecord),
          'updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Actualizăm suma totală datorată
        await this.calculateTotalDue(userId);
      }
      
      return {
        success: true,
        message: paid ? 'Reînnoirea abonamentului a fost procesată cu succes.' : 'Abonamentul a fost marcat ca neplătit.',
        newEndDate: paid ? newEndDate : null
      };
    } catch (error) {
      console.error('Error processing subscription renewal:', error);
      throw new Error(`Nu s-a putut procesa reînnoirea abonamentului: ${error.message}`);
    }
  }
  
  /**
   * Calculează suma totală datorată de un utilizator
   * @param {String} userId - ID-ul utilizatorului
   * @returns {Number} - Suma totală datorată
   */
  async calculateTotalDue(userId) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription) {
        return 0;
      }
      
      // Obținem prețul abonamentului din configurația sălii
      const gymRef = db.collection('gyms').doc(userData.gymId);
      const gymDoc = await gymRef.get();
      
      if (!gymDoc.exists) {
        throw new Error('Sala nu există.');
      }
      
      const gymData = gymDoc.data();
      const subscriptionType = subscription.type;
      
      const subscriptionConfig = gymData.settings.subscriptionTypes.find(
        sub => sub.name === subscriptionType
      );
      
      if (!subscriptionConfig) {
        throw new Error(`Configurația pentru tipul de abonament ${subscriptionType} nu a fost găsită.`);
      }
      
      const monthlyPrice = subscriptionConfig.price;
      
      // Calculăm restanțele din istoricul plăților
      let totalDue = 0;
      
      if (subscription.status === 'pending_renewal') {
        totalDue += monthlyPrice; // Adăugăm prețul abonamentului curent
      }
      
      // Adăugăm toate plățile neplătite din istoric
      const unpaidPayments = subscription.paymentHistory.filter(
        payment => payment.status === 'unpaid'
      );
      
      for (const payment of unpaidPayments) {
        totalDue += payment.amount || monthlyPrice;
      }
      
      // Actualizăm suma totală datorată în profilul utilizatorului
      await userRef.update({
        'subscription.totalDue': totalDue,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
      
      return totalDue;
    } catch (error) {
      console.error('Error calculating total due:', error);
      throw new Error(`Nu s-a putut calcula suma totală datorată: ${error.message}`);
    }
  }
  
  /**
   * Programează trimiterea unui reminder pentru expirarea abonamentului
   * @param {String} userId - ID-ul utilizatorului
   * @param {admin.firestore.Timestamp} expiryDate - Data expirării
   */
  async scheduleSubscriptionExpiryReminder(userId, expiryDate) {
    try {
      // Calculăm data pentru reminder (cu 2 zile înainte de expirare)
      const expiryDateTime = expiryDate.toDate();
      const reminderDate = new Date(expiryDateTime);
      reminderDate.setDate(reminderDate.getDate() - 2);
      
      // Verificăm dacă data reminder-ului este în viitor
      const now = new Date();
      if (reminderDate <= now) {
        // Dacă data reminder-ului a trecut deja, nu mai programăm
        return;
      }
      
      // Programăm notificarea
      const remindersRef = db.collection('scheduledReminders');
      await remindersRef.add({
        userId,
        type: 'subscription_expiry',
        scheduledFor: admin.firestore.Timestamp.fromDate(reminderDate),
        expiryDate,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error scheduling expiry reminder:', error);
      // Nu aruncăm eroarea mai departe, pentru a nu afecta fluxul principal de actualizare abonament
    }
  }
  
  /**
   * Obține lista utilizatorilor cu abonamente care expiră în curând
   * @param {Number} daysThreshold - Pragul în zile (default: 7)
   * @returns {Array} - Lista utilizatorilor
   */
  async getExpiringSubscriptions(daysThreshold = 7) {
    try {
      const now = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(now.getDate() + daysThreshold);
      
      const usersRef = db.collection('users');
      const snapshot = await usersRef
        .where('subscription.status', '==', 'active')
        .where('subscription.endDate', '<=', admin.firestore.Timestamp.fromDate(thresholdDate))
        .where('subscription.endDate', '>=', admin.firestore.Timestamp.fromDate(now))
        .get();
      
      const expiringUsers = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        expiringUsers.push({
          id: doc.id,
          name: userData.name,
          email: userData.email,
          subscription: {
            type: userData.subscription.type,
            endDate: userData.subscription.endDate.toDate(),
            daysUntilExpiry: Math.ceil(
              (userData.subscription.endDate.toDate() - now) / (1000 * 60 * 60 * 24)
            )
          }
        });
      });
      
      return expiringUsers;
    } catch (error) {
      console.error('Error getting expiring subscriptions:', error);
      throw new Error(`Nu s-au putut obține abonamentele care expiră: ${error.message}`);
    }
  }
}

module.exports = new SubscriptionService();