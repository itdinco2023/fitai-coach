import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  TextField, 
  Grid, 
  Chip, 
  CircularProgress, 
  Snackbar, 
  Alert 
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { ro } from 'date-fns/locale';
import { format, isAfter } from 'date-fns';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useUser } from '../../../contexts/UserContext';

/**
 * Componenta pentru marcarea absențelor de către utilizator
 */
const AbsenceMarker = () => {
  const { currentUser } = useAuth();
  const { userData } = useUser();
  const db = getFirestore();
  
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [reason, setReason] = useState('');
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [filterDate, setFilterDate] = useState(new Date());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Încărcăm ședințele disponibile pentru utilizator
  useEffect(() => {
    const fetchUserSessions = async () => {
      if (!currentUser || !userData) return;
      
      setLoading(true);
      
      try {
        // Obținem grupa utilizatorului
        const groupId = userData.group?.groupId;
        
        if (!groupId) {
          setLoading(false);
          return;
        }
        
        // Obținem ședințele viitoare pentru această grupă
        const now = new Date();
        const sessionsRef = collection(db, 'sessions');
        const q = query(
          sessionsRef,
          where('groupId', '==', groupId),
          where('date', '>=', now)
        );
        
        const sessionsSnapshot = await getDocs(q);
        const sessionsData = [];
        
        sessionsSnapshot.forEach((doc) => {
          sessionsData.push({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate()
          });
        });
        
        // Sortăm ședințele după dată
        sessionsData.sort((a, b) => a.date - b.date);
        
        setSessions(sessionsData);
        setFilteredSessions(sessionsData);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la încărcarea ședințelor. Vă rugăm încercați din nou.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserSessions();
  }, [currentUser, userData, db]);
  
  // Filtrăm ședințele în funcție de data selectată
  useEffect(() => {
    if (!sessions.length) return;
    
    const filtered = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.getDate() === filterDate.getDate() &&
             sessionDate.getMonth() === filterDate.getMonth() &&
             sessionDate.getFullYear() === filterDate.getFullYear();
    });
    
    setFilteredSessions(filtered);
  }, [filterDate, sessions]);
  
  const handleSessionChange = (event) => {
    setSelectedSession(event.target.value);
  };
  
  const handleReasonChange = (event) => {
    setReason(event.target.value);
  };
  
  const handleSubmit = async () => {
    if (!selectedSession) {
      setSnackbar({
        open: true,
        message: 'Vă rugăm selectați o ședință.',
        severity: 'warning',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Apelăm Cloud Function pentru a marca absența
      const markAbsenceFn = httpsCallable(getFunctions(), 'markUserAbsence');
      const result = await markAbsenceFn({
        userId: currentUser.uid,
        sessionId: selectedSession,
        reason: reason,
      });
      
      // Resetăm formul
      setSelectedSession('');
      setReason('');
      
      setSnackbar({
        open: true,
        message: 'Absența a fost înregistrată cu succes.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error marking absence:', error);
      setSnackbar({
        open: true,
        message: `Eroare la înregistrarea absenței: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Anunță Absență
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Utilizează acest formular pentru a anunța că nu poți participa la o ședință programată.
        Anunțarea din timp ne ajută să organizăm mai bine grupa și îți oferă posibilitatea de
        a recupera ședința la o dată ulterioară.
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ro}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Selectează data"
                value={filterDate}
                onChange={setFilterDate}
                disablePast
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="session-select-label">Ședință</InputLabel>
                <Select
                  labelId="session-select-label"
                  id="session-select"
                  value={selectedSession}
                  onChange={handleSessionChange}
                  label="Ședință"
                  disabled={loading || !filteredSessions.length}
                >
                  {filteredSessions.map((session) => (
                    <MenuItem key={session.id} value={session.id}>
                      {format(session.date, 'EEEE, d MMMM', { locale: ro })} - {session.startTime}-{session.endTime}
                    </MenuItem>
                  ))}
                  
                  {!filteredSessions.length && (
                    <MenuItem disabled value="">
                      Nu există ședințe pentru data selectată
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Motiv absență (opțional)"
                multiline
                rows={3}
                value={reason}
                onChange={handleReasonChange}
                fullWidth
                placeholder="Explică motivul pentru care nu poți participa la această ședință"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={loading || !selectedSession}
                  sx={{ minWidth: 150 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Anunță absență'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Box>
      
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

export default AbsenceMarker;