import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Grid, 
  Chip, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  Stack
} from '@mui/material';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../../contexts/AuthContext';
import { useUser } from '../../../contexts/UserContext';

/**
 * Componenta pentru gestionarea sesiunilor de recuperare
 */
const RecoverySessions = () => {
  const { currentUser } = useAuth();
  const { userData } = useUser();
  const db = getFirestore();
  const functions = getFunctions();
  
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [pendingAbsences, setPendingAbsences] = useState([]);
  const [recoveries, setRecoveries] = useState([]);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [selectedRecoverySession, setSelectedRecoverySession] = useState('');
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Verificăm eligibilitatea utilizatorului pentru recuperări
  useEffect(() => {
    const checkEligibility = async () => {
      if (!currentUser || !userData) return;
      
      setLoading(true);
      
      try {
        const getRecoveryEligibilityFn = httpsCallable(functions, 'getRecoveryEligibility');
        const result = await getRecoveryEligibilityFn({ userId: currentUser.uid });
        
        setEligibility(result.data);
      } catch (error) {
        console.error('Error checking recovery eligibility:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la verificarea eligibilității pentru recuperări.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkEligibility();
  }, [currentUser, userData, functions]);
  
  // Încărcăm absențele și recuperările
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser || !userData) return;
      
      try {
        // Extragem absențele care așteaptă recuperare
        const absences = userData.group?.absences || [];
        const pendingAbsences = absences.filter(absence => 
          absence.status === 'pending_recovery'
        );
        
        // Încărcăm detalii despre ședințele asociate absențelor
        const absencesWithDetails = await Promise.all(
          pendingAbsences.map(async (absence) => {
            const sessionRef = doc(db, 'sessions', absence.sessionId);
            const sessionDoc = await getDoc(sessionRef);
            
            if (sessionDoc.exists()) {
              const sessionData = sessionDoc.data();
              return {
                ...absence,
                sessionDetails: {
                  ...sessionData,
                  date: sessionData.date.toDate()
                }
              };
            } else {
              return absence;
            }
          })
        );
        
        setPendingAbsences(absencesWithDetails);
        
        // Extragem recuperările programate
        const recoveries = userData.group?.recoveries || [];
        const recoveryWithDetails = await Promise.all(
          recoveries.map(async (recovery) => {
            // Obținem detalii despre grupa temporară pentru recuperare
            const groupRef = doc(db, 'groups', recovery.temporaryGroupId);
            const groupDoc = await getDoc(groupRef);
            let groupData = null;
            
            if (groupDoc.exists()) {
              groupData = groupDoc.data();
            }
            
            return {
              ...recovery,
              recoveryDate: recovery.recoveryDate.toDate(),
              groupDetails: groupData
            };
          })
        );
        
        setRecoveries(recoveryWithDetails);
      } catch (error) {
        console.error('Error loading user absences and recoveries:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la încărcarea absențelor și recuperărilor.',
          severity: 'error',
        });
      }
    };
    
    loadUserData();
  }, [currentUser, userData, db]);
  
  // Funcție pentru a deschide dialogul de programare recuperare
  const handleOpenRecoveryDialog = async (absence) => {
    setSelectedAbsence(absence);
    setRecoveryLoading(true);
    
    try {
      // Obținem ședințele disponibile pentru recuperare
      const checkAvailableRecoverySlotsFn = httpsCallable(functions, 'checkAvailableRecoverySlots');
      const result = await checkAvailableRecoverySlotsFn({ userId: currentUser.uid });
      
      // Convertim datele pentru a gestiona corect datele
      const availableSessions = result.data.map(session => ({
        ...session,
        date: new Date(session.date)
      }));
      
      setAvailableSessions(availableSessions);
      setRecoveryDialogOpen(true);
    } catch (error) {
      console.error('Error fetching available recovery slots:', error);
      setSnackbar({
        open: true,
        message: 'Eroare la obținerea ședințelor disponibile pentru recuperare.',
        severity: 'error',
      });
    } finally {
      setRecoveryLoading(false);
    }
  };
  
  // Închide dialogul
  const handleCloseRecoveryDialog = () => {
    setRecoveryDialogOpen(false);
    setSelectedRecoverySession('');
    setSelectedAbsence(null);
  };
  
  // Procesează programarea recuperării
  const handleScheduleRecovery = async () => {
    if (!selectedRecoverySession || !selectedAbsence) {
      setSnackbar({
        open: true,
        message: 'Vă rugăm selectați o ședință pentru recuperare.',
        severity: 'warning',
      });
      return;
    }
    
    setRecoveryLoading(true);
    
    try {
      // Apelăm Cloud Function pentru a programa recuperarea
      const scheduleRecoverySessionFn = httpsCallable(functions, 'scheduleRecoverySession');
      const result = await scheduleRecoverySessionFn({
        userId: currentUser.uid,
        originalSessionId: selectedAbsence.sessionId,
        recoverySessionId: selectedRecoverySession
      });
      
      // Actualizăm UI-ul
      handleCloseRecoveryDialog();
      
      setSnackbar({
        open: true,
        message: 'Recuperarea a fost programată cu succes.',
        severity: 'success',
      });
      
      // Reîmprospătăm datele pentru a reflecta schimbarea
      window.location.reload();
    } catch (error) {
      console.error('Error scheduling recovery:', error);
      setSnackbar({
        open: true,
        message: `Eroare la programarea recuperării: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setRecoveryLoading(false);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };
  
  const getStatusChip = (status) => {
    const statusMap = {
      'scheduled': { label: 'Programată', color: 'primary' },
      'completed': { label: 'Efectuată', color: 'success' },
      'missed': { label: 'Ratată', color: 'error' },
      'pending_recovery': { label: 'Așteaptă recuperare', color: 'warning' },
      'scheduled_recovery': { label: 'Recuperare programată', color: 'info' },
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'default' };
    
    return (
      <Chip 
        label={statusInfo.label} 
        color={statusInfo.color} 
        size="small" 
      />
    );
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Recuperări Ședințe
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {eligibility && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Status Recuperări
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    Recuperări disponibile: <strong>{eligibility.remainingRecoveries} din 2</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    Absențe în așteptare: <strong>{eligibility.absencesPendingRecovery}</strong>
                  </Typography>
                </Grid>
              </Grid>
              
              {!eligibility.eligible && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {eligibility.reason || 'Nu mai aveți recuperări disponibile pentru luna curentă.'}
                </Typography>
              )}
            </Box>
          )}
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Absențe Anunțate
            </Typography>
            
            {pendingAbsences.length > 0 ? (
              <List>
                {pendingAbsences.map((absence, index) => (
                  <React.Fragment key={absence.sessionId || index}>
                    <ListItem 
                      alignItems="flex-start"
                      secondaryAction={
                        eligibility?.eligible && (
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => handleOpenRecoveryDialog(absence)}
                            disabled={recoveryLoading}
                          >
                            Programează Recuperare
                          </Button>
                        )
                      }
                    >
                      <ListItemText
                        primary={
                          <>
                            {absence.sessionDetails ? (
                              <>
                                {format(absence.sessionDetails.date, 'EEEE, d MMMM', { locale: ro })} - {absence.sessionDetails.startTime}-{absence.sessionDetails.endTime}
                              </>
                            ) : (
                              `Ședința din ${format(absence.date.toDate(), 'EEEE, d MMMM', { locale: ro })}`
                            )}
                          </>
                        }
                        secondary={
                          <Stack direction="column" spacing={1} sx={{ mt: 1 }}>
                            {absence.reason && (
                              <Typography variant="body2" component="span">
                                Motiv: {absence.reason}
                              </Typography>
                            )}
                            <Box>
                              {getStatusChip(absence.status)}
                            </Box>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {index < pendingAbsences.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                Nu aveți absențe anunțate care să aștepte recuperare.
              </Typography>
            )}
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Recuperări Programate
            </Typography>
            
            {recoveries.length > 0 ? (
              <List>
                {recoveries.map((recovery, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <>
                            {format(recovery.recoveryDate, 'EEEE, d MMMM', { locale: ro })}
                            {recovery.groupDetails && (
                              <> - Grupa: {recovery.groupDetails.name}</>
                            )}
                          </>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {getStatusChip(recovery.status)}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recoveries.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                Nu aveți recuperări programate.
              </Typography>
            )}
          </Box>
        </>
      )}
      
      {/* Dialog programare recuperare */}
      <Dialog 
        open={recoveryDialogOpen} 
        onClose={handleCloseRecoveryDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Programează Recuperare</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Selectați o ședință disponibilă pentru recuperare:
          </Typography>
          
          {recoveryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <Select
                value={selectedRecoverySession}
                onChange={(e) => setSelectedRecoverySession(e.target.value)}
                displayEmpty
              >
                <MenuItem value="" disabled>Selectați o ședință</MenuItem>
                
                {availableSessions.map((session) => (
                  <MenuItem key={session.id} value={session.id}>
                    {format(session.date, 'EEEE, d MMMM', { locale: ro })} - {session.startTime}-{session.endTime} | Grupa: {session.groupName}
                  </MenuItem>
                ))}
              </Select>
              
              <FormHelperText>
                Veți fi adăugat temporar în această grupă doar pentru ședința selectată.
              </FormHelperText>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecoveryDialog}>Anulează</Button>
          <Button 
            onClick={handleScheduleRecovery} 
            variant="contained" 
            disabled={!selectedRecoverySession || recoveryLoading}
          >
            {recoveryLoading ? <CircularProgress size={24} /> : 'Programează'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default RecoverySessions;