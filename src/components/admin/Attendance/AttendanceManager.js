import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { ro } from 'date-fns/locale';
import { format, isAfter, isBefore } from 'date-fns';
import { 
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon 
} from '@mui/icons-material';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Componenta pentru gestionarea prezențelor de către administrator
 */
const AttendanceManager = () => {
  const db = getFirestore();
  const functions = getFunctions();
  
  const [activeTab, setActiveTab] = useState(0);
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [absences, setAbsences] = useState([]);
  const [recoveryRequests, setRecoveryRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceEditMode, setAttendanceEditMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedRecoverySession, setSelectedRecoverySession] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Încărcăm grupele
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('active', '==', true));
        const querySnapshot = await getDocs(q);
        
        const groupsData = [];
        querySnapshot.forEach((doc) => {
          groupsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la încărcarea grupelor.',
          severity: 'error',
        });
      }
    };
    
    fetchGroups();
  }, [db]);
  
  // Încărcăm ședințele pentru grupa și data selectate
  useEffect(() => {
    const fetchSessions = async () => {
      if (!selectedGroup) return;
      
      setLoading(true);
      
      try {
        // Creăm range-ul pentru ziua selectată
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const sessionsRef = collection(db, 'sessions');
        const q = query(
          sessionsRef,
          where('groupId', '==', selectedGroup),
          where('date', '>=', startOfDay),
          where('date', '<=', endOfDay)
        );
        
        const querySnapshot = await getDocs(q);
        
        const sessionsData = [];
        querySnapshot.forEach((doc) => {
          sessionsData.push({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate()
          });
        });
        
        setSessions(sessionsData);
        
        // Dacă am găsit ședințe, obținem lista de prezență pentru prima
        if (sessionsData.length > 0) {
          await fetchAttendanceList(sessionsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la încărcarea ședințelor.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [db, selectedGroup, selectedDate]);
  
  // Încărcăm absențele care așteaptă programare de recuperare
  useEffect(() => {
    const fetchPendingAbsences = async () => {
      if (activeTab !== 1) return;
      
      setLoading(true);
      
      try {
        // Obținem toți utilizatorii cu absențe în status pending_recovery
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const absencesData = [];
        
        for (const userDoc of querySnapshot.docs) {
          const userData = userDoc.data();
          
          if (userData.group?.absences) {
            const pendingAbsences = userData.group.absences.filter(
              absence => absence.status === 'pending_recovery'
            );
            
            for (const absence of pendingAbsences) {
              // Obținem detalii despre ședințe
              const sessionRef = collection(db, 'sessions');
              const sessionDoc = await getDocs(query(sessionRef, where('__name__', '==', absence.sessionId)));
              
              let sessionData = null;
              if (!sessionDoc.empty) {
                sessionData = {
                  id: sessionDoc.docs[0].id,
                  ...sessionDoc.docs[0].data(),
                  date: sessionDoc.docs[0].data().date.toDate()
                };
              }
              
              // Obținem detalii despre grupă
              let groupData = null;
              if (sessionData) {
                const groupRef = collection(db, 'groups');
                const groupDoc = await getDocs(query(groupRef, where('__name__', '==', sessionData.groupId)));
                
                if (!groupDoc.empty) {
                  groupData = {
                    id: groupDoc.docs[0].id,
                    ...groupDoc.docs[0].data()
                  };
                }
              }
              
              absencesData.push({
                absenceId: absence.sessionId,
                date: absence.date.toDate(),
                reason: absence.reason,
                userId: userDoc.id,
                userName: userData.name || userData.email,
                userDetails: {
                  profile: userData.profile,
                  group: userData.group
                },
                sessionDetails: sessionData,
                groupDetails: groupData
              });
            }
          }
        }
        
        // Sortăm după dată
        absencesData.sort((a, b) => a.date - b.date);
        
        setAbsences(absencesData);
      } catch (error) {
        console.error('Error fetching pending absences:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la încărcarea absențelor în așteptare.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingAbsences();
  }, [db, activeTab]);
  
  // Funcție pentru obținerea listei de prezență
  const fetchAttendanceList = async (sessionId) => {
    setLoading(true);
    
    try {
      const generateAttendanceListFn = httpsCallable(functions, 'generateAttendanceList');
      const result = await generateAttendanceListFn({ sessionId });
      
      setAttendanceData(result.data);
    } catch (error) {
      console.error('Error fetching attendance list:', error);
      setSnackbar({
        open: true,
        message: 'Eroare la generarea listei de prezență.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handler pentru schimbare tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handler pentru schimbare grup
  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
  };
  
  // Funcție pentru marcarea prezenței
  const handleAttendanceChange = (userId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      attendanceList: {
        ...prev.attendanceList,
        [userId]: status
      }
    }));
  };
  
  // Salvează modificările la lista de prezență
  const saveAttendanceChanges = async () => {
    setLoading(true);
    
    try {
      const markAttendanceFn = httpsCallable(functions, 'markAttendance');
      await markAttendanceFn({
        sessionId: attendanceData.sessionId,
        attendanceData: attendanceData.attendanceList
      });
      
      setAttendanceEditMode(false);
      
      setSnackbar({
        open: true,
        message: 'Lista de prezență a fost actualizată cu succes.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving attendance list:', error);
      setSnackbar({
        open: true,
        message: 'Eroare la salvarea listei de prezență.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Deschide dialogul pentru programarea recuperării
  const handleOpenRecoveryDialog = async (absence) => {
    setSelectedAbsence(absence);
    setLoading(true);
    
    try {
      // Obținem ședințele disponibile pentru recuperare
      const checkAvailableRecoverySlotsFn = httpsCallable(functions, 'checkAvailableRecoverySlots');
      const result = await checkAvailableRecoverySlotsFn({ userId: absence.userId });
      
      const availableSessions = result.data.map(session => ({
        ...session,
        date: new Date(session.date)
      }));
      
      setAvailableSessions(availableSessions);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching available recovery slots:', error);
      setSnackbar({
        open: true,
        message: 'Eroare la obținerea ședințelor disponibile pentru recuperare.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Închide dialogul
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAbsence(null);
    setSelectedRecoverySession('');
  };
  
  // Programează recuperarea
  const handleScheduleRecovery = async () => {
    if (!selectedRecoverySession || !selectedAbsence) {
      setSnackbar({
        open: true,
        message: 'Vă rugăm selectați o ședință pentru recuperare.',
        severity: 'warning',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Apelăm Cloud Function pentru a programa recuperarea
      const scheduleRecoverySessionFn = httpsCallable(functions, 'scheduleRecoverySession');
      await scheduleRecoverySessionFn({
        userId: selectedAbsence.userId,
        originalSessionId: selectedAbsence.absenceId,
        recoverySessionId: selectedRecoverySession
      });
      
      // Actualizăm UI-ul
      handleCloseDialog();
      
      // Reîmprospătăm lista de absențe
      setAbsences(prevAbsences => 
        prevAbsences.filter(absence => 
          !(absence.userId === selectedAbsence.userId && 
            absence.absenceId === selectedAbsence.absenceId)
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Recuperarea a fost programată cu succes.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error scheduling recovery:', error);
      setSnackbar({
        open: true,
        message: `Eroare la programarea recuperării: ${error.message}`,
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
  
  // Renderează chip pentru status
  const renderStatusChip = (status) => {
    const statusConfig = {
      'present': { label: 'Prezent', color: 'success' },
      'absent': { label: 'Absent', color: 'error' },
      'late': { label: 'Întârziat', color: 'warning' },
      'recovering': { label: 'Recuperare', color: 'info' },
      'excused': { label: 'Motivat', color: 'secondary' },
    };
    
    const config = statusConfig[status] || { label: status, color: 'default' };
    
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small"
      />
    );
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Gestionare Prezențe și Recuperări
      </Typography>
      
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Liste Prezență" />
        <Tab label="Programare Recuperări" />
      </Tabs>
      
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="group-select-label">Grupă</InputLabel>
                <Select
                  labelId="group-select-label"
                  value={selectedGroup}
                  onChange={handleGroupChange}
                  label="Grupă"
                >
                  <MenuItem value="" disabled>Selectați grupa</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ro}>
                <DatePicker
                  label="Data"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            
            {sessions.length > 0 && (
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', height: '100%', alignItems: 'center' }}>
                  {attendanceEditMode ? (
                    <>
                      <Button 
                        variant="outlined" 
                        color="secondary"
                        onClick={() => setAttendanceEditMode(false)}
                        sx={{ mr: 1 }}
                      >
                        Anulează
                      </Button>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={saveAttendanceChanges}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Salvează'}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="contained" 
                      startIcon={<EditIcon />}
                      onClick={() => setAttendanceEditMode(true)}
                      disabled={loading || isBefore(new Date(), attendanceData?.date)}
                    >
                      Editează Prezență
                    </Button>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {sessions.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nume</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        {attendanceEditMode && <TableCell>Acțiuni</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.attendanceList && Object.entries(attendanceData.attendanceList).map(([userId, status]) => (
                        <TableRow key={userId}>
                          <TableCell>{/* Numele utilizatorului - ar trebui adăugat din context */}</TableCell>
                          <TableCell>{/* Email-ul utilizatorului */}</TableCell>
                          <TableCell>
                            {renderStatusChip(status)}
                          </TableCell>
                          {attendanceEditMode && (
                            <TableCell>
                              <IconButton 
                                color="success" 
                                onClick={() => handleAttendanceChange(userId, 'present')}
                              >
                                <CheckIcon />
                              </IconButton>
                              <IconButton 
                                color="error" 
                                onClick={() => handleAttendanceChange(userId, 'absent')}
                              >
                                <CloseIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  {selectedGroup 
                    ? 'Nu există ședințe programate pentru această grupă în data selectată.' 
                    : 'Selectați o grupă pentru a vedea ședințele.'}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {absences.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Utilizator</TableCell>
                        <TableCell>Data Absenței</TableCell>
                        <TableCell>Grupă</TableCell>
                        <TableCell>Motiv</TableCell>
                        <TableCell>Acțiuni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {absences.map((absence) => (
                        <TableRow key={`${absence.userId}-${absence.absenceId}`}>
                          <TableCell>{absence.userName}</TableCell>
                          <TableCell>
                            {absence.date ? format(absence.date, 'EEEE, d MMMM', { locale: ro }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {absence.groupDetails?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {absence.reason || 'Nemotivat'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="contained" 
                              size="small"
                              onClick={() => handleOpenRecoveryDialog(absence)}
                            >
                              Programează Recuperare
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  Nu există absențe care așteaptă recuperare.
                </Typography>
              )}
            </>
          )}
        </Box>
      )}
      
      {/* Dialog pentru programarea recuperării */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Programează Recuperare</DialogTitle>
        <DialogContent>
          {selectedAbsence && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                Utilizator: {selectedAbsence.userName}
              </Typography>
              <Typography variant="body2">
                Absență pentru: {format(selectedAbsence.date, 'EEEE, d MMMM', { locale: ro })}
              </Typography>
              {selectedAbsence.reason && (
                <Typography variant="body2">
                  Motiv: {selectedAbsence.reason}
                </Typography>
              )}
            </Box>
          )}
          
          <Typography variant="body2" paragraph>
            Selectați o ședință disponibilă pentru recuperare:
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="recovery-session-label">Ședință recuperare</InputLabel>
              <Select
                labelId="recovery-session-label"
                value={selectedRecoverySession}
                onChange={(e) => setSelectedRecoverySession(e.target.value)}
                label="Ședință recuperare"
              >
                <MenuItem value="" disabled>Selectați o ședință</MenuItem>
                
                {availableSessions.map((session) => (
                  <MenuItem key={session.id} value={session.id}>
                    {format(session.date, 'EEEE, d MMMM', { locale: ro })} - {session.startTime}-{session.endTime} | Grupa: {session.groupName} (Locuri: {session.availableSlots})
                  </MenuItem>
                ))}
                
                {availableSessions.length === 0 && (
                  <MenuItem disabled value="">
                    Nu există ședințe disponibile pentru recuperare
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Anulează</Button>
          <Button 
            onClick={handleScheduleRecovery} 
            variant="contained" 
            disabled={loading || !selectedRecoverySession}
          >
            {loading ? <CircularProgress size={24} /> : 'Programează'}
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

export default AttendanceManager;