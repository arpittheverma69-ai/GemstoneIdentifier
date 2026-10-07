import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { supabase } from "@/services/supabaseClient";
import { deleteUserAsAdmin, deleteUsersBatchAsAdmin } from "@/services/authService";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        await supabase.from("user_roles").upsert(
          {
            id: user.id,
            email: user.email || "",
            role: "Looker",
            can_edit: false,
            can_add: false,
            can_approve: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
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
    if (!client) return;

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
                  profile.id === (payload.new as UserProfile).id
                    ? (payload.new as UserProfile)
                    : profile
                );
              case "DELETE":
                return prev.filter(
                  (profile) => profile.id !== (payload.old as UserProfile).id
                );
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
          (data as { can_edit: boolean; can_add: boolean; can_approve: boolean } | null) ??
          permissions;
      }

      setUsers((prev) =>
        prev.map((profile) =>
          profile.id === userId
            ? { ...profile, role: newRole, ...updatedPermissions }
            : profile
        )
      );

      fetchUsers();
      if (Platform.OS === "web") {
        window.alert(`✅ User role updated to ${newRole} successfully`);
      } else {
        Alert.alert("Success", `User role updated to ${newRole} successfully`);
      }
    } catch (err: any) {
      console.error("Error updating role", err);
      Alert.alert("Error", err.message || "An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle selection for a user
  const toggleSelectUser = (id: string) => {
    if (id === user?.id) return; // Cannot select self for deletion
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select or Deselect All
  const handleToggleSelectAll = () => {
    const selectable = filteredUsers.filter((u) => u.id !== user?.id);
    if (selectedUserIds.size >= selectable.length && selectable.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectable.map((u) => u.id)));
    }
  };

  // Delete Single User
  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.id === user?.id) {
      Alert.alert("Action Blocked", "You cannot delete your own admin account.");
      return;
    }

    const executeDelete = async () => {
      try {
        setIsDeleting(true);
        const res = await deleteUserAsAdmin(targetUser.id);
        if (res.success) {
          setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
          setSelectedUserIds((prev) => {
            const next = new Set(prev);
            next.delete(targetUser.id);
            return next;
          });
          if (Platform.OS === "web") {
            window.alert(`✅ User "${targetUser.email}" deleted successfully.`);
          } else {
            Alert.alert("Deleted", `User "${targetUser.email}" deleted successfully.`);
          }
        } else {
          Alert.alert("Delete Failed", res.error || "Database error deleting user.");
        }
      } catch (err: any) {
        console.error("Error deleting user:", err);
        Alert.alert("Error", err.message || "Failed to delete user");
      } finally {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete user "${targetUser.email}"? All their history and permissions will be removed.`
      );
      if (confirmed) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        "Delete User",
        `Permanently delete "${targetUser.email}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ]
      );
    }
  };

  // Batch Delete Selected Users
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedUserIds);
    if (ids.length === 0) return;

    const executeBatchDelete = async () => {
      try {
        setIsDeleting(true);
        const res = await deleteUsersBatchAsAdmin(ids);
        if (res.success) {
          setUsers((prev) => prev.filter((u) => !selectedUserIds.has(u.id)));
          setSelectedUserIds(new Set());
          if (Platform.OS === "web") {
            window.alert(`✅ Successfully deleted ${ids.length} selected users.`);
          } else {
            Alert.alert("Success", `Successfully deleted ${ids.length} selected users.`);
          }
          fetchUsers();
        } else {
          Alert.alert("Batch Delete Failed", res.error || "Database error deleting users.");
        }
      } catch (err: any) {
        console.error("Error batch deleting users:", err);
        Alert.alert("Error", err.message || "Failed to delete selected users");
      } finally {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete ${ids.length} selected users?`
      );
      if (confirmed) {
        await executeBatchDelete();
      }
    } else {
      Alert.alert(
        "Delete Selected Users",
        `Permanently delete ${ids.length} selected users? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: `Delete (${ids.length})`, style: "destructive", onPress: executeBatchDelete },
        ]
      );
    }
  };

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

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
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
          >
            Only system administrators can manage and delete users.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const selectableUsers = filteredUsers.filter((u) => u.id !== user.id);
  const isAllSelected =
    selectableUsers.length > 0 && selectedUserIds.size >= selectableUsers.length;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h2" style={{ color: theme.text }}>
            User Management
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
            Manage roles, permissions, and accounts ({users.length} total)
          </ThemedText>
        </View>
        <Pressable
          onPress={fetchUsers}
          style={({ pressed }) => [
            styles.headerActionBtn,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="rotate-cw" size={16} color={theme.text} />
        </Pressable>
      </View>

      {/* Search and Selection Controls */}
      <View style={[styles.controlsBar, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={16} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
          <TextInput
            placeholder="Search users by email or role..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.selectionRow}>
          <Pressable
            onPress={handleToggleSelectAll}
            style={[
              styles.selectToggleBtn,
              { backgroundColor: isAllSelected ? theme.primary + "20" : theme.backgroundSecondary, borderColor: theme.border },
            ]}
          >
            <Feather
              name={isAllSelected ? "check-square" : "square"}
              size={15}
              color={isAllSelected ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <ThemedText
              type="caption"
              style={{ color: isAllSelected ? theme.primary : theme.text, fontWeight: "600" }}
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </ThemedText>
          </Pressable>

          {selectedUserIds.size > 0 && (
            <Pressable
              onPress={handleDeleteSelected}
              disabled={isDeleting}
              style={[
                styles.batchDeleteBtn,
                { backgroundColor: "#EF4444", opacity: isDeleting ? 0.6 : 1 },
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="trash-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    Delete Selected ({selectedUserIds.size})
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* User Cards ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={40} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No users found matching "{searchQuery}"
            </ThemedText>
          </View>
        ) : (
          filteredUsers.map((profile) => {
            const isSelf = profile.id === user.id;
            const isSelected = selectedUserIds.has(profile.id);

            return (
              <View
                key={profile.id}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                {/* Header Row: Checkbox, Email, Role, Trash */}
                <View style={styles.userHeader}>
                  {!isSelf ? (
                    <Pressable
                      onPress={() => toggleSelectUser(profile.id)}
                      style={styles.checkboxContainer}
                    >
                      <Feather
                        name={isSelected ? "check-square" : "square"}
                        size={20}
                        color={isSelected ? theme.primary : theme.textSecondary}
                      />
                    </Pressable>
                  ) : (
                    <View style={styles.selfBadge}>
                      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                        YOU
                      </ThemedText>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="h4" style={{ color: theme.text, fontWeight: "700" }}>
                      {profile.email || "No Email"}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "Recently"}
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
                    <ThemedText
                      type="caption"
                      style={{ color: getRoleColor(profile.role), fontWeight: "700" }}
                    >
                      {profile.role}
                    </ThemedText>
                  </View>

                  {!isSelf && (
                    <Pressable
                      onPress={() => handleDeleteUser(profile)}
                      disabled={isDeleting}
                      style={({ pressed }) => [
                        styles.deleteIconButton,
                        { opacity: pressed || isDeleting ? 0.6 : 1 },
                      ]}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </Pressable>
                  )}
                </View>

                {/* Role Assignment Selector */}
                <View style={styles.roleSelector}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
                    Assign Role:
                  </ThemedText>
                  <View style={styles.roleOptions}>
                    {ROLE_OPTIONS.map((role) => {
                      const isCurrentSelected = profile.role === role;
                      return (
                        <Pressable
                          key={role}
                          style={[
                            styles.roleOption,
                            {
                              backgroundColor: isCurrentSelected ? theme.primary : theme.backgroundSecondary,
                              borderColor: isCurrentSelected ? theme.primary : theme.border,
                              opacity: isUpdating ? 0.6 : 1,
                            },
                          ]}
                          disabled={isUpdating}
                          onPress={() => updateUserRole(profile.id, role)}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: isCurrentSelected ? "#FFFFFF" : theme.text,
                              fontWeight: isCurrentSelected ? "700" : "500",
                            }}
                          >
                            {role}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Permission Summary */}
                <View style={[styles.permissionSummary, { borderTopColor: theme.border }]}>
                  <PermissionRow label="Can Edit Stones" value={profile.can_edit} theme={theme} />
                  <PermissionRow label="Can Add Stones" value={profile.can_add} theme={theme} />
                  <PermissionRow label="Can Approve" value={profile.can_approve} theme={theme} />
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>
    </ThemedView>
  );
}

const PermissionRow = ({ label, value, theme }: { label: string; value: boolean; theme: any }) => (
  <View style={styles.permissionRow}>
    <Feather
      name={value ? "check-circle" : "x-circle"}
      size={14}
      color={value ? theme.success : theme.textSecondary}
      style={{ marginRight: 4 }}
    />
    <ThemedText type="caption" style={{ color: value ? theme.text : theme.textSecondary }}>
      {label}
    </ThemedText>
  </View>
);

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case "Admin":
      return "#DC2626";
    case "Curator":
      return "#7C3AED";
    case "Student":
      return "#2563EB";
    case "Looker":
      return "#64748B";
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
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  batchDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  userCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  checkboxContainer: {
    padding: 2,
    marginRight: 2,
  },
  selfBadge: {
    backgroundColor: "#8B5CF620",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  deleteIconButton: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#EF444415",
  },
  roleSelector: {
    marginBottom: Spacing.md,
  },
  roleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: 4,
  },
  roleOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  permissionSummary: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
