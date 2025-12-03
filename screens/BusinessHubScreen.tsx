import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Dropdown } from "@/components/Dropdown";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { GEMSTONE_DATABASE } from "@/constants/gemstoneData";

interface InventoryItem {
  id: string;
  stoneName: string;
  weight: number;
  grade: string;
  costPrice: number;
  sellingPrice: number;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastOrder: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: string[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  date: string;
}

const GRADES = ["AAA", "AA", "A", "B", "C"];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "1", stoneName: "Ruby", weight: 2.5, grade: "AAA", costPrice: 50000, sellingPrice: 85000, notes: "Burma origin, heated" },
  { id: "2", stoneName: "Sapphire", weight: 3.2, grade: "AA", costPrice: 35000, sellingPrice: 55000, notes: "Sri Lanka, untreated" },
  { id: "3", stoneName: "Emerald", weight: 1.8, grade: "A", costPrice: 28000, sellingPrice: 45000, notes: "Zambian, oiled" },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: "1", name: "Rajesh Jewellers", phone: "+91 98765 43210", email: "rajesh@jewellers.com", lastOrder: "2024-01-15" },
  { id: "2", name: "Gems Palace", phone: "+91 87654 32109", email: "info@gemspalace.com", lastOrder: "2024-01-10" },
];

const INITIAL_ORDERS: Order[] = [
  { id: "1", customerId: "1", customerName: "Rajesh Jewellers", items: ["Ruby 2.5ct"], total: 85000, status: "pending", date: "2024-01-15" },
  { id: "2", customerId: "2", customerName: "Gems Palace", items: ["Sapphire 3.2ct", "Emerald 1.8ct"], total: 100000, status: "completed", date: "2024-01-10" },
];

const DEALERS = [
  { city: "Mumbai", dealers: ["Zaveri Bazaar Gems", "Bharat Diamond Bourse", "Opera House Stones"] },
  { city: "Jaipur", dealers: ["Johari Bazaar Traders", "Pink City Gems", "Rajasthan Stones Co."] },
  { city: "Bangkok", dealers: ["Silom Gem Center", "Jewelry Trade Center", "Thai Gems Export"] },
  { city: "Chanthaburi", dealers: ["Thai Gem Market", "Chantha Sapphire", "Eastern Gems Hub"] },
];

