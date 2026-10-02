import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { supabase } from "@/services/supabaseClient";

interface PendingStone {
  id: string;
  user_id: string;
  "Title": string;
  "Common Name": string;
  "Species": string;
  "Transparency": string;
  "Dispersion": string;
  "Refractive Index": string;
  "Optic Character": string;
  "Polariscope Reaction": string;
  "Fluorescence": string;
  "Pleochroism": string;
  "Hardness": string;
  "Specific Gravity": string;
  "Toughness": string;
  "Inclusions": string;
  "Luster": string;
  "Stability": string;
  "Chemical Name": string;
  "Chemical Formula": string;
  "Crystal System": string;
  "Colors": string[];
  "Occurences": string[];
  "Category": string;
  "Tag": string;
  images: any;
  status: "Pending" | "Approved" | "Rejected";
  rejection_reason?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export default function PendingStonesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [pendingStones, setPendingStones] = useState<PendingStone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<"Admin" | "Curator" | "Student" | "Looker">("Looker");
  const [selectedStone, setSelectedStone] = useState<PendingStone | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [currentStoneId, setCurrentStoneId] = useState<string | null>(null);

  useEffect(() => {
    loadUserRole();
    loadPendingStones();
  }, []);

  const loadUserRole = async () => {
    const client = supabase;
    if (!user || !client) return;

    try {
      const { data: roleData } = await client
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(roleData?.role || "Looker");
    } catch (error) {
      console.error("Error loading user role:", error);
    }
  };

