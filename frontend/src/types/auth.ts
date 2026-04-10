export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'viewer';
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
