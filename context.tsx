import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, update, push, get } from 'firebase/database';
import { db, DB_PATHS } from './firebase';
import { 
  Order, 
  InventoryItem, 
  ServiceItem, 
  WorkflowDefinition, 
  ServiceType,
  TechnicalLog
} from './types';
import { MOCK_WORKFLOWS, SERVICE_CATALOG } from './constants';

interface AppContextType {
  orders: Order[];
  inventory: InventoryItem[];
  addOrder: (newOrder: Order) => void;
  updateOrderItemStatus: (orderId: string, itemId: string, newStatus: string, user: string, note?: string) => void;
  updateInventory: (items: InventoryItem[]) => void;
  addTechnicianNote: (orderId: string, itemId: string, content: string, user: string) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. Lắng nghe dữ liệu thực từ Firebase (Realtime) ---
  useEffect(() => {
    setIsLoading(true);

    // Lắng nghe Đơn hàng (don_hang)
    const ordersRef = ref(db, DB_PATHS.ORDERS);
    const unsubOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Object to Array & Sort by Date desc
        const list: Order[] = Object.values(data);
        setOrders(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setOrders([]);
      }
    });

    // Lắng nghe Kho (kho_vat_tu)
    const inventoryRef = ref(db, DB_PATHS.INVENTORY);
    const unsubInventory = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: InventoryItem[] = Object.values(data);
        setInventory(list);
      } else {
        setInventory([]);
      }
    });

    setIsLoading(false);

    // Cleanup listeners
    return () => {
      unsubOrders();
      unsubInventory();
    };
  }, []);

  // --- 2. Thêm Đơn Hàng & Trừ Kho ---
  const addOrder = async (newOrder: Order) => {
    // Lưu đơn hàng vào Firebase với Key là ID của đơn
    await set(ref(db, `${DB_PATHS.ORDERS}/${newOrder.id}`), newOrder);

    // Tính toán trừ kho
    const currentInventory = [...inventory];
    let inventoryUpdated = false;

    newOrder.items.forEach(item => {
      if (!item.isProduct && item.serviceId) {
        const serviceDef = SERVICE_CATALOG.find(s => s.id === item.serviceId);
        if (serviceDef) {
          const workflow = MOCK_WORKFLOWS.find(w => w.id === serviceDef.workflowId);
          if (workflow && workflow.materials) {
            workflow.materials.forEach(mat => {
              const invItem = currentInventory.find(i => i.id === mat.inventoryItemId);
              if (invItem) {
                const deductAmount = mat.quantity * item.quantity;
                invItem.quantity = Math.max(0, invItem.quantity - deductAmount);
                
                // Cập nhật trực tiếp item trong kho lên Firebase
                update(ref(db, `${DB_PATHS.INVENTORY}/${invItem.id}`), {
                  quantity: invItem.quantity
                });
                inventoryUpdated = true;
              }
            });
          }
        }
      }
    });
  };

  // --- 3. Cập nhật Trạng thái Quy trình ---
  const updateOrderItemStatus = async (orderId: string, itemId: string, newStatus: string, user: string, note?: string) => {
    // 1. Lấy dữ liệu đơn hàng hiện tại để tìm index của item
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const itemIndex = order.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = order.items[itemIndex];
    const now = Date.now();
    
    // Xử lý lịch sử (History)
    const currentHistory = item.history || [];
    let newHistory = [...currentHistory];
    
    // Đóng stage cũ
    if (newHistory.length > 0) {
      const lastEntryIndex = newHistory.length - 1;
      const lastEntry = newHistory[lastEntryIndex];
      if (!lastEntry.leftAt) {
         newHistory[lastEntryIndex] = {
           ...lastEntry,
           leftAt: now,
           duration: now - lastEntry.enteredAt
         };
      }
    }

    // Mở stage mới
    newHistory.push({
      stageId: newStatus,
      stageName: newStatus,
      enteredAt: now,
      performedBy: user
    });

    // Xử lý Log (Ghi chú)
    let newLog = item.technicalLog ? [...item.technicalLog] : [];
    if (note) {
       newLog.push({
         id: Date.now().toString(),
         content: note,
         author: user,
         timestamp: new Date().toLocaleString('vi-VN'),
         stage: newStatus
       });
    }

    // Cập nhật lên Firebase (chỉ cập nhật các trường thay đổi của item cụ thể)
    const updates: any = {};
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/status`] = newStatus;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/history`] = newHistory;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/lastUpdated`] = now;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/technicalLog`] = newLog;

    // Nếu tất cả item đều xong -> Cập nhật trạng thái đơn hàng (Optional logic)
    // Ở đây ta chỉ cập nhật item
    
    await update(ref(db), updates);
  };

  // --- 4. Thêm Ghi chú kỹ thuật ---
  const addTechnicianNote = async (orderId: string, itemId: string, content: string, user: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const itemIndex = order.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = order.items[itemIndex];
    const newLog: TechnicalLog = {
      id: Date.now().toString(),
      content: content,
      author: user,
      timestamp: new Date().toLocaleString('vi-VN'),
      stage: item.status
    };

    const currentLogs = item.technicalLog || [];
    const updatedLogs = [newLog, ...currentLogs];

    // Update Firebase
    await update(ref(db, `${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}`), {
      technicalLog: updatedLogs
    });
  };

  const updateInventory = async (items: InventoryItem[]) => {
    // Cập nhật toàn bộ hoặc từng item, ở đây demo cập nhật item đầu tiên thay đổi
    // Trong thực tế nên update từng cái
    const updates: any = {};
    items.forEach(item => {
      updates[`${DB_PATHS.INVENTORY}/${item.id}`] = item;
    });
    await update(ref(db), updates);
  };

  return (
    <AppContext.Provider value={{ orders, inventory, addOrder, updateOrderItemStatus, updateInventory, addTechnicianNote, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};