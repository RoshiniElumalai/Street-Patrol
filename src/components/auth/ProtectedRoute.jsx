import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../../context/useStore';

/**
 * ProtectedRoute — Blocks access to routes that require authentication and/or a specific role.
 * Redirects unauthenticated users to /auth-home.
 * Redirects users with wrong role to their own dashboard.
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser } = useStore();

  // Not logged in — redirect to auth landing
  if (!currentUser) {
    return <Navigate to="/auth-home" replace />;
  }

  // Role check — if a specific role is required and user doesn't match
  if (requiredRole && currentUser.role !== requiredRole) {
    // Redirect to their correct dashboard based on their actual role
    const roleRedirects = {
      citizen: '/citizen/home',
      police: '/police/home',
      admin: '/admin/home',
    };
    return <Navigate to={roleRedirects[currentUser.role] || '/auth-home'} replace />;
  }

  return children;
};

export default ProtectedRoute;
