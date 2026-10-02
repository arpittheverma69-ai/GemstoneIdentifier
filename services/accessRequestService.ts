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
 * Get current user role and active pending request info strictly from DB/cache
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

  // 1. Check local storage role cache
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
          full_name: data.full_name,
          requested_role: (data.requested_role as any) || "Student",
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
      // pending_users table error
    }
  }

  // If role is already Approved (Student, Curator, Admin), user is NOT restricted
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

  const cleanEmail = email.trim().toLowerCase();
  const newRequest: PendingUserRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    email: cleanEmail,
    full_name: fullName,
    requested_role: requestedRole,
    reason: reason?.trim() || "",
    status: "Pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Save to local AsyncStorage
  try {
    const existingRaw = await AsyncStorage.getItem(STORAGE_PENDING_REQUESTS);
    let allRequests: PendingUserRequest[] = existingRaw ? JSON.parse(existingRaw) : [];
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

  // 2. Update Supabase
  if (supabase) {
    // 2A. Update user_roles table to 'Pending'
    try {
      await supabase.from("user_roles").upsert(
        {
          id: userId,
          email: cleanEmail,
          role: "Pending",
          can_edit: false,
          can_add: false,
          can_approve: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("Error updating user_roles on request submission:", e);
    }

    // 2B. Insert into pending_users table
    try {
      await supabase.from("pending_users").delete().eq("user_id", userId);
    } catch (_) {}

    try {
      const { data: insertedData, error: insertErr } = await supabase
        .from("pending_users")
        .insert({
          user_id: userId,
          email: cleanEmail,
          full_name: fullName || null,
          requested_role: requestedRole,
          reason: reason?.trim() || null,
          status: "Pending",
          created_at: newRequest.created_at,
          updated_at: newRequest.updated_at,
        })
        .select()
        .maybeSingle();

      if (insertedData?.id) {
        newRequest.id = insertedData.id;
        await AsyncStorage.setItem(
          `${STORAGE_USER_REQUEST_PREFIX}${userId}`,
          JSON.stringify(newRequest)
        );
      }
      if (insertErr) {
        console.warn("Supabase pending_users insert warning:", insertErr.message);
      }
    } catch (e) {
      console.warn("Exception inserting into pending_users table in Supabase:", e);
    }
  }

  return { success: true, request: newRequest };
}

/**
 * Get all pending user requests for Admin view
 */
export async function getAllPendingRequests(): Promise<PendingUserRequest[]> {
  const userMap = new Map<string, PendingUserRequest>();

  // 1. Fetch from Supabase pending_users table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pending_users")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        data.forEach((d: any) => {
          userMap.set(d.user_id, {
            id: d.id,
            user_id: d.user_id,
            email: d.email,
            full_name: d.full_name,
            requested_role: (d.requested_role as any) || "Student",
            reason: d.reason || d.rejection_reason || "",
            status: "Pending",
            created_at: d.created_at,
            updated_at: d.updated_at || d.created_at,
          });
        });
      }
    } catch (e) {
      console.warn("Error fetching pending requests from supabase pending_users:", e);
    }
  }

  // 2. Fetch from Supabase user_roles (find any Pending users)
  if (supabase) {
    try {
      const { data: roleUsers, error: roleError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "Pending")
        .order("created_at", { ascending: false });

      if (roleUsers && roleUsers.length > 0) {
        roleUsers.forEach((u: any) => {
          if (!userMap.has(u.id)) {
            userMap.set(u.id, {
              id: `role_${u.id}`,
              user_id: u.id,
              email: u.email || "No email",
              requested_role: "Student",
              reason: "Access requested",
              status: "Pending",
              created_at: u.created_at || new Date().toISOString(),
              updated_at: u.updated_at || new Date().toISOString(),
            });
          }
        });
      }
    } catch (e) {
      console.warn("Error fetching pending users from user_roles:", e);
    }
  }

  // 3. Merge local storage pending requests
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PENDING_REQUESTS);
    if (raw) {
      const parsed: PendingUserRequest[] = JSON.parse(raw);
      parsed
        .filter((r) => r.status === "Pending")
        .forEach((r) => {
          if (!userMap.has(r.user_id)) {
            userMap.set(r.user_id, r);
          }
        });
    }
  } catch (e) {
    console.warn("Error reading local pending requests:", e);
  }

  const result = Array.from(userMap.values());
  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      // Direct upsert into user_roles
      try {
        const canEdit = assignedRole === "Admin" || assignedRole === "Curator";
        const canAdd = assignedRole !== "Looker" && assignedRole !== "Pending";
        const canApprove = assignedRole === "Admin" || assignedRole === "Curator";

        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert(
            {
              id: userId,
              email: email,
              role: assignedRole,
              can_edit: canEdit,
              can_add: canAdd,
              can_approve: canApprove,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (roleError) {
          console.warn("Error upserting user_roles in Supabase:", roleError);
        }
      } catch (e) {
        console.warn("Exception updating user_roles:", e);
      }

      // Update pending_users status to Approved
      try {
        await supabase
          .from("pending_users")
          .update({ status: "Approved", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      } catch (_) {}
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
      try {
        await supabase
          .from("pending_users")
          .update({
            status: "Rejected",
            rejection_reason: reason || "Request denied by administrator",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } catch (_) {}

      try {
        await supabase
          .from("user_roles")
          .update({
            role: "Looker",
            can_edit: false,
            can_add: false,
            can_approve: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      } catch (_) {}
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting access request:", error);
    return { success: false, error: error.message || "Failed to reject user" };
  }
}


