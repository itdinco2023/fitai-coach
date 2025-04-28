// functions/src/admin/attendance.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Serviciu pentru gestionarea prezenței și recuperărilor
 * Gestionează absențele, programarea recuperărilor și tracking-ul participării
 */
class AttendanceService {
  /**
   * Marchează absența unui utilizator la o ședință programată
   * @param {String} userId - ID-ul utilizatorului
   * @param {String} sessionId - ID-ul ședinței
   * @param {String} reason - Motivul absenței (opțional)
   * @returns {Object} - Confirmarea operațiunii
   */
  async markUserAbsence(userId, sessionId, reason = '') {
    try {
      // Verificăm dacă utilizatorul există și are abonament activ
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const userData = userDoc.data();
      if (userData.subscription.status !== 'active') {
        throw new Error('Utilizatorul nu are un abonament activ.');
      }
      
      // Verificăm dacă ședința există și este în viitor
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) {
        throw new Error('Ședința nu există.');
      }
      
      const sessionData = sessionDoc.data();
      const sessionDate = sessionData.date.toDate();
      
      if (sessionDate < new Date()) {
        throw new Error('Nu se poate marca absența pentru o ședință din trecut.');
      }
      
      // Verificăm dacă utilizatorul face parte din grupa pentru această ședință
      if (userData.group.groupId !== sessionData.groupId) {
        throw new Error('Utilizatorul nu face parte din această grupă.');
      }
      
      // Înregistrăm absența în profilul utilizatorului
      await userRef.update({
        'group.absences': admin.firestore.FieldValue.arrayUnion({
          date: sessionData.date,
          sessionId,
          reason,
          status: 'pending_recovery',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      });
      
      // Actualizăm lista de prezență pentru ședință
      await sessionRef.update({
        [`attendanceList.${userId}`]: 'absent'
      });
      
      return {
        success: true,
        message: 'Absența a fost înregistrată cu succes.'
      };
    } catch (error) {
      console.error('Error marking absence:', error);
      throw new Error(`Nu s-a putut înregistra absența: ${error.message}`);
    }
  }
  
  /**
   * Programează o ședință de recuperare pentru un utilizator
   * @param {String} userId - ID-ul utilizatorului
   * @param {String} originalSessionId - ID-ul ședinței originale
   * @param {String} recoverySessionId - ID-ul ședinței de recuperare
   * @returns {Object} - Confirmarea operațiunii
   */
  async scheduleRecoverySession(userId, originalSessionId, recoverySessionId) {
    try {
      // Verificăm dacă utilizatorul are dreptul la recuperare (max 2 / lună)
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const userData = userDoc.data();
      
      // Verificăm dacă utilizatorul are o absență înregistrată pentru ședința originală
      const hasAbsence = userData.group.absences?.some(
        absence => absence.sessionId === originalSessionId && absence.status === 'pending_recovery'
      );
      
      if (!hasAbsence) {
        throw new Error('Nu există o absență înregistrată pentru ședința specificată.');
      }
      
      // Verificăm dacă utilizatorul a atins limita de recuperări pentru luna curentă
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const recoveriesThisMonth = (userData.group.recoveries || []).filter(recovery => {
        const recoveryDate = recovery.recoveryDate.toDate();
        return recoveryDate.getMonth() === currentMonth && 
               recoveryDate.getFullYear() === currentYear &&
               recovery.status !== 'missed';
      });
      
      if (recoveriesThisMonth.length >= 2) {
        throw new Error('Utilizatorul a atins limita de 2 recuperări pentru luna curentă.');
      }
      
      // Verificăm dacă ședința de recuperare există și este în viitor
      const recoverySessionRef = db.collection('sessions').doc(recoverySessionId);
      const recoverySessionDoc = await recoverySessionRef.get();
      
      if (!recoverySessionDoc.exists) {
        throw new Error('Ședința de recuperare nu există.');
      }
      
      const recoverySessionData = recoverySessionDoc.data();
      const recoveryDate = recoverySessionData.date.toDate();
      
      if (recoveryDate < new Date()) {
        throw new Error('Nu se poate programa recuperarea pentru o ședință din trecut.');
      }
      
      // Adăugăm recuperarea în profilul utilizatorului
      await userRef.update({
        'group.recoveries': admin.firestore.FieldValue.arrayUnion({
          originalSessionId,
          recoveryDate: recoverySessionData.date,
          temporaryGroupId: recoverySessionData.groupId,
          status: 'scheduled',
          scheduledAt: admin.firestore.FieldValue.serverTimestamp()
        }),
        // Actualizăm statusul absenței
        'group.absences': userData.group.absences.map(absence => {
          if (absence.sessionId === originalSessionId) {
            return {
              ...absence,
              status: 'scheduled_recovery'
            };
          }
          return absence;
        })
      });
      
      // Adăugăm utilizatorul ca membru temporar al ședinței de recuperare
      await recoverySessionRef.update({
        temporaryMembers: admin.firestore.FieldValue.arrayUnion({
          userId,
          originalGroupId: userData.group.groupId
        }),
        [`attendanceList.${userId}`]: 'recovering'
      });
      
      return {
        success: true,
        message: 'Ședința de recuperare a fost programată cu succes.'
      };
    } catch (error) {
      console.error('Error scheduling recovery:', error);
      throw new Error(`Nu s-a putut programa recuperarea: ${error.message}`);
    }
  }
  
  /**
   * Generează lista de prezență pentru o ședință
   * @param {String} sessionId - ID-ul ședinței
   * @returns {Object} - Lista de prezență
   */
  async generateAttendanceList(sessionId) {
    try {
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) {
        throw new Error('Ședința nu există.');
      }
      
      const sessionData = sessionDoc.data();
      const groupId = sessionData.groupId;
      
      // Obținem membrii grupei
      const groupRef = db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();
      
      if (!groupDoc.exists) {
        throw new Error('Grupa nu există.');
      }
      
      const groupData = groupDoc.data();
      const memberIds = groupData.memberIds || [];
      
      // Construim lista de prezență
      const attendanceList = {};
      
      // Adăugăm membrii permanenți ai grupei
      for (const memberId of memberIds) {
        // Verificăm dacă utilizatorul a anunțat absență pentru această ședință
        const userRef = db.collection('users').doc(memberId);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const hasMarkedAbsence = userData.group?.absences?.some(
            absence => absence.sessionId === sessionId
          );
          
          attendanceList[memberId] = hasMarkedAbsence ? 'absent' : 'present';
        }
      }
      
      // Adăugăm membrii temporari (cei care recuperează)
      const temporaryMembers = sessionData.temporaryMembers || [];
      for (const tempMember of temporaryMembers) {
        attendanceList[tempMember.userId] = 'recovering';
      }
      
      // Actualizăm lista de prezență în sesiune
      await sessionRef.update({ attendanceList });
      
      return {
        sessionId,
        date: sessionData.date,
        groupId,
        attendanceList
      };
    } catch (error) {
      console.error('Error generating attendance list:', error);
      throw new Error(`Nu s-a putut genera lista de prezență: ${error.message}`);
    }
  }
  
  /**
   * Marchează prezența pentru o ședință
   * @param {String} sessionId - ID-ul ședinței
   * @param {Object} attendanceData - Datele de prezență (userId: status)
   * @returns {Object} - Confirmarea operațiunii
   */
  async markAttendance(sessionId, attendanceData) {
    try {
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) {
        throw new Error('Ședința nu există.');
      }
      
      const sessionData = sessionDoc.data();
      
      // Verificăm dacă ședința este în trecut sau în desfășurare
      const sessionDate = sessionData.date.toDate();
      const now = new Date();
      
      if (sessionDate > now) {
        throw new Error('Nu se poate marca prezența pentru o ședință viitoare.');
      }
      
      // Actualizăm lista de prezență
      const updates = {};
      for (const [userId, status] of Object.entries(attendanceData)) {
        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
          throw new Error(`Status invalid pentru utilizatorul ${userId}: ${status}`);
        }
        
        updates[`attendanceList.${userId}`] = status;
      }
      
      await sessionRef.update(updates);
      
      // Actualizăm și statutul recuperărilor pentru utilizatorii care recuperează
      const temporaryMembers = sessionData.temporaryMembers || [];
      
      for (const tempMember of temporaryMembers) {
        const userId = tempMember.userId;
        
        if (userId in attendanceData) {
          const userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Găsim recuperarea pentru această ședință
            const updatedRecoveries = userData.group.recoveries.map(recovery => {
              // Verificăm dacă această recuperare este pentru ședința curentă
              if (recovery.recoveryDate.isEqual(sessionData.date)) {
                return {
                  ...recovery,
                  status: attendanceData[userId] === 'present' ? 'completed' : 'missed'
                };
              }
              return recovery;
            });
            
            await userRef.update({
              'group.recoveries': updatedRecoveries
            });
          }
        }
      }
      
      return {
        success: true,
        message: 'Prezența a fost înregistrată cu succes.'
      };
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw new Error(`Nu s-a putut înregistra prezența: ${error.message}`);
    }
  }
  
  /**
   * Verifică ședințele disponibile pentru recuperare
   * @param {String} userId - ID-ul utilizatorului
   * @param {Object} dateRange - Intervalul de date pentru căutare
   * @returns {Array} - Lista de ședințe disponibile pentru recuperare
   */
  async checkAvailableRecoverySlots(userId, dateRange) {
    try {
      // Obținem informațiile utilizatorului
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const userData = userDoc.data();
      const userGroupId = userData.group.groupId;
      const userLevel = userData.profile.fitnessLevel;
      
      // Intervalul de date pentru căutare (default: următoarele 2 săptămâni)
      const startDate = dateRange?.startDate || new Date();
      let endDate = dateRange?.endDate;
      
      if (!endDate) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // 2 săptămâni în viitor
      }
      
      // Căutăm ședințe viitoare compatibile cu nivelul utilizatorului
      const sessionsRef = db.collection('sessions');
      const sessionsSnapshot = await sessionsRef
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      
      // Filtrăm ședințele pentru a exclude:
      // 1. Ședințele din grupa utilizatorului
      // 2. Ședințele la capacitate maximă
      // 3. Ședințele incompatibile cu nivelul utilizatorului
      const availableSessions = [];
      
      for (const doc of sessionsSnapshot.docs) {
        const sessionData = doc.data();
        
        // Excludem ședințele din grupa utilizatorului
        if (sessionData.groupId === userGroupId) {
          continue;
        }
        
        // Obținem informații despre grupă
        const groupRef = db.collection('groups').doc(sessionData.groupId);
        const groupDoc = await groupRef.get();
        
        if (!groupDoc.exists) {
          continue;
        }
        
        const groupData = groupDoc.data();
        
        // Verificăm compatibilitatea nivelului
        if (groupData.difficultyLevel !== userLevel) {
          continue;
        }
        
        // Verificăm capacitatea
        const currentAttendees = Object.keys(sessionData.attendanceList || {}).length;
        const temporaryAttendees = (sessionData.temporaryMembers || []).length;
        const totalAttendees = currentAttendees + temporaryAttendees;
        
        if (totalAttendees >= groupData.maxCapacity) {
          continue;
        }
        
        // Adăugăm ședința la lista disponibilă
        availableSessions.push({
          id: doc.id,
          date: sessionData.date.toDate(),
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          groupId: sessionData.groupId,
          groupName: groupData.name,
          availableSlots: groupData.maxCapacity - totalAttendees
        });
      }
      
      return availableSessions;
    } catch (error) {
      console.error('Error checking available recovery slots:', error);
      throw new Error(`Nu s-au putut verifica ședințele disponibile: ${error.message}`);
    }
  }
  
  /**
   * Verifică eligibilitatea unui utilizator pentru programarea recuperărilor
   * @param {String} userId - ID-ul utilizatorului
   * @returns {Object} - Informații despre eligibilitate
   */
  async getRecoveryEligibility(userId) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('Utilizatorul nu există.');
      }
      
      const userData = userDoc.data();
      
      // Verificăm dacă utilizatorul are abonament activ
      if (userData.subscription.status !== 'active') {
        return {
          eligible: false,
          reason: 'Utilizatorul nu are un abonament activ.',
          remainingRecoveries: 0
        };
      }
      
      // Verificăm dacă utilizatorul are abonament care permite recuperări
      if (!['fitness', 'complete'].includes(userData.subscription.type)) {
        return {
          eligible: false,
          reason: 'Tipul de abonament nu permite programarea recuperărilor.',
          remainingRecoveries: 0
        };
      }
      
      // Verificăm numărul de recuperări din luna curentă
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const recoveriesThisMonth = (userData.group.recoveries || []).filter(recovery => {
        const recoveryDate = recovery.recoveryDate.toDate();
        return recoveryDate.getMonth() === currentMonth && 
               recoveryDate.getFullYear() === currentYear &&
               recovery.status !== 'missed';
      });
      
      const maxRecoveries = 2; // Limita de recuperări per lună
      const remainingRecoveries = maxRecoveries - recoveriesThisMonth.length;
      
      return {
        eligible: remainingRecoveries > 0,
        remainingRecoveries,
        recoveriesThisMonth: recoveriesThisMonth.length,
        absencesPendingRecovery: userData.group.absences.filter(
          absence => absence.status === 'pending_recovery'
        ).length
      };
    } catch (error) {
      console.error('Error checking recovery eligibility:', error);
      throw new Error(`Nu s-a putut verifica eligibilitatea pentru recuperări: ${error.message}`);
    }
  }
}

module.exports = new AttendanceService();