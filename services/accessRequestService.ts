import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

export type UserRole = "Admin" | "Curator" | "Student" | "Looker" | "Pending";

export interface PendingUserRequest {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  requested_role: "Student" | "Curator" | "Admin";
  reason?: string;
  status: "Pending" | "Approved" | "Rejected";
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleInfo {
  role: UserRole;
  can_edit: boolean;
  can_add: boolean;
  can_approve: boolean;
  isRestricted: boolean;
  pendingRequest: PendingUserRequest | null;
}

const STORAGE_PENDING_REQUESTS = "local_pending_user_requests";
const STORAGE_ROLE_PREFIX = "user_role_assigned_";
const STORAGE_USER_REQUEST_PREFIX = "user_pending_request_";

/**
 * Get current user role and active pending request info
 */
export async function getUserRoleAndAccessInfo(userId: string, email?: string): Promise<UserRoleInfo> {
  if (!userId) {
    return {
      role: "Looker",
      can_edit: false,
      can_add: false,
      can_approve: false,
      isRestricted: true,
      pendingRequest: null,
    };
  }

  let role: UserRole = "Looker";
  let can_edit = false;
  let can_add = false;
  let can_approve = false;
  let pendingRequest: PendingUserRequest | null = null;

  // 1. Check local storage role cache first for fast response
  try {
    const cachedRole = await AsyncStorage.getItem(`${STORAGE_ROLE_PREFIX}${userId}`);
    if (cachedRole) {
      const parsedRole = cachedRole as UserRole;
      role = parsedRole;
      can_edit = parsedRole === "Admin" || parsedRole === "Curator";
      can_add = parsedRole !== "Looker" && parsedRole !== "Pending";
      can_approve = parsedRole === "Admin" || parsedRole === "Curator";
    }
  } catch (e) {
    console.warn("Error reading cached role:", e);
  }

  // 2. Fetch latest role from Supabase user_roles
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, can_edit, can_add, can_approve")
        .eq("id", userId)
        .maybeSingle();

      if (data && data.role) {
        role = data.role as UserRole;
        can_edit = data.can_edit ?? (role === "Admin" || role === "Curator");
        can_add = data.can_add ?? (role !== "Looker" && role !== "Pending");
        can_approve = data.can_approve ?? (role === "Admin" || role === "Curator");
        await AsyncStorage.setItem(`${STORAGE_ROLE_PREFIX}${userId}`, role);
      }
    } catch (e) {
      console.warn("Error fetching role from supabase:", e);
    }
  }

  // 3. Check for any pending access request
  try {
    // Check local storage
    const cachedReq = await AsyncStorage.getItem(`${STORAGE_USER_REQUEST_PREFIX}${userId}`);
    if (cachedReq) {
      pendingRequest = JSON.parse(cachedReq);
    }
  } catch (e) {
    console.warn("Error reading cached pending request:", e);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pending_users")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        pendingRequest = {
          id: data.id,
          user_id: data.user_id,
          email: data.email,
          requested_role: data.requested_role || "Student",
          reason: data.reason || data.rejection_reason || "",
          status: data.status || "Pending",
          rejection_reason: data.rejection_reason,
          created_at: data.created_at,
          updated_at: data.updated_at || data.created_at,
        };
        await AsyncStorage.setItem(
          `${STORAGE_USER_REQUEST_PREFIX}${userId}`,
          JSON.stringify(pendingRequest)
        );
      }
    } catch (e) {
      console.warn("Error fetching pending request from supabase:", e);
    }
  }

  // If approved role is Student, Curator, or Admin, they are NOT restricted
  const isApprovedRole = role === "Admin" || role === "Curator" || role === "Student";
  const isRestricted = !isApprovedRole;

  return {
    role,
    can_edit,
    can_add,
    can_approve,
    isRestricted,
    pendingRequest,
  };
}

/**
 * Submit a new access request to Admin
 */
export async function submitAccessRequest(
  userId: string,
  email: string,
  requestedRole: "Student" | "Curator",
  reason?: string,
  fullName?: string
): Promise<{ success: boolean; request?: PendingUserRequest; error?: string }> {
  if (!userId || !email) {
    return { success: false, error: "Missing user identity" };
  }

  const newRequest: PendingUserRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    email: email.trim().toLowerCase(),
    full_name: fullName,
    requested_role: requestedRole,
    reason: reason?.trim() || "",
    status: "Pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Save to local AsyncStorage list
  try {
    const existingRaw = await AsyncStorage.getItem(STORAGE_PENDING_REQUESTS);
    let allRequests: PendingUserRequest[] = existingRaw ? JSON.parse(existingRaw) : [];
    // Remove any previous request from same user
    allRequests = allRequests.filter((r) => r.user_id !== userId);
    allRequests.unshift(newRequest);
    await AsyncStorage.setItem(STORAGE_PENDING_REQUESTS, JSON.stringify(allRequests));
    await AsyncStorage.setItem(
      `${STORAGE_USER_REQUEST_PREFIX}${userId}`,
      JSON.stringify(newRequest)
    );
  } catch (e) {
    console.warn("Error saving pending request locally:", e);
  }

  // 2. Insert into Supabase pending_users table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pending_users")
        .upsert(
          {
            user_id: userId,
            email: email.trim().toLowerCase(),
            requested_role: requestedRole,
            status: "Pending",
            created_at: newRequest.created_at,
            updated_at: newRequest.updated_at,
          },
          { onConflict: "user_id" }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Supabase pending_users insert warning:", error.message);
      } else if (data) {
        newRequest.id = data.id || newRequest.id;
        await AsyncStorage.setItem(
          `${STORAGE_USER_REQUEST_PREFIX}${userId}`,
          JSON.stringify(newRequest)
        );
      }
    } catch (e) {
      console.warn("Exception submitting access request to supabase:", e);
    }
  }

  return { success: true, request: newRequest };
}

