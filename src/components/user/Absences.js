import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../contexts/UserContext';
import AbsenceMarker from '../../components/user/Absences/AbsenceMarker';
import RecoverySessions from '../../components/user/Absences/RecoverySessions';

/**
 * Pagina pentru gestionarea absențelor și recuperărilor
 */
const Absences = () => {
  const { currentUser } = useAuth();
  const { userData } = useUser();
  const [activeTab, setActiveTab] = useState(0);
  const [canAccessFeature, setCanAccessFeature] = useState(false);
  
  useEffect(() => {
    // Verificăm dacă utilizatorul are acces la funcționalitatea de absențe și recuperări
    if (userData) {
      const subscriptionType = userData.subscription?.type;
      setCanAccessFeature(['fitness', 'complete'].includes(subscriptionType));
    }
  }, [userData]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Gestionare Absențe și Recuperări
      </Typography>
      
      {!canAccessFeature ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Această funcționalitate este disponibilă doar pentru abonamentele de tip Fitness și Complete. 
          Contactați recepția pentru upgrade-ul abonamentului.
        </Alert>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
            >
              <Tab label="Anunță Absență" />
              <Tab label="Recuperări" />
            </Tabs>
          </Box>
          
          {activeTab === 0 && <AbsenceMarker />}
          {activeTab === 1 && <RecoverySessions />}
        </>
      )}
    </Container>
  );
};

export default Absences;