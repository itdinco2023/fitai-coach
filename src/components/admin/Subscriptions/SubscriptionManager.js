import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Stack
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { ro } from 'date-fns/locale';
import { format, addMonths, isBefore, isAfter, differenceInDays } from 'date-fns';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  EuroSymbol as EuroSymbolIcon
} from '@mui/icons-material';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Componenta pentru gestionarea abonamentelor de către administrator
 */
const SubscriptionManager = () => {
  const db = getFirestore();
  const functions = getFunctions();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  
  const [subscriptionData, setSubscriptionData] = useState({
    type: '',
    startDate: new Date(),
    endDate: addMonths(new Date(), 1),
    price: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Încărcăm lista de utilizatori
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const usersData = [];
        
        querySnapshot.forEach((doc) => {
          usersData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setSnackbar({
          open: true,
          message: 'Eroare la încărcarea utilizatorilor.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [db]);
  
  // Filtrăm utilizatorii în funcție de căutare și filtre
  useEffect(() => {
    let result = [...users];
    
    // Filtrare după termen de căutare
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.name?.toLowerCase().includes(lowerSearchTerm) || 
        user.email?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Filtrare după tip abonament
    if (filterType !== 'all') {
      result = result.filter(user => 
        user.subscription?.type === filterType
      );
    }
    
    // Filtrare după status abonament
    if (filterStatus !== 'all') {
      result = result.filter(user => 
        user.subscription?.status === filterStatus
      );
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, filterType, filterStatus]);
  
  // Handler pentru căutare
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Handler pentru filtrare tip abonament
  const handleFilterTypeChange = (event) => {
    setFilterType(event.target.value);
  };
  
  // Handler pentru filtrare status abonament
  const handleFilterStatusChange = (event) => {
    setFilterStatus(event.target.value);
  };
  
  // Deschide dialogul de confirmare plată
  const handleOpenDialog = (user) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };
  
  // Închide dialogul de confirmare plată
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
  };
  
  // Deschide dialogul pentru editare/creare abonament
  const handleOpenSubscriptionDialog = (user) => {
    setSelectedUser(user);
    
    // Precompletăm cu datele existente dacă există
    if (user.subscription) {
      setSubscriptionData({
        type: user.subscription.type || '',
        startDate: user.subscription.startDate?.toDate() || new Date(),
        endDate: user.subscription.endDate?.toDate() || addMonths(new Date(), 1),
        price: ''
      });
    } else {
      // Resetăm la valori default
      setSubscriptionData({
        type: 'basic',
        startDate: new Date(),
        endDate: addMonths(new Date(), 1),
        price: ''
      });
    }
    
    setSubscriptionDialogOpen(true);
  };
  
  // Închide dialogul de abonament
  const handleCloseSubscriptionDialog = () => {
    setSubscriptionDialogOpen(false);
    setSelectedUser(null);
    setSubscriptionData({
      type: '',
      startDate: new Date(),
      endDate: addMonths(new Date(), 1),
      price: ''
    });
  };
  
  // Update câmpuri formular abonament
  const handleSubscriptionDataChange = (field, value) => {
    setSubscriptionData({
      ...subscriptionData,
      [field]: value
    });
    
    // Actualizăm automat data de sfârșit dacă se schimbă data de început
    if (field === 'startDate') {
      setSubscriptionData(prev => ({
        ...prev,
        endDate: addMonths(value, 1)
      }));
    }
  };
  
  // Procesează confirmarea plății
  const handleConfirmPayment = async (paid) => {
    if (!selectedUser) return;
    
    setLoading(true);
    
    try {
      const processSubscriptionRenewalFn = httpsCallable(functions, 'processSubscriptionRenewal');
      await processSubscriptionRenewalFn({
        userId: selectedUser.id,
        paid
      });
      
      // Actualizăm starea utilizatorilor
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === selectedUser.id) {
            return {
              ...user,
              subscription: {
                ...user.subscription,
                status: paid ? 'active' : 'pending_renewal'
              }
            };
          }
          return user;
        })
      );
      
      handleCloseDialog();
      
      setSnackbar({
        open: true,
        message: paid 
          ? 'Plata a fost confirmată cu succes.' 
          : 'Abonamentul a fost marcat ca neplătit.',
        severity: paid ? 'success' : 'warning',
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      setSnackbar({
        open: true,
        message: `Eroare la procesarea plății: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Salvează abonamentul
  const handleSaveSubscription = async () => {
    if (!selectedUser) return;
    
    // Validare
    if (!subscriptionData.type || !subscriptionData.startDate || !subscriptionData.endDate) {
      setSnackbar({
        open: true,
        message: 'Completați toate câmpurile obligatorii.',
        severity: 'warning',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const updateUserSubscriptionFn = httpsCallable(functions, 'updateUserSubscription');
      await updateUserSubscriptionFn({
        userId: selectedUser.id,
        subscriptionData
      });
      
      // Actualizăm starea utilizatorilor
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === selectedUser.id) {
            return {
              ...user,
              subscription: {
                ...user.subscription,
                type: subscriptionData.type,
                startDate: subscriptionData.startDate,
                endDate: subscriptionData.endDate,
                status: 'active'
              }
            };
          }
          return user;
        })
      );
      
      handleCloseSubscriptionDialog();
      
      setSnackbar({
        open: true,
        message: 'Abonamentul a fost actualizat cu succes.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving subscription:', error);
      setSnackbar({
        open: true,
        message: `Eroare la salvarea abonamentului: ${error.message}`,
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
  
  // Renderează chip pentru tipul abonamentului
  const renderSubscriptionTypeChip = (type) => {
    const typeConfig = {
      'basic': { label: 'Basic', color: 'default' },
      'fitness': { label: 'Fitness', color: 'primary' },
      'nutrition': { label: 'Nutriție', color: 'secondary' },
      'complete': { label: 'Complet', color: 'success' },
    };
    
    const config = typeConfig[type] || { label: type, color: 'default' };
    
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small"
      />
    );
  };
  
  // Renderează chip pentru statusul abonamentului
  const renderSubscriptionStatusChip = (status) => {
    const statusConfig = {
      'active': { label: 'Activ', color: 'success' },
      'expired': { label: 'Expirat', color: 'error' },
      'pending_renewal': { label: 'În așteptare', color: 'warning' },
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
        Gestionare Abonamente
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Caută utilizator"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Nume sau email"
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel id="filter-type-label">Tip Abonament</InputLabel>
            <Select
              labelId="filter-type-label"
              value={filterType}
              onChange={handleFilterTypeChange}
              label="Tip Abonament"
            >
              <MenuItem value="all">Toate</MenuItem>
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="fitness">Fitness</MenuItem>
              <MenuItem value="nutrition">Nutriție</MenuItem>
              <MenuItem value="complete">Complet</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel id="filter-status-label">Status</InputLabel>
            <Select
              labelId="filter-status-label"
              value={filterStatus}
              onChange={handleFilterStatusChange}
              label="Status"
            >
              <MenuItem value="all">Toate</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="expired">Expirate</MenuItem>
              <MenuItem value="pending_renewal">În așteptare</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Utilizator</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Tip Abonament</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expiră</TableCell>
                <TableCell>Acțiuni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => {
                // Calculăm zilele rămase până la expirare (dacă există abonament)
                let daysUntilExpiry = null;
                if (user.subscription?.endDate) {
                  const endDate = user.subscription.endDate.toDate();
                  daysUntilExpiry = differenceInDays(endDate, new Date());
                }
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.subscription?.type 
                        ? renderSubscriptionTypeChip(user.subscription.type) 
                        : 'Fără abonament'}
                    </TableCell>
                    <TableCell>
                      {user.subscription?.status 
                        ? renderSubscriptionStatusChip(user.subscription.status) 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {user.subscription?.endDate ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {format(user.subscription.endDate.toDate(), 'dd MMM yyyy', { locale: ro })}
                          
                          {/* Indicator vizual pentru abonamente care expiră curând */}
                          {daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
                            <Chip 
                              icon={<WarningIcon />} 
                              label={`${daysUntilExpiry} zile`} 
                              color="warning" 
                              size="small" 
                              sx={{ ml: 1 }}
                            />
                          )}
                          
                          {daysUntilExpiry < 0 && (
                            <Chip 
                              icon={<WarningIcon />} 
                              label="Expirat" 
                              color="error" 
                              size="small" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenSubscriptionDialog(user)}
                        >
                          {user.subscription ? 'Editează' : 'Adaugă'}
                        </Button>
                        
                        {user.subscription?.status === 'active' && 
                         user.subscription?.endDate &&
                         differenceInDays(user.subscription.endDate.toDate(), new Date()) <= 7 && (
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            startIcon={<EuroSymbolIcon />}
                            onClick={() => handleOpenDialog(user)}
                          >
                            Reînnoire
                          </Button>
                        )}
                        
                        {user.subscription?.status === 'pending_renewal' && (
                          <Button
                            variant="contained"
                            size="small"
                            color="warning"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleOpenDialog(user)}
                          >
                            Confirmă plata
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" sx={{ py: 2 }}>
                      Nu a fost găsit niciun utilizator care să corespundă criteriilor de filtrare.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Dialog confirmare plată */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {selectedUser?.subscription?.status === 'pending_renewal' 
            ? 'Confirmă plata abonamentului' 
            : 'Reînnoire abonament'}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {selectedUser.name || selectedUser.email}
              </Typography>
              
              {selectedUser.subscription && (
                <>
                  <Typography variant="body2">
                    Tip abonament: {selectedUser.subscription.type}
                  </Typography>
                  
                  {selectedUser.subscription.endDate && (
                    <Typography variant="body2">
                      Expiră la: {format(selectedUser.subscription.endDate.toDate(), 'dd MMMM yyyy', { locale: ro })}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}
          
          <Typography variant="body2">
            {selectedUser?.subscription?.status === 'pending_renewal' 
              ? 'Confirmați că utilizatorul a achitat abonamentul?' 
              : 'Doriți să reînnoiți abonamentul pentru încă o lună?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Anulează</Button>
          
          {selectedUser?.subscription?.status === 'pending_renewal' && (
            <Button 
              onClick={() => handleConfirmPayment(false)} 
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Marchează neplătit'}
            </Button>
          )}
          
          <Button 
            onClick={() => handleConfirmPayment(true)} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirmă plata'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog abonament */}
      <Dialog 
        open={subscriptionDialogOpen} 
        onClose={handleCloseSubscriptionDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedUser?.subscription 
            ? 'Editează abonament' 
            : 'Adaugă abonament nou'}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mb: 4, mt: 1 }}>
              <Typography variant="subtitle1">
                {selectedUser.name || selectedUser.email}
              </Typography>
            </Box>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="subscription-type-label">Tip Abonament</InputLabel>
                <Select
                  labelId="subscription-type-label"
                  value={subscriptionData.type}
                  onChange={(e) => handleSubscriptionDataChange('type', e.target.value)}
                  label="Tip Abonament"
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="fitness">Fitness</MenuItem>
                  <MenuItem value="nutrition">Nutriție</MenuItem>
                  <MenuItem value="complete">Complet</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ro}>
                <DatePicker
                  label="Data început"
                  value={subscriptionData.startDate}
                  onChange={(date) => handleSubscriptionDataChange('startDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ro}>
                <DatePicker
                  label="Data expirare"
                  value={subscriptionData.endDate}
                  onChange={(date) => handleSubscriptionDataChange('endDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDate={subscriptionData.startDate}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Preț (RON)"
                type="number"
                value={subscriptionData.price}
                onChange={(e) => handleSubscriptionDataChange('price', e.target.value)}
                fullWidth
                InputProps={{
                  endAdornment: <Typography variant="body2">RON</Typography>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubscriptionDialog}>Anulează</Button>
          <Button 
            onClick={handleSaveSubscription} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Salvează'}
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

export default SubscriptionManager;