/**
 * Get all pending user requests for Admin view
 */
export async function getAllPendingRequests(): Promise<PendingUserRequest[]> {
  let list: PendingUserRequest[] = [];

  // 1. Fetch from local AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PENDING_REQUESTS);
    if (raw) {
      const parsed: PendingUserRequest[] = JSON.parse(raw);
      list = parsed.filter((r) => r.status === "Pending");
    }
  } catch (e) {
    console.warn("Error reading local pending requests:", e);
  }

  // 2. Fetch from Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pending_users")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const supabaseList: PendingUserRequest[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          email: d.email,
          requested_role: d.requested_role || "Student",
          reason: d.reason || d.rejection_reason || "",
          status: d.status || "Pending",
          created_at: d.created_at,
          updated_at: d.updated_at || d.created_at,
        }));

        // Merge, prioritizing supabase entries by user_id
        const userMap = new Map<string, PendingUserRequest>();
        list.forEach((r) => userMap.set(r.user_id, r));
        supabaseList.forEach((r) => userMap.set(r.user_id, r));
        list = Array.from(userMap.values()).filter((r) => r.status === "Pending");
      }
    } catch (e) {
      console.warn("Error fetching pending requests from supabase:", e);
    }
  }

  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Approve access request and assign role to user
 */
export async function approveAccessRequest(
  pendingId: string,
  userId: string,
  email: string,
  assignedRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update local storage role
    await AsyncStorage.setItem(`${STORAGE_ROLE_PREFIX}${userId}`, assignedRole);

    // Update local pending requests list
    const raw = await AsyncStorage.getItem(STORAGE_PENDING_REQUESTS);
    if (raw) {
      const all: PendingUserRequest[] = JSON.parse(raw);
      const updated = all.map((item) =>
        item.user_id === userId || item.id === pendingId
          ? { ...item, status: "Approved" as const, updated_at: new Date().toISOString() }
          : item
      );
      await AsyncStorage.setItem(STORAGE_PENDING_REQUESTS, JSON.stringify(updated));
    }

    // Update individual request cache
    const userReqRaw = await AsyncStorage.getItem(`${STORAGE_USER_REQUEST_PREFIX}${userId}`);
    if (userReqRaw) {
      const parsed = JSON.parse(userReqRaw);
      parsed.status = "Approved";
      await AsyncStorage.setItem(`${STORAGE_USER_REQUEST_PREFIX}${userId}`, JSON.stringify(parsed));
    }

    // 2. Update Supabase
    if (supabase) {
      // Upsert into user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          {
            id: userId,
            email: email,
            role: assignedRole,
            can_edit: assignedRole === "Admin" || assignedRole === "Curator",
            can_add: assignedRole !== "Looker" && assignedRole !== "Pending",
            can_approve: assignedRole === "Admin" || assignedRole === "Curator",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (roleError) {
        console.warn("Error upserting user_roles in Supabase:", roleError);
      }

      // Update pending_users status to Approved
      await supabase
        .from("pending_users")
        .update({ status: "Approved", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error approving access request:", error);
    return { success: false, error: error.message || "Failed to approve user" };
  }
}

/**
 * Reject access request
 */
export async function rejectAccessRequest(
  pendingId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update local storage
    const raw = await AsyncStorage.getItem(STORAGE_PENDING_REQUESTS);
    if (raw) {
      const all: PendingUserRequest[] = JSON.parse(raw);
      const updated = all.map((item) =>
        item.user_id === userId || item.id === pendingId
          ? {
              ...item,
              status: "Rejected" as const,
              rejection_reason: reason || "Request denied by administrator",
              updated_at: new Date().toISOString(),
            }
          : item
      );
      await AsyncStorage.setItem(STORAGE_PENDING_REQUESTS, JSON.stringify(updated));
    }

    const userReqRaw = await AsyncStorage.getItem(`${STORAGE_USER_REQUEST_PREFIX}${userId}`);
    if (userReqRaw) {
      const parsed = JSON.parse(userReqRaw);
      parsed.status = "Rejected";
      parsed.rejection_reason = reason;
      await AsyncStorage.setItem(`${STORAGE_USER_REQUEST_PREFIX}${userId}`, JSON.stringify(parsed));
    }

    // 2. Update Supabase
    if (supabase) {
      await supabase
        .from("pending_users")
        .update({
          status: "Rejected",
          rejection_reason: reason || "Request denied by administrator",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting access request:", error);
    return { success: false, error: error.message || "Failed to reject user" };
  }
}
