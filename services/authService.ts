import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_taken"
  | "network_error"
  | "user_not_found"
  | "unknown";

interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  errorCode?: AuthErrorCode;
  needsVerification?: boolean;
}

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  email_confirmed_at?: string | null;
}

type ProfileRow = {
  full_name?: string | null;
  avatar_url?: string | null;
};

const isWebPlatform = typeof window !== "undefined" && typeof (window as any).document !== "undefined";

function mapSupabaseUserToAuthUser(user: User, profile?: ProfileRow | null): AuthUser {
  return {
    id: user.id,
    email: user.email ?? undefined,
    full_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined),
    avatar_url: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined),
    email_confirmed_at: user.email_confirmed_at,
  };
}

async function loadUserProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("Error loading user profile", error);
    }

    return profile ?? null;
  } catch (error) {
    console.warn("Error loading user profile", error);
    return null;
  }
}

// Get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) {
    return null;
  }

  try {
    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      const message = sessionError.message ?? "";
      if (message.includes("Refresh Token Not Found") || message.includes("Invalid Refresh Token")) {
        console.warn("Refresh token invalid or expired, user session cleared");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Error signing out:", signOutError);
        }
      }
      return null;
    }

    const sessionUser = sessionData.session?.user;
    if (!sessionUser) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    let activeUser: User | null = user;

    if (error) {
      const message = error.message ?? "";
      if (message.includes("Refresh Token Not Found") || message.includes("Invalid Refresh Token")) {
        console.warn("Refresh token invalid or expired, user session cleared");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Error signing out:", signOutError);
        }
        return null;
      }
      console.warn("Error retrieving current user, falling back to session user", error);
      activeUser = sessionUser;
    }

    if (!activeUser) {
      return null;
    }

    const profile = await loadUserProfile(activeUser.id);
    ensureUserRole(activeUser.id, activeUser.email).catch(console.warn);

    return mapSupabaseUserToAuthUser(activeUser, profile);
  } catch (error: any) {
    // Handle refresh token errors gracefully
    if (error?.message?.includes("Refresh Token Not Found") || error?.message?.includes("Invalid Refresh Token")) {
      console.warn("Refresh token invalid or expired, user session cleared");
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Error signing out:", signOutError);
      }
    } else {
      console.error("Error getting current user:", error);
    }
    return null;
  }
}

// Automatically ensure a user exists in the user_roles table with 'Looker' role
export async function ensureUserRole(userId: string, email?: string): Promise<void> {
  if (!supabase || !userId) return;

  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("Error checking user_roles:", error);
    }

    if (!data) {
      console.log(`Auto-assigning default 'Looker' role for user: ${userId} (${email})`);
      const { error: insertError } = await supabase
        .from("user_roles")
        .upsert(
          {
            id: userId,
            email: email || "",
            role: "Looker",
            can_edit: false,
            can_add: false,
            can_approve: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (insertError) {
        console.warn("Error auto-assigning Looker role in user_roles:", insertError);
      }
    }
  } catch (err) {
    console.warn("Exception in ensureUserRole:", err);
  }
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized", errorCode: "unknown" };
  }

  try {
    const redirectUrl =
      typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}`
        : "https://www.gemspy.in";

    const signUpPromise = supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectUrl}/`,
        data: {
          full_name: fullName,
        },
      },
    });

    const { data, error } = await withTimeout(signUpPromise, 10000); // 10 second timeout

    if (error) {
      const message = error.message || "Failed to create account";
      let errorCode: AuthErrorCode = "unknown";
      if (message.toLowerCase().includes("rate limit")) {
        errorCode = "unknown";
      } else if (message.toLowerCase().includes("password")) {
        errorCode = "unknown";
      } else if (message.toLowerCase().includes("registered")) {
        errorCode = "email_taken";
      }
      return { success: false, error: message, errorCode };
    }

    if (!data.user) {
      return { success: false, error: "Failed to create user", errorCode: "unknown" };
    }

    // Automatically ensure Looker role entry in user_roles
    await ensureUserRole(data.user.id, data.user.email);

    // Build AuthUser from Supabase response
    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
      email_confirmed_at: data.user.email_confirmed_at,
    };

    return {
      success: true,
      user: authUser,
      needsVerification: !data.user.email_confirmed_at,
    };
  } catch (error: any) {
    console.error("Sign up error:", error);
    let errorCode: AuthErrorCode = "unknown";
    const message = error?.message || "Unknown error";
    if (message.toLowerCase().includes("network") || message.toLowerCase().includes("fetch")) {
      errorCode = "network_error";
    }
    if (message.toLowerCase().includes("registered")) {
      errorCode = "email_taken";
    }
    return { success: false, error: message, errorCode };
  }
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Sign in with email and password
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized", errorCode: "unknown" };
  }

  try {
    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });

    const { data, error } = await withTimeout(signInPromise, 15000); // Increased timeout to 15 seconds

    if (error) {
      const message = error.message || "Unable to sign in";
      const lower = message.toLowerCase();
      if (lower.includes("invalid login credentials")) {
        return {
          success: false,
          error: "Incorrect email or password. Please try again.",
          errorCode: "invalid_credentials",
        };
      }
      if (lower.includes("email not confirmed")) {
        return {
          success: false,
          error: "Your email address has not been verified yet. Please check your inbox for a confirmation link.",
          errorCode: "email_not_confirmed",
        };
      }
      if (lower.includes("user not found")) {
        return {
          success: false,
          error: "No account found for that email address.",
          errorCode: "user_not_found",
        };
      }
      if (lower.includes("failed to fetch") || lower.includes("network")) {
        return {
          success: false,
          error: "Network connection error. Please check your internet connection and try again.",
          errorCode: "network_error",
        };
      }
      return { success: false, error: message, errorCode: "unknown" };
    }

    if (!data.user) {
      return { success: false, error: "Failed to sign in", errorCode: "unknown" };
    }

    // Automatically ensure Looker role entry in user_roles
    ensureUserRole(data.user.id, data.user.email).catch(console.warn);

    const fallbackUser = mapSupabaseUserToAuthUser(data.user);

    if (isWebPlatform) {
      return {
        success: true,
        user: fallbackUser,
      };
    }

    const currentUser = await getCurrentUser();
    return {
      success: true,
      user: currentUser ?? fallbackUser,
    };
  } catch (error: any) {
    console.error("Sign in error:", error);
    const message = error?.message || "Unknown error";
    const lower = message.toLowerCase();
    if (lower.includes("failed to fetch") || lower.includes("network")) {
      return {
        success: false,
        error: "Network connection error. Please check your internet connection and try again.",
        errorCode: "network_error",
      };
    }
    if (lower.includes("invalid login credentials")) {
      return {
        success: false,
        error: "Incorrect email or password. Please try again.",
        errorCode: "invalid_credentials",
      };
    }
    return { success: false, error: message, errorCode: "unknown" };
  }
}

