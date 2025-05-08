import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserContext } from './userContextDefinition';

/**
 * Proveedor del contexto de usuario
 * Maneja el estado del usuario y la autenticación
 */
export const UserProvider = ({ children }) => {
  const { isAuthenticated, user: auth0User, isLoading } = useAuth();
  const [user, setUser] = useState({
    name: '',
    location: null,
  });

  const updateUser = (newUserInfo) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...newUserInfo,
      location: {
        ...prevUser.location,
        ...newUserInfo.location,
      },
    }));
  };

  const value = useMemo(
    () => ({
      user,
      updateUser,
      isAuthenticated,
      isLoading,
      auth0User
    }),
    [user, isAuthenticated, isLoading, auth0User]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
