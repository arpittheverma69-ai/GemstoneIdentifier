import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { supabase } from "@/services/supabaseClient";

export type UserRole = "Admin" | "Curator" | "Student" | "Looker" | "Pending";

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  can_edit: boolean;
  can_add: boolean;
  can_approve: boolean;
}

const ROLE_OPTIONS: UserRole[] = ["Admin", "Curator", "Student", "Looker"];

export default function UserManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCurrentRole = useCallback(async () => {
    if (!user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to load current role", error);
      }

      if (data?.role) {
        setCurrentRole((data.role as UserRole) ?? "Looker");
      } else {
        // Auto-create Looker role if missing
        await supabase.from("user_roles").upsert({
          id: user.id,
          email: user.email || "",
          role: "Looker",
          can_edit: false,
          can_add: false,
          can_approve: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        setCurrentRole("Looker");
      }
    } catch (err) {
      console.error("Error loading current role", err);
      setCurrentRole("Looker");
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load users", error);
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRole();
    fetchUsers();
  }, [fetchCurrentRole, fetchUsers]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    const channel = client
      .channel("user-roles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        (payload) => {
          setUsers((prev) => {
            switch (payload.eventType) {
              case "INSERT":
                return [payload.new as UserProfile, ...prev];
              case "UPDATE":
                return prev.map((profile) =>
                  profile.id === (payload.new as UserProfile).id ? (payload.new as UserProfile) : profile
                );
              case "DELETE":
                return prev.filter((profile) => profile.id !== (payload.old as UserProfile).id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const getRolePermissions = (role: UserRole) => {
    switch (role) {
      case "Admin":
        return { can_edit: true, can_add: true, can_approve: true };
      case "Curator":
        return { can_edit: true, can_add: true, can_approve: true };
      case "Student":
        return { can_edit: false, can_add: true, can_approve: false };
      case "Looker":
      default:
        return { can_edit: false, can_add: false, can_approve: false };
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!supabase) {
      Alert.alert("Error", "Database connection not available");
      return;
    }
    if (currentRole !== "Admin") {
      Alert.alert("Error", "Only admins can update user roles");
      return;
    }

    try {
      setIsUpdating(true);
      const permissions = getRolePermissions(newRole);
      let updatedPermissions = permissions;

      // Try RPC first
      const { data, error } = await supabase.rpc("update_user_role", {
        target_user: userId,
        new_role: newRole,
      });

      if (error) {
        console.warn("RPC update_user_role failed, trying direct table update:", error);
        // Fallback: direct update on user_roles table
        const { error: directError } = await supabase
          .from("user_roles")
          .update({
            role: newRole,
            can_edit: permissions.can_edit,
            can_add: permissions.can_add,
            can_approve: permissions.can_approve,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (directError) {
          console.error("Direct update failed:", directError);
          Alert.alert("Error", directError.message || error.message || "Failed to update role");
          return;
        }
      } else if (data) {
        updatedPermissions =
          (data as { can_edit: boolean; can_add: boolean; can_approve: boolean } | null) ?? permissions;
      }

      setUsers((prev) =>
        prev.map((profile) =>
          profile.id === userId
            ? { ...profile, role: newRole, ...updatedPermissions }
            : profile
        )
      );

      // Ensure fresh data for consistency with other modifiers
      fetchUsers();
      Alert.alert("Success", `User role updated to ${newRole} successfully`);
    } catch (err: any) {
      console.error("Error updating role", err);
      Alert.alert("Error", err.message || "An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}> 
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Loading users...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!user || currentRole !== "Admin") {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}> 
        <View style={styles.centered}>
          <Feather name="lock" size={48} color={theme.textSecondary} />
          <ThemedText type="h4" style={{ color: theme.text, marginTop: Spacing.md }}>
            Access Denied
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            Only admins can manage users.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}> 
      <View style={styles.header}>
        <ThemedText type="h2" style={{ color: theme.text }}>
          User Management
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Manage roles and permissions for {users.length} users
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {users.map((profile) => (
          <View
            key={profile.id}
            style={[styles.userCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
          >
            <View style={styles.userHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  {profile.email || "Unknown"}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: getRoleColor(profile.role) + "20",
                    borderColor: getRoleColor(profile.role),
                  },
                ]}
              >
                <ThemedText type="caption" style={{ color: getRoleColor(profile.role), fontWeight: "600" }}>
                  {profile.role}
                </ThemedText>
              </View>
            </View>

            <View style={styles.roleSelector}>
              <ThemedText type="small" style={{ color: theme.text, marginBottom: Spacing.sm }}>
                Assign Role
              </ThemedText>
              <View style={styles.roleOptions}>
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = profile.role === role;
                  return (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                          borderColor: theme.border,
                          opacity: isUpdating ? 0.6 : 1,
                        },
                      ]}
                      disabled={isUpdating}
                      onPress={() => updateUserRole(profile.id, role)}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: isSelected ? "#FFFFFF" : theme.text, fontWeight: "600" }}
                      >
                        {role}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.permissionSummary}>
              <PermissionRow label="Can Edit Stones" value={profile.can_edit} theme={theme} />
              <PermissionRow label="Can Add Stones" value={profile.can_add} theme={theme} />
              <PermissionRow label="Can Approve Stones" value={profile.can_approve} theme={theme} />
            </View>
          </View>
        ))}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </ThemedView>
  );
}

const PermissionRow = ({ label, value, theme }: { label: string; value: boolean; theme: any }) => (
  <View style={styles.permissionRow}>
    <Feather
      name={value ? "check-circle" : "x-circle"}
      size={16}
      color={value ? theme.success : theme.textSecondary}
      style={{ marginRight: Spacing.xs }}
    />
    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
      {label}
    </ThemedText>
  </View>
);

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case "Admin":
      return "#6366F1";
    case "Curator":
      return "#0EA5E9";
    case "Student":
      return "#22C55E";
    case "Looker":
      return "#EF4444";
    default:
      return "#64748B";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  roleSelector: {
    marginBottom: Spacing.md,
  },
  roleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  roleOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  permissionSummary: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    paddingTop: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
