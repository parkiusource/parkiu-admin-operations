import { createContext } from 'react';

/**
 * Contexto para manejar el estado del usuario
 * @type {React.Context}
 */
export const UserContext = createContext({
  user: {
    name: '',
    location: null,
  },
  updateUser: () => {},
  isAuthenticated: false,
  isLoading: true,
  auth0User: null,
});
