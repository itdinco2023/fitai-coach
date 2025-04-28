const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Inițializare Firebase Admin
admin.initializeApp();

// Inițializare Express
const app = express();
app.use(cors({ origin: true }));

// Importare rute
const authRoutes = require('./src/auth');
const adminRoutes = require('./src/admin');
const aiRoutes = require('./src/ai');
const userRoutes = require('./src/user');
const notificationRoutes = require('./src/notifications');

// Configurare rute
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/ai', aiRoutes);
app.use('/user', userRoutes);
app.use('/notifications', notificationRoutes);

// Exportare API
exports.api = functions.https.onRequest(app);

// Exportare funcții individuale
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Creare document utilizator în Firestore
  await admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    role: 'user',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  // Ștergere document utilizator din Firestore
  await admin.firestore().collection('users').doc(user.uid).delete();
}); 