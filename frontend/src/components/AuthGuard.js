import { Navigate } from 'react-router-dom';

export function AuthGuard({ children }) {
  const user = sessionStorage.getItem('gc_user');
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function useCurrentUser() {
  try {
    const raw = sessionStorage.getItem('gc_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function signOut(navigate) {
  sessionStorage.removeItem('gc_user');
  navigate('/login', { replace: true });
}
