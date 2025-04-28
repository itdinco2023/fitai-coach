import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../contexts/UserContext';

export default function AdminRoute({ children }) {
  const { currentUser } = useAuth();
  const { userData } = useUser();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!userData || userData.role !== 'admin') {
    return <Navigate to="/profile" />;
  }

  return children;
} 