// Sign out
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  console.log("authService.signOut called");
  if (!supabase) {
    console.log("Supabase client not initialized");
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    console.log("Calling supabase.auth.signOut()");
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      // Filter out expected 400 errors during token revocation
      const isExpectedError = error.status === 400 && 
        error.message?.includes('grant_type=password');
      
      if (!isExpectedError) {
        console.log("Sign out error:", error);
        return { success: false, error: error.message };
      } else {
        console.log("Sign out completed (expected token revocation error ignored)");
      }
    } else {
      console.log("Sign out successful");
    }
    
    return { success: true };
  } catch (error: any) {
    console.log("Sign out exception:", error);
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
    const redirectUrl =
      typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}`
        : "https://www.gemspy.in";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${redirectUrl}/`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Verify OTP code and reset password (for logged-out users)
export async function verifyRecoveryOtpAndSetPassword(
  email: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database client not initialized" };
  }

  if (!email || !email.trim()) {
    return { success: false, error: "Email address is required" };
  }
  if (!token || !token.trim()) {
    return { success: false, error: "Reset / verification code is required" };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long" };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "recovery",
    });

    if (error) {
      return { success: false, error: error.message || "Invalid or expired reset code" };
    }

    // After OTP verification, user session is in recovery mode, update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.trim(),
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to reset password" };
  }
}

// Update password for currently authenticated user
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database client not initialized" };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long" };
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update password" };
  }
}

// Change password with optional current password verification
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database client not initialized" };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long" };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: "You must be logged in to change your password" };
    }

    // If current password provided, verify it first
    if (currentPassword && currentPassword.trim()) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { success: false, error: "Current password is incorrect. Please check and try again." };
      }
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to change password" };
  }
}

// Delete user as Admin (calls RPC delete_user with resilient fallbacks)
export async function deleteUserAsAdmin(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database client not initialized" };
  }

  try {
    // 1. Try RPC delete_user function
    const { data, error } = await supabase.rpc("delete_user", {
      target_user_id: targetUserId,
    });

    if (!error) {
      if (typeof data === "object" && data !== null && "success" in data && !data.success) {
        return { success: false, error: data.error || "Failed to delete user" };
      }
      return { success: true };
    }

    console.warn("RPC delete_user failed, attempting fallback table cleanup:", error);

    // 2. Resilient Fallback: Clean up application tables
    await supabase.from("pending_users").delete().eq("user_id", targetUserId);
    await supabase.from("pending_gemstones").delete().eq("user_id", targetUserId);
    await supabase.from("identification_history").delete().eq("user_id", targetUserId);
    await supabase.from("inventory").delete().eq("user_id", targetUserId);
    await supabase.from("user_roles").delete().eq("id", targetUserId);
    await supabase.from("profiles").delete().eq("id", targetUserId);

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteUserAsAdmin:", error);
    return { success: false, error: error.message || "An unexpected error occurred deleting user" };
  }
}

// Batch delete users as Admin
export async function deleteUsersBatchAsAdmin(
  targetUserIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database client not initialized" };
  }

  if (!targetUserIds || targetUserIds.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    // 1. Try RPC delete_users_batch function
    const { data, error } = await supabase.rpc("delete_users_batch", {
      target_user_ids: targetUserIds,
    });

    if (!error) {
      if (typeof data === "object" && data !== null && "success" in data && !data.success) {
        return { success: false, error: data.error || "Failed to delete users" };
      }
      return { success: true, count: targetUserIds.length };
    }

    console.warn("RPC delete_users_batch failed, falling back to sequential delete:", error);

    // 2. Sequential deletion fallback
    let deletedCount = 0;
    for (const id of targetUserIds) {
      const res = await deleteUserAsAdmin(id);
      if (res.success) {
        deletedCount++;
      }
    }

    return { success: true, count: deletedCount };
  } catch (error: any) {
    console.error("Error in deleteUsersBatchAsAdmin:", error);
    return { success: false, error: error.message || "Failed to batch delete users" };
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
  callback: (user: AuthUser | null, event?: string) => void
) {
  if (!supabase) {
    return { data: { subscription: null }, error: null };
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      ensureUserRole(session.user.id, session.user.email).catch(console.warn);

      if (isWebPlatform) {
        callback(mapSupabaseUserToAuthUser(session.user), event);
        return;
      }

      const user = await getCurrentUser();
      callback(user ?? mapSupabaseUserToAuthUser(session.user), event);
    } else {
      callback(null, event);
    }
  });

  return { data: { subscription }, error: null };
}


