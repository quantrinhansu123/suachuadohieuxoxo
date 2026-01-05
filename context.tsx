import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, update, push, get, remove } from 'firebase/database';
import { db, DB_PATHS } from './firebase';
import {
  Order,
  InventoryItem,
  ServiceItem,
  WorkflowDefinition,
  ServiceType,
  TechnicalLog,
  Member,
  Product,
  Customer
} from './types';
import { MOCK_WORKFLOWS, SERVICE_CATALOG } from './constants';

interface AppContextType {
  orders: Order[];
  inventory: InventoryItem[];
  members: Member[];
  products: Product[];
  customers: Customer[];
  addOrder: (newOrder: Order) => void;
  updateOrder: (orderId: string, updatedOrder: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteOrderItem: (orderId: string, itemId: string) => Promise<void>;
  updateOrderItemStatus: (orderId: string, itemId: string, newStatus: string, user: string, note?: string) => void;
  updateInventory: (items: InventoryItem[]) => void;
  updateInventoryItem: (itemId: string, updatedItem: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  addInventoryItem: (newItem: InventoryItem) => Promise<void>;
  updateMember: (memberId: string, updatedMember: Member) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  addMember: (newMember: Member) => Promise<void>;
  updateProduct: (productId: string, updatedProduct: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (newProduct: Product) => Promise<void>;
  addTechnicianNote: (orderId: string, itemId: string, content: string, user: string) => void;
  addCustomer: (newCustomer: Customer) => Promise<void>;
  updateCustomer: (customerId: string, updatedCustomer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function để chuyển đổi từ tiếng Việt sang tiếng Anh
  const mapVietnameseOrderToEnglish = (vnOrder: any): Order => {
    return {
      id: vnOrder.ma_don_hang || vnOrder.id,
      customerId: vnOrder.ma_khach_hang || vnOrder.customerId,
      customerName: vnOrder.ten_khach_hang || vnOrder.customerName,
      items: (vnOrder.danh_sach_dich_vu || vnOrder.items || []).map((item: any) => ({
        id: item.ma_item || item.id,
        name: item.ten || item.name,
        type: item.loai_dich_vu || item.type,
        price: item.gia || item.price,
        quantity: item.so_luong || item.quantity || 1,
        status: item.trang_thai || item.status,
        technicianId: item.technicianId,
        beforeImage: item.anh_truoc || item.beforeImage,
        afterImage: item.anh_sau || item.afterImage,
        isProduct: item.isProduct,
        serviceId: item.serviceId,
        workflowId: item.workflowId,
        history: item.history,
        lastUpdated: item.lastUpdated,
        technicalLog: item.technicalLog
      })),
      totalAmount: vnOrder.tong_tien || vnOrder.totalAmount,
      deposit: vnOrder.dat_coc || vnOrder.deposit,
      status: vnOrder.trang_thai || vnOrder.status,
      createdAt: vnOrder.ngay_tao || vnOrder.createdAt,
      expectedDelivery: vnOrder.ngay_giao_du_kien || vnOrder.expectedDelivery,
      notes: vnOrder.ghi_chu || vnOrder.notes
    };
  };

  const mapVietnameseInventoryToEnglish = (vnItem: any): InventoryItem => {
    return {
      id: vnItem.ma_vat_tu || vnItem.id,
      sku: vnItem.ma_sku || vnItem.sku,
      name: vnItem.ten_vat_tu || vnItem.name,
      category: vnItem.danh_muc || vnItem.category,
      quantity: vnItem.so_luong || vnItem.quantity,
      unit: vnItem.don_vi || vnItem.unit,
      minThreshold: vnItem.nguong_toi_thieu || vnItem.minThreshold,
      importPrice: vnItem.gia_nhap || vnItem.importPrice,
      supplier: vnItem.nha_cung_cap || vnItem.supplier,
      lastImport: vnItem.ngay_nhap_gan_nhat || vnItem.lastImport,
      image: vnItem.hinh_anh || vnItem.image
    };
  };

  const mapVietnameseMemberToEnglish = (vnItem: any): Member => {
    return {
      id: vnItem.ma_nhan_vien || vnItem.id,
      name: vnItem.ho_ten || vnItem.name,
      role: vnItem.chuc_vu || vnItem.role,
      phone: vnItem.so_dien_thoai || vnItem.phone,
      email: vnItem.email || '',
      status: vnItem.trang_thai || vnItem.status,
      avatar: vnItem.anh_dai_dien || vnItem.avatar,
      specialty: vnItem.chuyen_mon || vnItem.specialty,
      department: vnItem.phong_ban || vnItem.department
    };
  };

  const mapVietnameseProductToEnglish = (vnItem: any): Product => {
    return {
      id: vnItem.ma_san_pham || vnItem.id,
      name: vnItem.ten_san_pham || vnItem.name,
      category: vnItem.danh_muc || vnItem.category,
      price: vnItem.gia_ban || vnItem.price,
      stock: vnItem.ton_kho || vnItem.stock,
      image: vnItem.hinh_anh || vnItem.image,
      desc: vnItem.mo_ta || vnItem.desc
    };
  };

  const mapVietnameseCustomerToEnglish = (vnItem: any): Customer => {
    return {
      id: vnItem.ma_khach_hang || vnItem.id,
      name: vnItem.ho_ten || vnItem.name,
      phone: vnItem.so_dien_thoai || vnItem.phone,
      email: vnItem.email || '',
      address: vnItem.dia_chi || vnItem.address,
      tier: vnItem.hang_khach || vnItem.tier || 'Standard',
      totalSpent: vnItem.tong_chi_tieu || vnItem.totalSpent || 0,
      lastVisit: vnItem.lan_ghe_gan_nhat || vnItem.lastVisit || '',
      notes: vnItem.ghi_chu || vnItem.notes
    };
  };

  // --- 1. Lắng nghe dữ liệu thực từ Firebase (Realtime) ---
  useEffect(() => {
    setIsLoading(true);

    // Lắng nghe Đơn hàng (don_hang)
    const ordersRef = ref(db, DB_PATHS.ORDERS);
    const unsubOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Object to Array & Map Vietnamese to English & Sort by Date desc
        const list: Order[] = Object.values(data).map(mapVietnameseOrderToEnglish);
        setOrders(list.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }));
      } else {
        setOrders([]);
      }
    });

    // Lắng nghe Kho (kho_vat_tu)
    const inventoryRef = ref(db, DB_PATHS.INVENTORY);
    const unsubInventory = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: InventoryItem[] = Object.values(data).map(mapVietnameseInventoryToEnglish);
        setInventory(list);
      } else {
        setInventory([]);
      }
    });

    // Lắng nghe Nhân sự
    const membersRef = ref(db, DB_PATHS.MEMBERS);
    const unsubMembers = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMembers(Object.values(data).map(mapVietnameseMemberToEnglish));
      } else {
        setMembers([]);
      }
    });

    // Lắng nghe Sản phẩm
    const productsRef = ref(db, DB_PATHS.PRODUCTS);
    const unsubProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProducts(Object.values(data).map(mapVietnameseProductToEnglish));
      } else {
        setProducts([]);
      }
    });

    // Lắng nghe Khách hàng
    const customersRef = ref(db, DB_PATHS.CUSTOMERS);
    const unsubCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCustomers(Object.values(data).map(mapVietnameseCustomerToEnglish));
      } else {
        setCustomers([]);
      }
    });

    setIsLoading(false);

    // Cleanup listeners
    return () => {
      unsubOrders();
      unsubInventory();
      unsubMembers();
      unsubProducts();
      unsubCustomers();
    };
  }, []);

  // --- 2. Thêm Đơn Hàng & Trừ Kho ---
  const addOrder = async (newOrder: Order) => {
    console.log('💾 Saving order to Firebase:', {
      orderId: newOrder.id,
      items: newOrder.items.map(item => ({
        id: item.id,
        name: item.name,
        serviceId: item.serviceId,
        workflowId: item.workflowId,
        status: item.status
      }))
    });

    // Remove undefined values before saving to Firebase
    const cleanedOrder = removeUndefined(newOrder);

    // Lưu đơn hàng vào Firebase với Key là ID của đơn
    await set(ref(db, `${DB_PATHS.ORDERS}/${newOrder.id}`), cleanedOrder);

    // Tính toán trừ kho dựa trên workflowId của item
    const currentInventory = [...inventory];
    let inventoryUpdated = false;

    newOrder.items.forEach(item => {
      // Chỉ trừ kho cho items không phải product và có workflowId
      if (!item.isProduct && item.workflowId) {
        // Tìm workflow từ Firebase workflows
        const workflow = workflows.find(w => w.id === item.workflowId);
        
        if (workflow && workflow.materials && Array.isArray(workflow.materials)) {
          workflow.materials.forEach(mat => {
            // Support both inventoryItemId and itemId for backward compatibility
            const inventoryItemId = mat.inventoryItemId || mat.itemId;
            const invItem = currentInventory.find(i => i.id === inventoryItemId);
            
            if (invItem && mat.quantity) {
              const deductAmount = mat.quantity * (item.quantity || 1);
              const newQuantity = Math.max(0, invItem.quantity - deductAmount);

              // Cập nhật trực tiếp item trong kho lên Firebase
              update(ref(db, `${DB_PATHS.INVENTORY}/${invItem.id}`), {
                quantity: newQuantity
              });
              inventoryUpdated = true;
              
              console.log('📦 Trừ kho:', {
                inventoryItem: invItem.name,
                inventoryItemId: invItem.id,
                deductAmount,
                oldQuantity: invItem.quantity,
                newQuantity,
                workflowId: item.workflowId,
                workflowName: workflow.label
              });
            }
          });
        } else {
          console.warn('⚠️ Không tìm thấy workflow hoặc materials:', {
            workflowId: item.workflowId,
            workflowFound: !!workflow,
            hasMaterials: workflow?.materials ? true : false
          });
        }
      }
    });
  };

  // --- 2.5. Cập nhật Đơn Hàng ---
  const updateOrder = async (orderId: string, updatedOrder: Order) => {
    await set(ref(db, `${DB_PATHS.ORDERS}/${orderId}`), updatedOrder);
  };

  // --- 2.6. Xóa Đơn Hàng ---
  const deleteOrder = async (orderId: string) => {
    await remove(ref(db, `${DB_PATHS.ORDERS}/${orderId}`));
  };

  // Helper function to remove undefined values from object
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  // --- 2.7. Xóa Item khỏi Đơn Hàng ---
  const deleteOrderItem = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Lọc bỏ item khỏi danh sách và làm sạch undefined
    const updatedItems = order.items
      .filter(item => item.id !== itemId)
      .map(item => {
        const cleaned: any = {
          id: item.id,
          name: item.name,
          type: item.type,
          price: item.price,
          quantity: item.quantity || 1,
          status: item.status
        };

        // Chỉ thêm optional fields nếu có giá trị
        if (item.beforeImage) cleaned.beforeImage = item.beforeImage;
        if (item.afterImage) cleaned.afterImage = item.afterImage;
        if (item.isProduct !== undefined) cleaned.isProduct = item.isProduct;
        if (item.serviceId) cleaned.serviceId = item.serviceId;
        if (item.technicianId) cleaned.technicianId = item.technicianId;
        if (item.history && item.history.length > 0) cleaned.history = item.history;
        if (item.lastUpdated) cleaned.lastUpdated = item.lastUpdated;
        if (item.technicalLog && item.technicalLog.length > 0) cleaned.technicalLog = item.technicalLog;

        return cleaned;
      });

    // Tính lại tổng tiền
    const newTotalAmount = updatedItems.reduce((acc, item) => acc + item.price, 0);

    // Cập nhật order và làm sạch undefined
    const updatedOrder: any = {
      id: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      items: updatedItems,
      totalAmount: newTotalAmount,
      deposit: order.deposit || 0,
      status: order.status,
      createdAt: order.createdAt,
      expectedDelivery: order.expectedDelivery,
      notes: order.notes || ''
    };

    // Loại bỏ tất cả undefined trước khi lưu
    const cleanedOrder = removeUndefined(updatedOrder);
    await set(ref(db, `${DB_PATHS.ORDERS}/${orderId}`), cleanedOrder);
  };

  // --- 3. Cập nhật Trạng thái Quy trình ---
  const updateOrderItemStatus = async (orderId: string, itemId: string, newStatus: string, user: string, note?: string) => {
    // 1. Lấy dữ liệu đơn hàng hiện tại để tìm index của item
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Find item by ID (could be old format or new format {orderId}-{serviceId})
    let itemIndex = order.items.findIndex(i => i.id === itemId);
    
    // If not found, try to find by serviceId if itemId is in format {orderId}-{serviceId}
    if (itemIndex === -1 && itemId.includes('-')) {
      const parts = itemId.split('-');
      if (parts.length >= 2) {
        // Try to find by serviceId (last part after last dash)
        const serviceId = parts[parts.length - 1];
        itemIndex = order.items.findIndex(i => i.serviceId === serviceId);
      }
    }
    
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

    // Ensure item ID is in format {orderId}-{serviceId} if serviceId exists
    const finalItemId = item.serviceId 
      ? `${orderId}-${item.serviceId}`
      : item.id;

    // Cập nhật lên Firebase (chỉ cập nhật các trường thay đổi của item cụ thể)
    const updates: any = {};
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/id`] = finalItemId;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/status`] = newStatus;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/history`] = newHistory;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/lastUpdated`] = now;
    updates[`${DB_PATHS.ORDERS}/${orderId}/items/${itemIndex}/technicalLog`] = newLog;

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

  // Cập nhật một vật tư cụ thể
  const updateInventoryItem = async (itemId: string, updatedItem: InventoryItem) => {
    // Remove undefined values before saving to Firebase
    const cleanedItem = removeUndefined(updatedItem);
    await set(ref(db, `${DB_PATHS.INVENTORY}/${itemId}`), cleanedItem);
  };

  // Xóa một vật tư
  const deleteInventoryItem = async (itemId: string) => {
    await remove(ref(db, `${DB_PATHS.INVENTORY}/${itemId}`));
  };

  // Thêm vật tư mới
  const addInventoryItem = async (newItem: InventoryItem) => {
    // Remove undefined values before saving to Firebase
    const cleanedItem = removeUndefined(newItem);
    await set(ref(db, `${DB_PATHS.INVENTORY}/${newItem.id}`), cleanedItem);
  };

  // Cập nhật nhân sự
  const updateMember = async (memberId: string, updatedMember: Member) => {
    await set(ref(db, `${DB_PATHS.MEMBERS}/${memberId}`), updatedMember);
  };

  // Xóa nhân sự
  const deleteMember = async (memberId: string) => {
    await remove(ref(db, `${DB_PATHS.MEMBERS}/${memberId}`));
  };

  // Thêm nhân sự mới
  const addMember = async (newMember: Member) => {
    await set(ref(db, `${DB_PATHS.MEMBERS}/${newMember.id}`), newMember);
  };

  // Cập nhật sản phẩm
  const updateProduct = async (productId: string, updatedProduct: Product) => {
    await set(ref(db, `${DB_PATHS.PRODUCTS}/${productId}`), updatedProduct);
  };

  // Xóa sản phẩm
  const deleteProduct = async (productId: string) => {
    await remove(ref(db, `${DB_PATHS.PRODUCTS}/${productId}`));
  };

  // Thêm sản phẩm mới
  const addProduct = async (newProduct: Product) => {
    await set(ref(db, `${DB_PATHS.PRODUCTS}/${newProduct.id}`), newProduct);
  };

  // Khách hàng
  const addCustomer = async (newCustomer: Customer) => {
    await set(ref(db, `${DB_PATHS.CUSTOMERS}/${newCustomer.id}`), newCustomer);
  };
  const updateCustomer = async (customerId: string, updatedCustomer: Customer) => {
    await set(ref(db, `${DB_PATHS.CUSTOMERS}/${customerId}`), updatedCustomer);
  };
  const deleteCustomer = async (customerId: string) => {
    await remove(ref(db, `${DB_PATHS.CUSTOMERS}/${customerId}`));
  };

  return (
    <AppContext.Provider value={{
      orders, inventory, members, products, customers,
      addOrder, updateOrder, deleteOrder, deleteOrderItem, updateOrderItemStatus,
      updateInventory, updateInventoryItem, deleteInventoryItem, addInventoryItem,
      updateMember, deleteMember, addMember,
      updateProduct, deleteProduct, addProduct,
      addCustomer, updateCustomer, deleteCustomer,
      addTechnicianNote, isLoading
    }}>
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