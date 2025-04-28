import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';

// Theme
import theme from './theme';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/admin/Dashboard';
import UserProfile from './pages/user/Profile';
import WorkoutPlans from './pages/user/WorkoutPlans';
import NutritionPlans from './pages/user/NutritionPlans';
import Progress from './pages/user/Progress';
import Absences from './pages/user/Absences';

// Components
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';
import Layout from './components/common/Layout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <UserProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route element={<Layout />}>
                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <Dashboard />
                      </AdminRoute>
                    }
                  />
                  
                  {/* User Routes */}
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <UserProfile />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/workouts"
                    element={
                      <PrivateRoute>
                        <WorkoutPlans />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/nutrition"
                    element={
                      <PrivateRoute>
                        <NutritionPlans />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/progress"
                    element={
                      <PrivateRoute>
                        <Progress />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/absences"
                    element={
                      <PrivateRoute>
                        <Absences />
                      </PrivateRoute>
                    }
                  />
                </Route>
              </Routes>
            </Router>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 