import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  UserRole,
  PendingUserRequest,
  getAllPendingRequests,
  approveAccessRequest,
  rejectAccessRequest,
  getUserRoleAndAccessInfo,
} from "@/services/accessRequestService";

export default function PendingUsersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUserRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("Looker");
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: UserRole }>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadUserRole();
    loadPendingUsers();
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;
    try {
      const info = await getUserRoleAndAccessInfo(user.id, user.email);
      setUserRole(info.role);
    } catch (error) {
      console.error("Error loading user role in PendingUsersScreen:", error);
    }
  };

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true);
      const requests = await getAllPendingRequests();
      setPendingUsers(requests);

      // Initialize selected roles with requested roles (defaulting to Student if looker/unspecified)
      const initialRoles: { [key: string]: UserRole } = {};
      requests.forEach((req) => {
        initialRoles[req.id] =
          req.requested_role === "Curator"
            ? "Curator"
            : req.requested_role === "Admin"
            ? "Admin"
            : "Student";
      });
      setSelectedRole(initialRoles);
    } catch (error) {
      console.error("Error in loadPendingUsers:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (req: PendingUserRequest) => {
    const assignedRole = selectedRole[req.id] || req.requested_role || "Student";

    const doApprove = async () => {
      try {
        setActionLoadingId(req.id);
        const res = await approveAccessRequest(
          req.id,
          req.user_id,
          req.email,
          assignedRole
        );

        if (res.success) {
          if (Platform.OS === "web") {
            window.alert(`✅ User ${req.email} approved as "${assignedRole}"!`);
          } else {
            Alert.alert("Success", `User approved as ${assignedRole}`);
          }
          await loadPendingUsers();
        } else {
          Alert.alert("Error", res.error || "Failed to approve user");
        }
      } catch (error) {
        console.error("Error approving user:", error);
        Alert.alert("Error", "Failed to approve user");
      } finally {
        setActionLoadingId(null);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Approve ${req.email} and assign role "${assignedRole}"?`
      );
      if (confirmed) {
        await doApprove();
      }
    } else {
      Alert.alert(
        "Approve User",
        `Assign role "${assignedRole}" to ${req.email}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            style: "default",
            onPress: doApprove,
          },
        ]
      );
    }
  };

  const handleReject = async (req: PendingUserRequest) => {
    const doReject = async (reason?: string) => {
      try {
        setActionLoadingId(req.id);
        const res = await rejectAccessRequest(req.id, req.user_id, reason);
        if (res.success) {
          if (Platform.OS === "web") {
            window.alert(`User ${req.email} request rejected.`);
          } else {
            Alert.alert("Success", "User request rejected");
          }
          await loadPendingUsers();
        } else {
          Alert.alert("Error", res.error || "Failed to reject user");
        }
      } catch (error) {
        console.error("Error rejecting user:", error);
        Alert.alert("Error", "Failed to reject user");
      } finally {
        setActionLoadingId(null);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to reject the access request for ${req.email}?`
      );
      if (confirmed) {
        await doReject("Request not approved at this time");
      }
    } else {
      Alert.alert(
        "Reject Access Request",
        `Reject access request for ${req.email}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: () => doReject("Request not approved at this time"),
          },
        ]
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingUsers();
  };

  const isUserAdmin = userRole === "Admin" || userRole === "Curator";

  // Only Admins and Curators can access this management screen
  if (!isUserAdmin) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContainer}>
          <View style={[styles.lockIconCircle, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="shield" size={42} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={{ color: theme.text, marginTop: Spacing.lg, textAlign: "center" }}>
            Administrator Access Required
          </ThemedText>
          <ThemedText
            type="body"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginTop: Spacing.sm,
              lineHeight: 22,
              maxWidth: 320,
            }}
          >
            Only system administrators have permission to review access requests and assign gemstone database roles.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h2" style={{ color: theme.text }}>
            Pending User Requests
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {pendingUsers.length} {pendingUsers.length === 1 ? "user" : "users"} awaiting role approval
          </ThemedText>
        </View>
        <Pressable
          onPress={loadPendingUsers}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="rotate-cw" size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              Loading access requests...
            </ThemedText>
          </View>
        ) : pendingUsers.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={[styles.successIconCircle, { backgroundColor: theme.success + "15" }]}>
              <Feather name="check-circle" size={48} color={theme.success} />
            </View>
            <ThemedText type="h3" style={{ color: theme.text, marginTop: Spacing.lg, textAlign: "center" }}>
              All Caught Up!
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.sm,
                maxWidth: 320,
              }}
            >
              There are no pending role access requests. New signup requests will appear here immediately.
            </ThemedText>
          </View>
        ) : (
          pendingUsers.map((pendingUser) => {
            const isActing = actionLoadingId === pendingUser.id;
            const currentSelected = selectedRole[pendingUser.id] || pendingUser.requested_role || "Student";

            return (
              <View
                key={pendingUser.id}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* User Header */}
                <View style={styles.userHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.emailRow}>
                      <Feather name="mail" size={15} color={theme.primary} style={{ marginRight: 6 }} />
                      <ThemedText type="h4" style={{ color: theme.text, fontWeight: "700" }}>
                        {pendingUser.email}
                      </ThemedText>
                    </View>

                    {pendingUser.full_name && (
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        Name: {pendingUser.full_name}
                      </ThemedText>
                    )}

                    <View style={styles.metaRow}>
                      <View style={[styles.requestedBadge, { backgroundColor: theme.primary + "15" }]}>
                        <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                          Wants: {pendingUser.requested_role}
                        </ThemedText>
                      </View>

                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        {new Date(pendingUser.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: "#F59E0B20" }]}>
                    <ThemedText type="caption" style={{ color: "#F59E0B", fontWeight: "700" }}>
                      ⏳ Pending
                    </ThemedText>
                  </View>
                </View>

                {/* Reason / Note if provided */}
                {!!pendingUser.reason && (
                  <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                      User's Note:
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.text, marginTop: 2 }}>
                      "{pendingUser.reason}"
                    </ThemedText>
                  </View>
                )}

                {/* Role Selector */}
                <View style={styles.roleSelector}>
                  <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginBottom: Spacing.xs }}>
                    Assign Role to User:
                  </ThemedText>
                  <View style={styles.roleOptions}>
                    {(["Student", "Curator", "Admin"] as UserRole[]).map((role) => {
                      const isSelected = currentSelected === role;
                      return (
                        <Pressable
                          key={role}
                          onPress={() =>
                            setSelectedRole((prev) => ({
                              ...prev,
                              [pendingUser.id]: role,
                            }))
                          }
                          style={[
                            styles.roleOption,
                            {
                              backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: isSelected ? "#FFFFFF" : theme.text,
                              fontWeight: isSelected ? "700" : "500",
                            }}
                          >
                            {role === "Student" ? "🎓 Student" : role === "Curator" ? "🔬 Curator" : "👑 Admin"}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <Pressable
                    onPress={() => handleApprove(pendingUser)}
                    disabled={isActing}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.success, opacity: pressed || isActing ? 0.8 : 1 },
                    ]}
                  >
                    {isActing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={16} color="#FFFFFF" />
                        <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.xs, fontWeight: "700" }}>
                          Approve as {currentSelected}
                        </ThemedText>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleReject(pendingUser)}
                    disabled={isActing}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.rejectButton,
                      { backgroundColor: "#EF444420", borderColor: "#EF4444", opacity: pressed || isActing ? 0.8 : 1 },
                    ]}
                  >
                    <Feather name="x" size={16} color="#EF4444" />
                    <ThemedText type="small" style={{ color: "#EF4444", marginLeft: Spacing.xs, fontWeight: "600" }}>
                      Reject
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    minHeight: 300,
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  userCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: Spacing.sm,
  },
  requestedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  reasonBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
  },
  roleSelector: {
    marginTop: Spacing.sm,
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
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  rejectButton: {
    flex: 0.8,
    borderWidth: 1,
  },
});
