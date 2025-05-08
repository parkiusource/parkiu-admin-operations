export interface User {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export interface AuthContextType extends AuthState {
  loginWithRedirect: (options?: any) => Promise<void>;
  logout: () => void;
}