  const loadPendingStones = async () => {
    const client = supabase;
    if (!client) return;

    try {
      setIsLoading(true);
      const { data, error } = await client
        .from("pending_gemstones")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading pending stones:", error);
        return;
      }

      const transformedData = (data || []).map((stone: any) => ({
        ...stone,
        user_name: stone.user_name || "Unknown",
        user_email: stone.user_email || "unknown@example.com",
      }));

      setPendingStones(transformedData);
    } catch (error) {
      console.error("Error in loadPendingStones:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (stoneId: string) => {
    console.log("Approving stone:", stoneId);
    setCurrentStoneId(stoneId);
    setShowApproveConfirm(true);
  };

  const confirmApprove = async () => {
    if (!currentStoneId) return;

    try {
      const client = supabase;
      if (!client) {
        console.error("Supabase client not available");
        setShowApproveConfirm(false);
        return;
      }

      // Get the pending stone data
      const { data: pendingStone, error: fetchError } = await client
        .from("pending_gemstones")
        .select("*")
        .eq("id", currentStoneId)
        .single();

      if (fetchError || !pendingStone) {
        console.error("Fetch error:", fetchError);
        setShowApproveConfirm(false);
        return;
      }

      console.log("Fetched pending stone:", pendingStone);

      // Add to total_gemstones table
      const insertData: any = {
        user_id: pendingStone.user_id,
        "Title": pendingStone["Title"],
        "Common Name": pendingStone["Common Name"],
        "Species": pendingStone["Species"],
        "Transparency": pendingStone["Transparency"],
        "Dispersion": pendingStone["Dispersion"],
        "Refractive Index": pendingStone["Refractive Index"],
        "Optic Character": pendingStone["Optic Character"],
        "Polariscope Reaction": pendingStone["Polariscope Reaction"],
        "Fluorescence": pendingStone["Fluorescence"],
        "Pleochroism": pendingStone["Pleochroism"],
        "Hardness": pendingStone["Hardness"],
        "Specific Gravity": pendingStone["Specific Gravity"],
        "Toughness": pendingStone["Toughness"],
        "Inclusions": pendingStone["Inclusions"],
        "Luster": pendingStone["Luster"],
        "Stability": pendingStone["Stability"],
        "Chemical Name": pendingStone["Chemical Name"],
        "Chemical Formula": pendingStone["Chemical Formula"],
        "Crystal System": pendingStone["Crystal System"],
        "Colors": pendingStone["Colors"],
        "Occurences": pendingStone["Occurences"],
        "Tag": pendingStone["Tag"],
        images: pendingStone.images,
      };

      const { error: insertError } = await client
        .from("total_gemstones")
        .insert(insertData);

      if (insertError) {
        console.error("Insert error:", insertError);
        setShowApproveConfirm(false);
        return;
      }

      console.log("Successfully inserted to total_gemstones");

      // Remove stone from pending list after successful insert
      const { error: deleteError } = await client
        .from("pending_gemstones")
        .delete()
        .eq("id", currentStoneId);

      if (deleteError) {
        console.error("Delete error while removing approved stone:", deleteError);
        setShowApproveConfirm(false);
        return;
      }

      console.log("Removed stone from pending list");
      setPendingStones((prev) => prev.filter((stone) => stone.id === currentStoneId ? false : true));
      setShowApproveConfirm(false);
      setShowDetailModal(false);
      Alert.alert("Success", "Stone approved and added to database!");
      loadPendingStones();
    } catch (error) {
      console.error("Error approving stone:", error);
      setShowApproveConfirm(false);
    }
  };

  const handleReject = async (stoneId: string) => {
    console.log("Rejecting stone:", stoneId);
    setCurrentStoneId(stoneId);
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    if (!currentStoneId) return;

    try {
      const client = supabase;
      if (!client) {
        console.error("Supabase client not available");
        setShowRejectConfirm(false);
        return;
      }

      const { error } = await client
        .from("pending_gemstones")
        .delete()
        .eq("id", currentStoneId);

      if (error) {
        console.error("Rejection error:", error);
        setShowRejectConfirm(false);
        return;
      }

      console.log("Successfully rejected stone and removed from pending list");
      setPendingStones((prev) => prev.filter((stone) => stone.id === currentStoneId ? false : true));
      setShowRejectConfirm(false);
      setShowDetailModal(false);
      Alert.alert("Success", "Stone rejected successfully");
      loadPendingStones();
    } catch (error) {
      console.error("Error rejecting stone:", error);
      setShowRejectConfirm(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingStones();
  };

  if (userRole !== "Admin" && userRole !== "Curator") {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContainer}>
          <ThemedText type="h2" style={{ color: theme.text }}>
            Access Denied
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Only Admins and Curators can view pending stones.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.header}>
        <ThemedText type="h2" style={{ color: theme.text }}>
          Pending Stones
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {pendingStones.length} stones awaiting approval
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {pendingStones.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No pending stones
            </ThemedText>
          </View>
        ) : (
          pendingStones.map((stone) => (
            <Pressable
              key={stone.id}
              style={[styles.stoneCard, { borderColor: theme.border }]}
              onPress={() => {
                setSelectedStone(stone);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardContent}>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  {stone["Title"]}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {stone["Common Name"]}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                  Submitted by: {stone.user_name}
                </ThemedText>
              </View>

              <View style={styles.actionButtons}>
                <Pressable
                  onPress={() => handleApprove(stone.id)}
                  style={[styles.actionButton, { backgroundColor: theme.success }]}
                >
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
                    Approve
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleReject(stone.id)}
                  style={[styles.actionButton, { backgroundColor: "#EF4444" }]}
                >
                  <Feather name="x" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
                    Reject
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      {selectedStone && (
        <Modal
          visible={showDetailModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <ThemedView style={[styles.modalContainer, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Pressable
                style={styles.backButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Feather name="chevron-left" size={24} color={theme.text} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <ThemedText type="h3" style={{ color: theme.text }}>
                  {selectedStone["Title"]}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {selectedStone["Common Name"]}
                </ThemedText>
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.section}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Basic Information
                </ThemedText>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Species
                    </ThemedText>
                    <ThemedText type="body">{selectedStone["Species"]}</ThemedText>
                  </View>
                  <View style={styles.infoItem}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Transparency
                    </ThemedText>
                    <ThemedText type="body">{selectedStone["Transparency"]}</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Optical Properties
                </ThemedText>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Refractive Index
                    </ThemedText>
                    <ThemedText type="body">{selectedStone["Refractive Index"]}</ThemedText>
                  </View>
                  <View style={styles.infoItem}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Hardness
                    </ThemedText>
                    <ThemedText type="body">{selectedStone["Hardness"]}</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Submission Information
                </ThemedText>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Submitted by
                    </ThemedText>
                    <ThemedText type="body">{selectedStone.user_name}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {selectedStone.user_email}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.modalActions, { borderTopColor: theme.border }]}>
              <Pressable
                onPress={() => handleApprove(selectedStone.id)}
                style={[styles.modalButton, { backgroundColor: theme.success }]}
              >
                <Feather name="check" size={16} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
                  Approve
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleReject(selectedStone.id)}
                style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
              >
                <Feather name="x" size={16} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
                  Reject
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </Modal>
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        visible={showApproveConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowApproveConfirm(false)}
      >
        <View style={[styles.confirmOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.confirmModal, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={styles.confirmTitle}>
              Approve Stone?
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.text, textAlign: "center", marginTop: Spacing.md }}>
              This stone will be added to the main gemstone database.
            </ThemedText>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowApproveConfirm(false)}
              >
                <ThemedText type="body" style={{ color: theme.text }}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: theme.success }]}
                onPress={confirmApprove}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                  Approve
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal
        visible={showRejectConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectConfirm(false)}
      >
        <View style={[styles.confirmOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.confirmModal, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={styles.confirmTitle}>
              Reject Stone?
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.text, textAlign: "center", marginTop: Spacing.md }}>
              This stone will be marked as rejected.
            </ThemedText>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowRejectConfirm(false)}
              >
                <ThemedText type="body" style={{ color: theme.text }}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: "#EF4444" }]}
                onPress={confirmReject}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                  Reject
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: Spacing.lg,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  scrollView: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  stoneCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  infoGrid: {
    gap: Spacing.md,
  },
  infoItem: {
    gap: Spacing.xs,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModal: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    width: "80%",
    maxWidth: 300,
  },
  confirmTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
});
