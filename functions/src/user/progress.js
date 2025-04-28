const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Funcție pentru înregistrarea progresului
exports.recordProgress = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { measurements, performance, notes } = data;
    const userId = context.auth.uid;
    
    // Validare date
    if (!measurements || !performance) {
      throw new functions.https.HttpsError('invalid-argument', 'Date incomplete');
    }
    
    // Creare document progres
    const progressRef = admin.firestore().collection('users').doc(userId).collection('progress');
    
    await progressRef.add({
      measurements,
      performance,
      notes,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru obținerea istoricului progresului
exports.getProgressHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { startDate, endDate } = data;
    const userId = context.auth.uid;
    
    // Construire query
    let query = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('progress')
      .orderBy('timestamp', 'desc');
    
    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }
    
    const snapshot = await query.get();
    
    const progress = [];
    snapshot.forEach(doc => {
      progress.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      progress
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru actualizarea obiectivelor de progres
exports.updateProgressGoals = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { goals } = data;
    const userId = context.auth.uid;
    
    // Validare obiective
    if (!goals || typeof goals !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Obiective invalide');
    }
    
    // Actualizare obiective în Firestore
    await admin.firestore().collection('users').doc(userId).update({
      'progress.goals': goals,
      'progress.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcție pentru generarea raportului de progres
exports.generateProgressReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Trebuie să fiți autentificat');
  }
  
  try {
    const { startDate, endDate } = data;
    const userId = context.auth.uid;
    
    // Obținere date progres
    const progressRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('progress');
    
    const snapshot = await progressRef
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'asc')
      .get();
    
    const progress = [];
    snapshot.forEach(doc => {
      progress.push(doc.data());
    });
    
    // Calculare statistici
    const stats = {
      measurements: this.calculateMeasurementStats(progress),
      performance: this.calculatePerformanceStats(progress),
      trends: this.analyzeTrends(progress)
    };
    
    return {
      success: true,
      report: {
        progress,
        stats,
        period: {
          start: startDate,
          end: endDate
        }
      }
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Funcții helper pentru calcularea statisticilor
function calculateMeasurementStats(progress) {
  const stats = {
    weight: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      current: 0
    },
    bodyFat: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      current: 0
    },
    muscleMass: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      current: 0
    }
  };
  
  let totalWeight = 0;
  let totalBodyFat = 0;
  let totalMuscleMass = 0;
  
  progress.forEach(entry => {
    const { measurements } = entry;
    
    // Weight
    if (measurements.weight) {
      stats.weight.min = Math.min(stats.weight.min, measurements.weight);
      stats.weight.max = Math.max(stats.weight.max, measurements.weight);
      totalWeight += measurements.weight;
      stats.weight.current = measurements.weight;
    }
    
    // Body Fat
    if (measurements.bodyFat) {
      stats.bodyFat.min = Math.min(stats.bodyFat.min, measurements.bodyFat);
      stats.bodyFat.max = Math.max(stats.bodyFat.max, measurements.bodyFat);
      totalBodyFat += measurements.bodyFat;
      stats.bodyFat.current = measurements.bodyFat;
    }
    
    // Muscle Mass
    if (measurements.muscleMass) {
      stats.muscleMass.min = Math.min(stats.muscleMass.min, measurements.muscleMass);
      stats.muscleMass.max = Math.max(stats.muscleMass.max, measurements.muscleMass);
      totalMuscleMass += measurements.muscleMass;
      stats.muscleMass.current = measurements.muscleMass;
    }
  });
  
  const count = progress.length;
  if (count > 0) {
    stats.weight.avg = totalWeight / count;
    stats.bodyFat.avg = totalBodyFat / count;
    stats.muscleMass.avg = totalMuscleMass / count;
  }
  
  return stats;
}

function calculatePerformanceStats(progress) {
  const stats = {
    strength: {
      improvements: [],
      plateaus: [],
      declines: []
    },
    endurance: {
      improvements: [],
      plateaus: [],
      declines: []
    },
    consistency: {
      attendance: 0,
      completion: 0
    }
  };
  
  progress.forEach(entry => {
    const { performance } = entry;
    
    // Analiză forță
    if (performance.strength) {
      Object.entries(performance.strength).forEach(([exercise, data]) => {
        if (data.trend === 'improvement') {
          stats.strength.improvements.push(exercise);
        } else if (data.trend === 'plateau') {
          stats.strength.plateaus.push(exercise);
        } else if (data.trend === 'decline') {
          stats.strength.declines.push(exercise);
        }
      });
    }
    
    // Analiză rezistență
    if (performance.endurance) {
      Object.entries(performance.endurance).forEach(([exercise, data]) => {
        if (data.trend === 'improvement') {
          stats.endurance.improvements.push(exercise);
        } else if (data.trend === 'plateau') {
          stats.endurance.plateaus.push(exercise);
        } else if (data.trend === 'decline') {
          stats.endurance.declines.push(exercise);
        }
      });
    }
    
    // Analiză consistență
    if (performance.consistency) {
      stats.consistency.attendance += performance.consistency.attendance || 0;
      stats.consistency.completion += performance.consistency.completion || 0;
    }
  });
  
  return stats;
}

function analyzeTrends(progress) {
  const trends = {
    measurements: {
      weight: [],
      bodyFat: [],
      muscleMass: []
    },
    performance: {
      strength: [],
      endurance: []
    }
  };
  
  progress.forEach(entry => {
    const { measurements, performance } = entry;
    
    // Trend măsurători
    if (measurements) {
      if (measurements.weight) trends.measurements.weight.push(measurements.weight);
      if (measurements.bodyFat) trends.measurements.bodyFat.push(measurements.bodyFat);
      if (measurements.muscleMass) trends.measurements.muscleMass.push(measurements.muscleMass);
    }
    
    // Trend performanță
    if (performance) {
      if (performance.strength) {
        Object.values(performance.strength).forEach(data => {
          trends.performance.strength.push(data.value);
        });
      }
      if (performance.endurance) {
        Object.values(performance.endurance).forEach(data => {
          trends.performance.endurance.push(data.value);
        });
      }
    }
  });
  
  return trends;
} 