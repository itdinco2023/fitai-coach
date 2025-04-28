const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru marcarea prezenței
exports.markAttendance = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot marca prezența');
  }
  
  try {
    const { sessionId, attendance } = data;
    
    const sessionRef = admin.firestore().collection('sessions').doc(sessionId);
    const session = await sessionRef.get();
    
    if (!session.exists) {
      throw new functions.https.HttpsError('not-found', 'Sesiunea nu există');
    }
    
    const sessionData = session.data();
    const attendanceList = sessionData.attendanceList || {};
    
    // Actualizare prezențe
    Object.entries(attendance).forEach(([userId, status]) => {
      attendanceList[userId] = status;
    });
    
    await sessionRef.update({
      attendanceList,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru programarea unei recuperări
exports.scheduleRecovery = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot programa recuperări');
  }
  
  try {
    const { userId, originalSessionId, recoverySessionId } = data;
    
    // Verificare limită recuperări
    const userRef = admin.firestore().collection('users').doc(userId);
    const user = await userRef.get();
    
    if (!user.exists) {
      throw new functions.https.HttpsError('not-found', 'Utilizatorul nu există');
    }
    
    const userData = user.data();
    const recoveries = userData.group?.recoveries || [];
    
    // Verificare număr recuperări în luna curentă
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyRecoveries = recoveries.filter(recovery => {
      const recoveryDate = recovery.recoveryDate.toDate();
      return recoveryDate >= firstDayOfMonth && recoveryDate <= lastDayOfMonth;
    });
    
    if (monthlyRecoveries.length >= 2) {
      throw new functions.https.HttpsError('failed-precondition', 'Limita de recuperări pentru această lună a fost atinsă');
    }
    
    // Adăugare recuperare
    const recovery = {
      originalAbsenceDate: admin.firestore.Timestamp.now(),
      recoveryDate: admin.firestore.Timestamp.now(),
      temporaryGroupId: recoverySessionId,
      status: 'scheduled'
    };
    
    await userRef.update({
      'group.recoveries': admin.firestore.FieldValue.arrayUnion(recovery)
    });
    
    // Actualizare sesiune de recuperare
    const recoverySessionRef = admin.firestore().collection('sessions').doc(recoverySessionId);
    await recoverySessionRef.update({
      temporaryMembers: admin.firestore.FieldValue.arrayUnion({
        userId,
        originalGroupId: userData.group.groupId
      })
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru obținerea raportului de prezență
exports.getAttendanceReport = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Doar administratorii pot accesa rapoartele');
  }
  
  try {
    const { startDate, endDate, groupId } = data;
    
    let sessionsQuery = admin.firestore().collection('sessions')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate);
    
    if (groupId) {
      sessionsQuery = sessionsQuery.where('groupId', '==', groupId);
    }
    
    const snapshot = await sessionsQuery.get();
    
    const report = {
      totalSessions: snapshot.size,
      attendanceByUser: {},
      attendanceByDate: {},
      recoveryStats: {
        total: 0,
        completed: 0,
        missed: 0
      }
    };
    
    snapshot.forEach(doc => {
      const sessionData = doc.data();
      const date = sessionData.date.toDate().toISOString().split('T')[0];
      
      // Agregare prezențe
      Object.entries(sessionData.attendanceList || {}).forEach(([userId, status]) => {
        if (!report.attendanceByUser[userId]) {
          report.attendanceByUser[userId] = {
            present: 0,
            absent: 0,
            recovering: 0
          };
        }
        
        report.attendanceByUser[userId][status]++;
        
        if (!report.attendanceByDate[date]) {
          report.attendanceByDate[date] = {
            present: 0,
            absent: 0,
            recovering: 0
          };
        }
        
        report.attendanceByDate[date][status]++;
      });
      
      // Agregare recuperări
      (sessionData.temporaryMembers || []).forEach(member => {
        report.recoveryStats.total++;
        if (sessionData.attendanceList[member.userId] === 'present') {
          report.recoveryStats.completed++;
        } else if (sessionData.attendanceList[member.userId] === 'absent') {
          report.recoveryStats.missed++;
        }
      });
    });
    
    return { success: true, report };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 