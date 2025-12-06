import { supabase } from "./supabaseClient";

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

// Get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) {
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Failed to create user" };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Sign in with email and password
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Failed to sign in" };
    }

    const user = await getCurrentUser();
    return { success: true, user: user || undefined };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Sign out
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Reset password
export async function resetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "gemaipro://reset-password",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Update user profile
export async function updateProfile(
  updates: { full_name?: string; avatar_url?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Listen to auth state changes
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  if (!supabase) {
    return { data: { subscription: null }, error: null };
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });

  return { data: { subscription }, error: null };
}