export default function BusinessHubScreen() {
  const { theme } = useTheme();
  
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [customers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showDealers, setShowDealers] = useState(false);
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "completed" | "cancelled">("all");

  const [newItem, setNewItem] = useState({
    stoneName: "",
    weight: "",
    grade: "",
    costPrice: "",
    sellingPrice: "",
    notes: "",
  });

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.sellingPrice, 0);
  const pendingOrdersCount = orders.filter(o => o.status === "pending").length;
  const monthlyProfit = inventory.reduce((sum, item) => sum + (item.sellingPrice - item.costPrice), 0);

  const handleAddItem = () => {
    if (!newItem.stoneName || !newItem.weight || !newItem.costPrice) {
      return;
    }

    const cost = parseFloat(newItem.costPrice);
    const suggestedPrice = cost * 1.6;

    const item: InventoryItem = {
      id: Date.now().toString(),
      stoneName: newItem.stoneName,
      weight: parseFloat(newItem.weight),
      grade: newItem.grade || "A",
      costPrice: cost,
      sellingPrice: newItem.sellingPrice ? parseFloat(newItem.sellingPrice) : suggestedPrice,
      notes: newItem.notes,
    };

    setInventory([...inventory, item]);
    setNewItem({ stoneName: "", weight: "", grade: "", costPrice: "", sellingPrice: "", notes: "" });
    setShowAddInventory(false);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item from inventory?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => setInventory(inventory.filter(item => item.id !== id))
        },
      ]
    );
  };

  const filteredOrders = orders.filter(order => 
    orderFilter === "all" || order.status === orderFilter
  );

  return (
    <>
      <ScreenScrollView>
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="package" size={20} color={theme.primary} />
            <ThemedText type="h4" style={{ color: theme.primary }}>
              {totalInventoryValue.toLocaleString()}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Inventory Value
            </ThemedText>
          </Card>
          
          <Card style={[styles.statCard, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="clock" size={20} color={theme.warning} />
            <ThemedText type="h4" style={{ color: theme.warning }}>
              {pendingOrdersCount}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Pending Orders
            </ThemedText>
          </Card>
          
          <Card style={[styles.statCard, { backgroundColor: theme.success + "15" }]}>
            <Feather name="trending-up" size={20} color={theme.success} />
            <ThemedText type="h4" style={{ color: theme.success }}>
              {monthlyProfit.toLocaleString()}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Est. Profit
            </ThemedText>
          </Card>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Inventory</ThemedText>
          <Pressable
            onPress={() => setShowAddInventory(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <ThemedText type="small" style={{ color: "#FFFFFF" }}>Add</ThemedText>
          </Pressable>
        </View>

        {inventory.map(item => (
          <Card key={item.id} style={styles.inventoryCard}>
            <View style={styles.inventoryHeader}>
              <View style={styles.inventoryInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {item.stoneName}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {item.weight} ct | Grade: {item.grade}
                </ThemedText>
              </View>
              <View style={styles.inventoryPrices}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Cost: {item.costPrice.toLocaleString()}
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
                  {item.sellingPrice.toLocaleString()}
                </ThemedText>
              </View>
            </View>
            {item.notes ? (
              <ThemedText type="caption" style={[styles.notes, { color: theme.textSecondary }]}>
                {item.notes}
              </ThemedText>
            ) : null}
            <View style={styles.inventoryActions}>
              <Pressable
                onPress={() => handleDeleteItem(item.id)}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.danger + "20", opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Feather name="trash-2" size={16} color={theme.danger} />
              </Pressable>
            </View>
          </Card>
        ))}

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Recent Orders</ThemedText>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {(["all", "pending", "completed", "cancelled"] as const).map(filter => (
            <Pressable
              key={filter}
              onPress={() => setOrderFilter(filter)}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: orderFilter === filter 
                    ? theme.primary 
                    : theme.inputBackground 
                }
              ]}
            >
              <ThemedText 
                type="small"
                style={{ color: orderFilter === filter ? "#FFFFFF" : theme.text }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {filteredOrders.map(order => (
          <Card key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {order.customerName}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {order.date}
                </ThemedText>
              </View>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: order.status === "completed" 
                    ? theme.success + "20" 
                    : order.status === "pending" 
                      ? theme.warning + "20"
                      : theme.danger + "20"
                }
              ]}>
                <ThemedText 
                  type="caption"
                  style={{ 
                    color: order.status === "completed" 
                      ? theme.success 
                      : order.status === "pending" 
                        ? theme.warning
                        : theme.danger
                  }}
                >
                  {order.status}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {order.items.join(", ")}
            </ThemedText>
            <ThemedText type="body" style={[styles.orderTotal, { color: theme.success }]}>
              Total: {order.total.toLocaleString()}
            </ThemedText>
          </Card>
        ))}

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Customers</ThemedText>
        </View>

        {customers.map(customer => (
          <Card key={customer.id} style={styles.customerCard}>
            <View style={styles.customerInfo}>
              <View style={[styles.customerAvatar, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="user" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {customer.name}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {customer.phone}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Last: {customer.lastOrder}
              </ThemedText>
            </View>
          </Card>
        ))}

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Tools</ThemedText>
        </View>

        <View style={styles.toolsGrid}>
          <Pressable
            onPress={() => setShowDealers(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
          >
            <Card style={styles.toolCard}>
              <View style={[styles.toolIcon, { backgroundColor: theme.secondary + "20" }]}>
                <Feather name="map-pin" size={24} color={theme.secondary} />
              </View>
              <ThemedText type="small" style={{ textAlign: "center" }}>
                Dealer Directory
              </ThemedText>
            </Card>
          </Pressable>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}>
            <Card style={styles.toolCard}>
              <View style={[styles.toolIcon, { backgroundColor: theme.success + "20" }]}>
                <Feather name="message-circle" size={24} color={theme.success} />
              </View>
              <ThemedText type="small" style={{ textAlign: "center" }}>
                WhatsApp Templates
              </ThemedText>
            </Card>
          </Pressable>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}>
            <Card style={styles.toolCard}>
              <View style={[styles.toolIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="video" size={24} color={theme.primary} />
              </View>
              <ThemedText type="small" style={{ textAlign: "center" }}>
                Reel Scripts
              </ThemedText>
            </Card>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScreenScrollView>

      <Modal
        visible={showAddInventory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddInventory(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Add to Inventory</ThemedText>
            <Pressable
              onPress={() => setShowAddInventory(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Dropdown
              label="Stone Name"
              placeholder="Select gemstone"
              value={newItem.stoneName}
              options={GEMSTONE_DATABASE.map(g => g.variety)}
              onSelect={(val) => setNewItem({ ...newItem, stoneName: val })}
            />
            <View style={styles.formSpacer} />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Weight (ct)"
                  placeholder="2.5"
                  value={newItem.weight}
                  onChangeText={(val) => setNewItem({ ...newItem, weight: val })}
                  keyboardType="decimal-pad"
                  mono
                />
              </View>
              <View style={{ flex: 1 }}>
                <Dropdown
                  label="Grade"
                  placeholder="Select"
                  value={newItem.grade}
                  options={GRADES}
                  onSelect={(val) => setNewItem({ ...newItem, grade: val })}
                />
              </View>
            </View>
            <View style={styles.formSpacer} />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Cost Price"
                  placeholder="50000"
                  value={newItem.costPrice}
                  onChangeText={(val) => setNewItem({ ...newItem, costPrice: val })}
                  keyboardType="number-pad"
                  mono
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Selling Price"
                  placeholder="Auto: Cost x 1.6"
                  value={newItem.sellingPrice}
                  onChangeText={(val) => setNewItem({ ...newItem, sellingPrice: val })}
                  keyboardType="number-pad"
                  mono
                />
              </View>
            </View>
            <View style={styles.formSpacer} />

            <Input
              label="Notes"
              placeholder="Origin, treatment, etc."
              value={newItem.notes}
              onChangeText={(val) => setNewItem({ ...newItem, notes: val })}
              multiline
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button onPress={handleAddItem}>
              Add to Inventory
            </Button>
          </View>
        </ThemedView>
      </Modal>

      <Modal
        visible={showDealers}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDealers(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Dealer Directory</ThemedText>
            <Pressable
              onPress={() => setShowDealers(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {DEALERS.map(location => (
              <Card key={location.city} style={styles.dealerCard}>
                <Pressable
                  onPress={() => setExpandedDealer(
                    expandedDealer === location.city ? null : location.city
                  )}
                  style={styles.dealerHeader}
                >
                  <View style={styles.dealerTitleRow}>
                    <Feather name="map-pin" size={18} color={theme.primary} />
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {location.city}
                    </ThemedText>
                  </View>
                  <Feather 
                    name={expandedDealer === location.city ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </Pressable>
                {expandedDealer === location.city ? (
                  <View style={styles.dealerList}>
                    {location.dealers.map((dealer, idx) => (
                      <View key={idx} style={styles.dealerItem}>
                        <Feather name="briefcase" size={14} color={theme.textSecondary} />
                        <ThemedText type="small">{dealer}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  inventoryCard: {
    marginBottom: Spacing.sm,
  },
  inventoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryPrices: {
    alignItems: "flex-end",
  },
  notes: {
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  inventoryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterScroll: {
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  orderCard: {
    marginBottom: Spacing.sm,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  orderTotal: {
    marginTop: Spacing.sm,
    fontWeight: "600",
  },
  customerCard: {
    marginBottom: Spacing.sm,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  toolsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  toolCard: {
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSpacer: {
    height: Spacing["4xl"],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  formSpacer: {
    height: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  dealerCard: {
    marginBottom: Spacing.sm,
  },
  dealerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dealerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dealerList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.1)",
    gap: Spacing.sm,
  },
  dealerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
