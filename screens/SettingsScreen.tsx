import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import {
  UserRole,
  getUserRoleAndAccessInfo,
  getAllPendingRequests,
  PendingUserRequest,
  isKnownAdminEmail,
} from "@/services/accessRequestService";

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
  can_edit: boolean;
  can_add: boolean;
  can_approve: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    text: "#0F172A",
    textSecondary: "#64748B",
    primary: "#8B5CF6",
    secondary: "#F59E0B",
    success: "#10B981",
    backgroundRoot: "#F8FAFC",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F1F5F9",
    border: "#E2E8F0",
    inputBackground: "#FFFFFF",
  };
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingUserRequest | null>(null);
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileAndAccess();
  }, [user]);

  const loadProfileAndAccess = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const accessInfo = await getUserRoleAndAccessInfo(user.id, user.email);
      const isAdmin = accessInfo.role === "Admin" || isKnownAdminEmail(user.email);

      setUserProfile({
        id: user.id,
        email: user.email || "",
        role: isAdmin ? "Admin" : accessInfo.role,
        can_edit: isAdmin || accessInfo.can_edit,
        can_add: isAdmin || accessInfo.can_add,
        can_approve: isAdmin || accessInfo.can_approve,
      });

      setPendingRequest(accessInfo.pendingRequest);

      // If user is Admin, check how many pending requests exist
      if (isAdmin) {
        const pendingList = await getAllPendingRequests();
        setPendingUsersCount(pendingList.length);
      }
    } catch (error) {
      console.error("Error in loadProfileAndAccess:", error);
      const isAdmin = isKnownAdminEmail(user.email);
      setUserProfile({
        id: user.id,
        email: user.email || "",
        role: isAdmin ? "Admin" : "Looker",
        can_edit: isAdmin,
        can_add: isAdmin,
        can_approve: isAdmin,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) {
        try {
          await signOut();
        } catch (error) {
          console.error("Sign out error:", error);
          alert("An error occurred while signing out");
        }
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "An error occurred while signing out");
            }
          },
        },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ThemedText type="h4" style={{ color: theme.text }}>
          Please log in to access settings
        </ThemedText>
      </View>
    );
  }

  const isRestricted =
    userProfile?.role === "Looker" || userProfile?.role === "Pending";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2" style={{ color: theme.text }}>
            Settings & Profile
          </ThemedText>
        </View>

        {/* Access Status Banner for Looker / Pending Users */}
        {isRestricted && (
          <View
            style={[
              styles.accessBanner,
              {
                backgroundColor: pendingRequest?.status === "Pending" ? "#F59E0B18" : "#8B5CF618",
                borderColor: pendingRequest?.status === "Pending" ? "#F59E0B" : theme.primary,
              },
            ]}
          >
            <Feather
              name={pendingRequest?.status === "Pending" ? "clock" : "shield"}
              size={22}
              color={pendingRequest?.status === "Pending" ? "#F59E0B" : theme.primary}
              style={{ marginRight: Spacing.sm, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <ThemedText
                type="body"
                style={{
                  color: theme.text,
                  fontWeight: "700",
                }}
              >
                {pendingRequest?.status === "Pending"
                  ? "Access Request In Review"
                  : "Preview Mode Active"}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: 2, lineHeight: 18 }}
              >
                {pendingRequest?.status === "Pending"
                  ? `Your request to become a ${pendingRequest.requested_role} is currently awaiting administrator review.`
                  : "Send an access request from the Gems tab to unlock complete gemstone properties and full testing features."}
              </ThemedText>

              <Pressable
                onPress={loadProfileAndAccess}
                style={[
                  styles.refreshStatusBtn,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
              >
                <Feather name="rotate-cw" size={13} color={theme.text} style={{ marginRight: 4 }} />
                <ThemedText type="caption" style={{ color: theme.text, fontWeight: "600" }}>
                  Check Status
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* User Profile Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.md }}>
            Account Profile
          </ThemedText>

          <View style={styles.profileItem}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Email
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.text, marginTop: Spacing.xs }}>
                {userProfile?.email}
              </ThemedText>
            </View>
          </View>

          <View
            style={[
              styles.profileItem,
              { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Assigned Role
              </ThemedText>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: getRoleColor(userProfile?.role || "Looker") + "20",
                    borderColor: getRoleColor(userProfile?.role || "Looker"),
                  },
                ]}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: getRoleColor(userProfile?.role || "Looker"),
                    fontWeight: "700",
                  }}
                >
                  {userProfile?.role === "Student"
                    ? "🎓 Student"
                    : userProfile?.role === "Curator"
                    ? "🔬 Curator"
                    : userProfile?.role === "Admin"
                    ? "👑 Admin"
                    : "👀 Looker (Preview)"}
                </ThemedText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.profileItem,
              { borderTopWidth: 1, borderTopColor: theme.border },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Feature Permissions
            </ThemedText>
            <View style={{ marginTop: Spacing.sm }}>
              <PermissionRow
                icon="eye"
                label="Full Database Access"
                value={!isRestricted}
              />
              <PermissionRow
                icon="plus-circle"
                label="Can Add Custom Gemstones"
                value={userProfile?.can_add || false}
              />
              <PermissionRow
                icon="edit-3"
                label="Can Edit Master Gemstones"
                value={userProfile?.can_edit || false}
              />
              <PermissionRow
                icon="check-circle"
                label="Can Approve Users & Stones"
                value={userProfile?.can_approve || false}
              />
            </View>
          </View>
        </View>

        {/* User Management (Admin Only) */}
        {userProfile?.role === "Admin" && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Pressable
              onPress={() => {
                (navigation as any)?.navigate("UserManagement");
              }}
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  User Management (All Users)
                </ThemedText>
              </View>
              <Feather name="users" size={20} color={theme.primary} />
            </Pressable>
            <View style={{ marginTop: Spacing.sm }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Change roles (Admin, Curator, Student, Looker) and manage permissions for all registered users.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Pending Users Management (Admin Only) */}
        {userProfile?.role === "Admin" && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Pressable
              onPress={() => {
                (navigation as any)?.navigate("PendingUsers");
              }}
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  Pending User Requests
                </ThemedText>
                {pendingUsersCount > 0 && (
                  <View style={styles.pendingBadgeCount}>
                    <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                      {pendingUsersCount} new
                    </ThemedText>
                  </View>
                )}
              </View>
              <Feather name="user-plus" size={20} color={theme.primary} />
            </Pressable>
            <View style={{ marginTop: Spacing.sm }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Review newly registered users and assign Student, Curator, or Admin roles.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Pending Stones (Admin & Curator) */}
        {(userProfile?.role === "Admin" || userProfile?.role === "Curator") && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Pressable
              onPress={() => {
                (navigation as any)?.navigate("PendingStones");
              }}
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="h4" style={{ color: theme.text }}>
                Pending Gemstone Submissions
              </ThemedText>
              <Feather name="clock" size={20} color={theme.primary} />
            </Pressable>
            <View style={{ marginTop: Spacing.sm }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Review and approve custom stones submitted by students.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Role Explanations */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.md }}>
            System Roles Overview
          </ThemedText>

          <RoleCard
            role="Admin"
            description="Full access to all gemstone properties, user management, and approval rights."
            theme={theme}
          />
          <RoleCard
            role="Curator"
            description="Full database access, can edit verified properties and approve submissions."
            theme={theme}
          />
          <RoleCard
            role="Student"
            description="Full database viewing, optical test workflows, and can submit custom stones."
            theme={theme}
          />
          <RoleCard
            role="Looker"
            description="Restricted preview mode. Requires admin approval to unlock database."
            theme={theme}
          />
        </View>

        {/* App Info */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View style={styles.infoItem}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              App Version
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.text }}>
              2.0.0
            </ThemedText>
          </View>

          <View
            style={[
              styles.infoItem,
              { borderTopWidth: 1, borderTopColor: theme.border },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Database Sync
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.text }}>
              Supabase Connected
            </ThemedText>
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          style={[
            styles.signOutButton,
            { backgroundColor: theme.primary + "15", borderColor: theme.primary },
          ]}
        >
          <Feather name="log-out" size={18} color={theme.primary} />
          <ThemedText
            type="body"
            style={{ color: theme.primary, marginLeft: Spacing.sm, fontWeight: "700" }}
          >
            Sign Out
          </ThemedText>
        </Pressable>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const PermissionRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: boolean;
}) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    text: "#0F172A",
    textSecondary: "#64748B",
    success: "#10B981",
    border: "#E2E8F0",
  };
  return (
    <View style={[styles.permissionRow, { borderBottomColor: theme.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <Feather
          name={icon as any}
          size={16}
          color={value ? theme.success : theme.textSecondary}
        />
        <ThemedText type="small" style={{ color: theme.text, marginLeft: Spacing.sm }}>
          {label}
        </ThemedText>
      </View>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: value ? theme.success + "20" : theme.textSecondary + "20",
          },
        ]}
      >
        <ThemedText
          type="caption"
          style={{
            color: value ? theme.success : theme.textSecondary,
            fontWeight: "700",
          }}
        >
          {value ? "✓ Granted" : "✗ Restricted"}
        </ThemedText>
      </View>
    </View>
  );
};

const RoleCard = ({
  role,
  description,
  theme: propTheme,
}: {
  role: UserRole;
  description: string;
  theme: any;
}) => {
  const theme = propTheme || {
    text: "#0F172A",
    textSecondary: "#64748B",
  };
  const roleColor = getRoleColor(role);
  return (
    <View
      style={[
        styles.roleCard,
        {
          backgroundColor: roleColor + "10",
          borderColor: roleColor,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
      <View style={{ flex: 1 }}>
        <ThemedText type="body" style={{ color: theme.text, fontWeight: "700" }}>
          {role}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
};

const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case "Admin":
      return "#DC2626";
    case "Curator":
      return "#7C3AED";
    case "Student":
      return "#2563EB";
    case "Looker":
      return "#6B7280";
    case "Pending":
      return "#F59E0B";
    default:
      return "#6B7280";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  accessBanner: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  refreshStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  pendingBadgeCount: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  profileItem: {
    paddingVertical: Spacing.md,
  },
  roleBadge: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    alignSelf: "flex-start",
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  badge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  roleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  signOutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
});
