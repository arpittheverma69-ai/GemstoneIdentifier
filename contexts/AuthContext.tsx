import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser, getCurrentUser, onAuthStateChange } from "@/services/authService";
import { signOut as signOutService } from "@/services/authService";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      console.log("Attempting to sign out...");
      await signOutService();
      console.log("Sign out service completed, clearing user state");
      setUser(null);
      console.log("User state cleared");
    } catch (error) {
      console.error("Error signing out:", error);
      // Still clear user state even if service fails
      setUser(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    if (typeof window !== "undefined") {
      (window as any).__setDevUser = (u: any) => {
        setUser(u);
      };
    }

    const clearLoaderTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Check initial auth state with timeout
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking auth state:", error);
        if (isMounted) {
          setLoading(false);
        }
      } finally {
        clearLoaderTimeout();
      }
    };

    // Set timeout to prevent infinite loading (10 seconds)
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth check timeout - proceeding without user");
        setLoading(false);
      }
    }, 10000);

    checkUser();

    // Listen to auth state changes
    try {
      const { data } = onAuthStateChange((user) => {
        if (isMounted) {
          clearLoaderTimeout();
          setUser(user);
          setLoading(false);
        }
      });

      return () => {
        isMounted = false;
        clearLoaderTimeout();
        if (data?.subscription) {
          data.subscription.unsubscribe();
        }
      };
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      if (isMounted) {
        setLoading(false);
      }
      return () => {
        isMounted = false;
        clearLoaderTimeout();
      };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}





