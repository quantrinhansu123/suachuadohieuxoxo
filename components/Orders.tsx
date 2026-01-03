import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Table, MoreHorizontal, QrCode, FileText, Image as ImageIcon, Printer, X, CheckSquare, Square, ShoppingBag, Package, Eye, Edit, Trash2 } from 'lucide-react';
import { Order, OrderStatus, ServiceType, ServiceItem, ServiceCatalogItem, WorkflowDefinition } from '../types';
import { useAppStore } from '../context';
import { TableFilter, FilterState, filterByDateRange } from './TableFilter';
import { db, DB_PATHS } from '../firebase';
import { ref, onValue, get } from 'firebase/database';

// Action Menu Component
const ActionMenu: React.FC<{
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  itemName: string;
}> = ({ onView, onEdit, onDelete, itemName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
          >
            <Eye size={16} />
            Xem
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
          >
            <Edit size={16} />
            Sửa
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Bạn có chắc chắn muốn xóa đơn hàng "${itemName}"?`)) {
                onDelete();
              }
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Xóa
          </button>
        </div>
      )}
    </div>
  );
};

export const Orders: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder, customers, products, members } = useAppStore();
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showQRModal, setShowQRModal] = useState(false);
  const [filter, setFilter] = useState<FilterState>({ locNhanh: 'all', thoiGian: { tuNgay: null, denNgay: null } });
  const [searchText, setSearchText] = useState('');

  // Fetch Services & Workflows from Firebase
  useEffect(() => {
    const servicesRef = ref(db, DB_PATHS.SERVICES);
    const unsubscribeServices = onValue(servicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key } as ServiceCatalogItem));
        setServices(list);
      } else {
        setServices([]);
      }
    });

    const workflowsRef = ref(db, DB_PATHS.WORKFLOWS);
    const unsubscribeWorkflows = onValue(workflowsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key } as WorkflowDefinition));
        setWorkflows(list);
      } else {
        setWorkflows([]);
      }
    });

    return () => {
      unsubscribeServices();
      unsubscribeWorkflows();
    };
  }, []);

  // Lọc đơn hàng theo thời gian và tìm kiếm
  const filteredOrders = useMemo(() => {
    let result = filterByDateRange(orders || [], filter, 'createdAt') as Order[];

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search)
      );
    }

    return result;
  }, [orders, filter, searchText]);

  // New Order Form State
  const [newOrderItems, setNewOrderItems] = useState<ServiceItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Edit Order Form State
  const [editOrderItems, setEditOrderItems] = useState<ServiceItem[]>([]);
  const [editSelectedItemType, setEditSelectedItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [editSelectedItemId, setEditSelectedItemId] = useState('');
  const [editCustomPrice, setEditCustomPrice] = useState<string>('');
  const [editSelectedCustomerId, setEditSelectedCustomerId] = useState('');
  const [editDeposit, setEditDeposit] = useState<string>('');
  const [editExpectedDelivery, setEditExpectedDelivery] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) setSelectedOrderIds(new Set());
    else setSelectedOrderIds(new Set(orders.map(o => o.id)));
  };

  const handleAddItem = () => {
    if (!selectedItemId) return;

    let itemData: any;
    let type: ServiceType;
    let name: string;
    let image: string = '';
    let workflowId: string | undefined;
    let initialStatus = 'In Queue';
    let initialStageName = 'Chờ Xử Lý';

    if (selectedItemType === 'SERVICE') {
      const svc = services.find(s => s.id === selectedItemId);
      if (!svc) return;
      itemData = svc;
      type = ServiceType.REPAIR;
      name = svc.name;
      image = svc.image;

      console.log('🔧 Service info when adding item:', {
        serviceId: svc.id,
        serviceName: svc.name,
        workflows: svc.workflows,
        workflowId: svc.workflowId
      });

      // Determine Workflow
      if (svc.workflows && svc.workflows.length > 0) {
        workflowId = svc.workflows[0].id;
        console.log('✅ Using workflows[0].id:', workflowId);
      } else if (Array.isArray(svc.workflowId) && svc.workflowId.length > 0) {
        workflowId = svc.workflowId[0];
        console.log('✅ Using workflowId[0]:', workflowId);
      } else if (typeof svc.workflowId === 'string' && svc.workflowId) {
        workflowId = svc.workflowId;
        console.log('✅ Using workflowId string:', workflowId);
      } else {
        console.log('⚠️ No workflow found for this service!');
      }

      // Determine Initial Stage if Workflow Found
      if (workflowId) {
        const wf = workflows.find(w => w.id === workflowId);
        if (wf && wf.stages && wf.stages.length > 0) {
          const sortedStages = [...wf.stages].sort((a, b) => a.order - b.order);
          initialStatus = sortedStages[0].id;
          initialStageName = sortedStages[0].name;
        }
      }

    } else {
      const prod = products.find(p => p.id === selectedItemId);
      if (!prod) return;
      itemData = prod;
      type = ServiceType.PRODUCT;
      name = prod.name;
      image = prod.image;
      initialStatus = 'Done';
      initialStageName = 'Hoàn Thành';
    }

    const newItem: ServiceItem = {
      id: `SI-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      name: name,
      type: type,
      price: customPrice ? parseInt(customPrice) : itemData.price,
      status: initialStatus,
      quantity: 1,
      beforeImage: image,
      isProduct: selectedItemType === 'PRODUCT',
      serviceId: selectedItemType === 'SERVICE' ? selectedItemId : undefined,
      workflowId: workflowId,
      history: [{
        stageId: initialStatus,
        stageName: initialStageName,
        enteredAt: Date.now(),
        performedBy: 'Hệ thống'
      }]
    };

    setNewOrderItems([...newOrderItems, newItem]);
    setSelectedItemId('');
    setCustomPrice('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...newOrderItems];
    updated.splice(index, 1);
    setNewOrderItems(updated);
  };

  const handleCreateOrder = () => {
    if (!selectedCustomerId || newOrderItems.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    const totalAmount = newOrderItems.reduce((acc, item) => acc + item.price, 0);

    // Tự động gán technician cho item đầu tiên (không phải product)
    const firstServiceItem = newOrderItems.find(item => !item.isProduct);
    let itemsWithAssignment = [...newOrderItems];

    if (firstServiceItem) {
      // Tìm technician đầu tiên (Kỹ thuật viên) từ members
      const firstTechnician = members.find(m => m.role === 'Kỹ thuật viên');

      if (firstTechnician) {
        const firstItemIndex = itemsWithAssignment.findIndex(item => item.id === firstServiceItem.id);
        if (firstItemIndex !== -1) {
          itemsWithAssignment[firstItemIndex] = {
            ...itemsWithAssignment[firstItemIndex],
            technicianId: firstTechnician.id
          };
        }
      }
    }

    const newOrder: Order = {
      id: `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Khách lẻ',
      items: itemsWithAssignment,
      totalAmount: totalAmount,
      deposit: 0,
      status: OrderStatus.PENDING,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
      notes: ''
    };

    addOrder(newOrder);

    setIsModalOpen(false);
    setNewOrderItems([]);
    setSelectedCustomerId('');
  };

  const handleEditAddItem = () => {
    if (!editSelectedItemId) return;

    let itemData: any;
    let type: ServiceType;
    let name: string;
    let image: string = '';
    let workflowId: string | undefined;
    let initialStatus = 'In Queue';
    let initialStageName = 'Chờ Xử Lý';

    if (editSelectedItemType === 'SERVICE') {
      const svc = services.find(s => s.id === editSelectedItemId);
      if (!svc) return;
      itemData = svc;
      type = ServiceType.REPAIR;
      name = svc.name;
      image = svc.image;

      // Determine Workflow
      if (svc.workflows && svc.workflows.length > 0) {
        workflowId = svc.workflows[0].id;
      } else if (Array.isArray(svc.workflowId) && svc.workflowId.length > 0) {
        workflowId = svc.workflowId[0];
      } else if (typeof svc.workflowId === 'string' && svc.workflowId) {
        workflowId = svc.workflowId;
      }

      if (workflowId) {
        const wf = workflows.find(w => w.id === workflowId);
        if (wf && wf.stages && wf.stages.length > 0) {
          const sortedStages = [...wf.stages].sort((a, b) => a.order - b.order);
          initialStatus = sortedStages[0].id;
          initialStageName = sortedStages[0].name;
        }
      }

    } else {
      const prod = products.find(p => p.id === editSelectedItemId);
      if (!prod) return;
      itemData = prod;
      type = ServiceType.PRODUCT;
      name = prod.name;
      image = prod.image;
      initialStatus = 'Done';
      initialStageName = 'Hoàn Thành';
    }

    const newItem: ServiceItem = {
      id: `SI-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      name: name,
      type: type,
      price: editCustomPrice ? parseInt(editCustomPrice) : itemData.price,
      status: initialStatus,
      quantity: 1,
      beforeImage: image,
      isProduct: editSelectedItemType === 'PRODUCT',
      serviceId: editSelectedItemType === 'SERVICE' ? editSelectedItemId : undefined,
      workflowId: workflowId,
      history: [{
        stageId: initialStatus,
        stageName: initialStageName,
        enteredAt: Date.now(),
        performedBy: 'Hệ thống'
      }]
    };

    setEditOrderItems([...editOrderItems, newItem]);
    setEditSelectedItemId('');
    setEditCustomPrice('');
  };

  const handleEditRemoveItem = (index: number) => {
    const updated = [...editOrderItems];
    updated.splice(index, 1);
    setEditOrderItems(updated);
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

  const handleUpdateOrder = async () => {
    if (!editingOrder || !editSelectedCustomerId || editOrderItems.length === 0) return;

    const customer = customers.find(c => c.id === editSelectedCustomerId);
    const totalAmount = editOrderItems.reduce((acc, item) => acc + item.price, 0);

    // Clean items to remove undefined values
    const cleanedItems = editOrderItems.map(item => {
      const cleaned: any = {
        id: item.id,
        name: item.name,
        type: item.type,
        price: item.price,
        quantity: item.quantity || 1,
        status: item.status
      };

      // Only add optional fields if they have values
      if (item.beforeImage) cleaned.beforeImage = item.beforeImage;
      if (item.afterImage) cleaned.afterImage = item.afterImage;
      if (item.isProduct !== undefined) cleaned.isProduct = item.isProduct;
      if (item.serviceId) cleaned.serviceId = item.serviceId;
      if (item.workflowId) cleaned.workflowId = item.workflowId;
      if (item.technicianId) cleaned.technicianId = item.technicianId;
      if (item.history && item.history.length > 0) cleaned.history = item.history;
      if (item.lastUpdated) cleaned.lastUpdated = item.lastUpdated;
      if (item.technicalLog && item.technicalLog.length > 0) cleaned.technicalLog = item.technicalLog;

      return cleaned;
    });

    const updatedOrder: any = {
      id: editingOrder.id,
      customerId: editSelectedCustomerId,
      customerName: customer?.name || 'Khách lẻ',
      items: cleanedItems,
      totalAmount: totalAmount,
      deposit: parseInt(editDeposit) || 0,
      status: editingOrder.status,
      createdAt: editingOrder.createdAt,
      expectedDelivery: editExpectedDelivery,
      notes: editNotes || ''
    };

    try {
      // Remove all undefined values before saving
      const cleanedOrder = removeUndefined(updatedOrder);
      await updateOrder(editingOrder.id, cleanedOrder);
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      setEditSelectedCustomerId('');
      setEditDeposit('');
      setEditExpectedDelivery('');
      setEditNotes('');
    } catch (error: any) {
      console.error('Lỗi khi cập nhật đơn hàng:', error);
      alert('Lỗi khi cập nhật đơn hàng: ' + (error?.message || String(error)));
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CONFIRMED: return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case OrderStatus.PROCESSING: return 'bg-gold-900/30 text-gold-500 border-gold-800';
      case OrderStatus.DONE: return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
      case OrderStatus.DELIVERED: return 'bg-neutral-800 text-slate-400 border-neutral-700';
      case OrderStatus.CANCELLED: return 'bg-red-900/30 text-red-400 border-red-800';
      default: return 'bg-neutral-800 text-slate-400 border-neutral-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'Chờ xử lý';
      case OrderStatus.CONFIRMED: return 'Đã xác nhận';
      case OrderStatus.PROCESSING: return 'Đang xử lý';
      case OrderStatus.DONE: return 'Hoàn thành';
      case OrderStatus.DELIVERED: return 'Đã trả khách';
      case OrderStatus.CANCELLED: return 'Đã hủy';
      default: return status;
    }
  };

  // Helper to get customer info
  const getCustomerInfo = (customerId: string) => {
    return customers.find(c => c.id === customerId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Đơn Hàng</h1>
          <p className="text-slate-500 mt-1">Quản lý tiếp nhận, xử lý và trả hàng.</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setNewOrderItems([]); }}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Tạo Đơn Mới</span>
        </button>
      </div>

      {/* Filters & Actions */}
      <div className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col sm:flex-row gap-4 items-center">
        {selectedOrderIds.size > 0 ? (
          <div className="flex-1 flex items-center gap-4 bg-neutral-800 p-2 rounded-lg border border-neutral-700 animate-in fade-in slide-in-from-left-2">
            <span className="font-medium text-slate-300 ml-2">{selectedOrderIds.size} đơn hàng đã chọn</span>
            <div className="h-4 w-px bg-neutral-700"></div>
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm hover:border-gold-500 hover:text-gold-500 transition-colors text-slate-300"
            >
              <QrCode size={16} /> In QR Code
            </button>
          </div>
        ) : (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo Mã đơn, Tên khách..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 text-slate-200 rounded-lg focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-600"
            />
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <TableFilter onFilterChange={setFilter} />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-800/50 border-b border-neutral-800">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-300">
                    {selectedOrderIds.size > 0 && selectedOrderIds.size === orders.length ? <CheckSquare size={20} className="text-gold-500" /> : <Square size={20} />}
                  </button>
                </th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Mã Đơn</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Khách Hàng</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Sản Phẩm / Dịch Vụ</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Tổng Tiền</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Trạng Thái</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Ngày Hẹn Trả</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.has(order.id);
                return (
                  <tr key={order.id} className={`transition-colors cursor-pointer ${isSelected ? 'bg-gold-900/10' : 'hover:bg-neutral-800'}`} onClick={() => setSelectedOrder(order)}>
                    <td className="p-4" onClick={(e) => toggleSelectOrder(order.id, e)}>
                      {isSelected ? <CheckSquare size={20} className="text-gold-500" /> : <Square size={20} className="text-neutral-600" />}
                    </td>
                    <td className="p-4 font-medium text-slate-200">{order.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{order.customerName}</div>
                      <div className="text-xs text-gold-600/80">
                        {/* Try to show Tier if possible */}
                        {getCustomerInfo(order.customerId)?.tier === 'VVIP' ? 'VVIP Member' : getCustomerInfo(order.customerId)?.tier === 'VIP' ? 'VIP Member' : 'Member'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex -space-x-2">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden" title={item.name}>
                            {item.beforeImage ? (
                              <img src={item.beforeImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400">{item.name[0]}</span>
                            )}
                          </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-xs text-slate-400 font-medium">
                          {(order.items || []).length}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gold-400">{order.totalAmount.toLocaleString()} ₫</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">{order.expectedDelivery}</td>
                    <td className="p-4">
                      <ActionMenu
                        itemName={order.id}
                        onView={() => setSelectedOrder(order)}
                        onEdit={() => {
                          setEditingOrder(order);
                          setEditOrderItems([...order.items]);
                          setEditSelectedCustomerId(order.customerId);
                          setEditDeposit(order.deposit.toString());
                          setEditExpectedDelivery(order.expectedDelivery);
                          setEditNotes(order.notes || '');
                          setIsEditModalOpen(true);
                        }}
                        onDelete={async () => {
                          try {
                            await deleteOrder(order.id);
                          } catch (error: any) {
                            console.error('Lỗi khi xóa đơn hàng:', error);
                            alert('Lỗi khi xóa đơn hàng: ' + (error?.message || String(error)));
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-neutral-900 z-10">
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-100">Chi Tiết Đơn Hàng</h2>
                <p className="text-sm text-slate-500">{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-800 rounded-full text-slate-400">✕</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800">
                  <h3 className="font-semibold text-gold-500 mb-3 flex items-center gap-2">
                    <QrCode size={18} /> Danh Sách Dịch Vụ & Sản Phẩm
                  </h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => {
                      // Find stage name if possible
                      let statusLabel = item.status;
                      // Try to find status in workflows
                      if (item.workflowId) {
                        const wf = workflows.find(w => w.id === item.workflowId);
                        const stage = wf?.stages?.find(s => s.id === item.status);
                        if (stage) statusLabel = stage.name;
                      }

                      return (
                        <div key={item.id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 shadow-sm flex gap-4">
                          <div className="w-20 h-20 bg-neutral-800 rounded-md overflow-hidden flex-shrink-0 relative group">
                            {item.beforeImage ? (
                              <img src={item.beforeImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Before" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">No Img</div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="text-white" size={20} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-slate-200 flex items-center gap-2">
                                {item.isProduct && <Package size={14} className="text-slate-500" />}
                                {item.name}
                              </h4>
                              <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-slate-400 border border-neutral-700">
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{item.type} • x{item.quantity || 1}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gold-600 font-medium">
                              <QrCode size={14} />
                              <span>{item.id}</span>
                            </div>
                            {!item.isProduct && item.serviceId && (
                              <div className="mt-2 text-[10px] text-slate-600 italic">
                                Đã trừ kho theo định mức quy trình
                              </div>
                            )}
                            {item.workflowId && (
                              <div className="mt-1 text-[10px] text-blue-500">
                                Quy trình: {workflows.find(w => w.id === item.workflowId)?.label || 'Unknown'}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-300">{item.price.toLocaleString()} ₫</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Thông Tin Khách Hàng</h3>
                  {(() => {
                    const c = getCustomerInfo(selectedOrder.customerId);
                    return (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500">Tên</label>
                          <p className="font-medium text-slate-200">{selectedOrder.customerName}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">SĐT</label>
                          <p className="font-medium text-slate-200">{c?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Địa chỉ</label>
                          <p className="text-sm text-slate-300">{c?.address || 'Chưa có'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Thanh Toán</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tạm tính</span>
                      <span className="text-slate-300">{selectedOrder.totalAmount.toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-200 pt-2 border-t border-neutral-700">
                      <span>Tổng cộng</span>
                      <span>{selectedOrder.totalAmount.toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between text-gold-500">
                      <span>Đã cọc</span>
                      <span>-{selectedOrder.deposit.toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-500 pt-2">
                      <span>Còn lại</span>
                      <span>{(selectedOrder.totalAmount - selectedOrder.deposit).toLocaleString()} ₫</span>
                    </div>
                  </div>
                </div>

                <button className="w-full py-3 bg-white text-black rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 font-medium">
                  <FileText size={18} />
                  In Hóa Đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... keeping Print Modal and Create/Edit Modals logic (Edit modal should be updated in real impl to match Create logic for workflows) ... */}
      {/* For brevity, omitting re-re-writing Create/Edit modal structure if it hasn't changed structure, but the handle functions are updated above. */}
      {/* Actually I need to include them to complete the file. */}

      {/* QR Print Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          {/* Same contents as before */}
          <div className="bg-neutral-900 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-neutral-800">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-600 text-black rounded-lg">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100">In Mã QR Đơn Hàng</h3>
                  <p className="text-xs text-slate-500">Đã chọn {selectedOrderIds.size} đơn hàng</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  <Printer size={18} /> In Ngay
                </button>
                <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-neutral-950">
              <div className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-8 grid grid-cols-2 gap-8 print:w-full print:shadow-none text-black">
                {orders.filter(o => selectedOrderIds.has(o.id)).map(order => (
                  <React.Fragment key={order.id}>
                    <div className="border-2 border-black p-4 rounded-xl flex items-center gap-6 break-inside-avoid">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`}
                        alt="QR"
                        className="w-32 h-32"
                      />
                      <div className="flex-1">
                        <div className="text-2xl font-black text-black mb-1">{order.id}</div>
                        <div className="font-bold text-lg mb-2">{order.customerName}</div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>Ngày nhận: {order.createdAt}</p>
                          <p>Hẹn trả: {order.expectedDelivery}</p>
                          <p className="font-semibold text-black">{order.items.length} Sản phẩm</p>
                        </div>
                      </div>
                    </div>
                    {order.items.map(item => (
                      <div key={item.id} className="border border-slate-300 p-4 rounded-xl flex items-center gap-4 break-inside-avoid bg-slate-50">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${item.id}`}
                          alt="QR"
                          className="w-20 h-20 mix-blend-multiply"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-slate-500 mb-0.5">{order.id}</div>
                          <div className="font-bold text-slate-900 truncate leading-tight">{item.name}</div>
                          <div className="text-xs text-slate-600 mt-1">{item.type}</div>
                          <div className="text-[10px] bg-white border border-slate-300 rounded px-1.5 py-0.5 inline-block mt-1 font-mono">{item.id}</div>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-serif font-bold text-slate-100">Tạo Đơn Hàng Mới</h2>
              <p className="text-slate-500 text-sm">Nhập thông tin khách hàng và chọn sản phẩm/dịch vụ.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800">
                <label className="block text-sm font-bold text-slate-300 mb-2">Khách hàng <span className="text-red-500">*</span></label>
                <select
                  className="w-full p-2.5 border border-neutral-700 rounded-lg outline-none focus:ring-1 focus:ring-gold-500 bg-neutral-900 text-slate-200"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.tier})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-200">Sản Phẩm & Dịch Vụ</h3>
                </div>

                {/* Add Item Form */}
                <div className="p-4 border border-gold-900/30 bg-gold-900/10 rounded-xl mb-4">
                  <div className="flex gap-4 mb-3 border-b border-gold-900/20 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={selectedItemType === 'SERVICE'}
                        onChange={() => { setSelectedItemType('SERVICE'); setSelectedItemId(''); setCustomPrice(''); }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Dịch Vụ (Spa/Sửa chữa)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={selectedItemType === 'PRODUCT'}
                        onChange={() => { setSelectedItemType('PRODUCT'); setSelectedItemId(''); setCustomPrice(''); }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Sản Phẩm Bán Lẻ</span>
                    </label>
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Chọn {selectedItemType === 'SERVICE' ? 'Dịch Vụ' : 'Sản Phẩm'}</label>
                      <select
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={selectedItemId}
                        onChange={(e) => {
                          setSelectedItemId(e.target.value);
                          const list = selectedItemType === 'SERVICE' ? services : products;
                          const item = list.find(i => i.id === e.target.value);
                          if (item) setCustomPrice(item.price.toString());
                        }}
                      >
                        <option value="">-- Chọn --</option>
                        {selectedItemType === 'SERVICE'
                          ? services.map(s => <option key={s.id} value={s.id}>{s.name} (Giá gốc: {s.price.toLocaleString()})</option>)
                          : products.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>)
                        }
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Đơn Giá (VNĐ)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm font-medium bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={handleAddItem}
                      disabled={!selectedItemId}
                      className="px-4 py-2 bg-slate-100 text-black rounded-lg text-sm font-medium hover:bg-white disabled:bg-neutral-800 disabled:text-slate-600 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {newOrderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-slate-300">{item.price.toLocaleString()} ₫</span>
                        <button onClick={() => handleRemoveItem(idx)} className="p-1 hover:text-red-500 text-slate-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {newOrderItems.length === 0 && (
                    <div className="text-center py-6 text-slate-500 border border-dashed border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-800/30 transition-colors" onClick={() => document.querySelector('select')?.focus()}>
                      Chưa có sản phẩm/dịch vụ nào
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-end">
                  <div className="text-right">
                    <p className="text-slate-500 text-sm mb-1">Tổng cộng dự kiến</p>
                    <p className="text-2xl font-bold text-gold-500">
                      {newOrderItems.reduce((acc, i) => acc + i.price, 0).toLocaleString()} ₫
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!selectedCustomerId || newOrderItems.length === 0}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo Đơn Hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Re-implementing Edit Modal Content similar to above but with Edit state */}
          <div className="bg-neutral-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-serif font-bold text-slate-100">Chỉnh Sửa Đơn Hàng</h2>
              <p className="text-slate-500 text-sm">Cập nhật thông tin đơn hàng #{editingOrder?.id}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Select */}
              <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800">
                <label className="block text-sm font-bold text-slate-300 mb-2">Khách hàng <span className="text-red-500">*</span></label>
                <select
                  className="w-full p-2.5 border border-neutral-700 rounded-lg outline-none focus:ring-1 focus:ring-gold-500 bg-neutral-900 text-slate-200"
                  value={editSelectedCustomerId}
                  onChange={(e) => setEditSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.tier})</option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-200">Sản Phẩm & Dịch Vụ</h3>
                </div>

                {/* Add Item Form (Edit Mode) */}
                <div className="p-4 border border-gold-900/30 bg-gold-900/10 rounded-xl mb-4">
                  <div className="flex gap-4 mb-3 border-b border-gold-900/20 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editType"
                        checked={editSelectedItemType === 'SERVICE'}
                        onChange={() => { setEditSelectedItemType('SERVICE'); setEditSelectedItemId(''); setEditCustomPrice(''); }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Dịch Vụ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editType"
                        checked={editSelectedItemType === 'PRODUCT'}
                        onChange={() => { setEditSelectedItemType('PRODUCT'); setEditSelectedItemId(''); setEditCustomPrice(''); }}
                        className="text-gold-500 focus:ring-gold-500 bg-neutral-900 border-neutral-700"
                      />
                      <span className="text-sm font-medium text-slate-300">Sản Phẩm</span>
                    </label>
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Chọn Item</label>
                      <select
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={editSelectedItemId}
                        onChange={(e) => {
                          setEditSelectedItemId(e.target.value);
                          const list = editSelectedItemType === 'SERVICE' ? services : products;
                          const item = list.find(i => i.id === e.target.value);
                          if (item) setEditCustomPrice(item.price.toString());
                        }}
                      >
                        <option value="">-- Chọn --</option>
                        {editSelectedItemType === 'SERVICE'
                          ? services.map(s => <option key={s.id} value={s.id}>{s.name} (Giá gốc: {s.price.toLocaleString()})</option>)
                          : products.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>)
                        }
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Đơn Giá</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-neutral-700 rounded-lg text-sm font-medium bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                        value={editCustomPrice}
                        onChange={(e) => setEditCustomPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={handleEditAddItem}
                      disabled={!editSelectedItemId}
                      className="px-4 py-2 bg-slate-100 text-black rounded-lg text-sm font-medium hover:bg-white disabled:bg-neutral-800 disabled:text-slate-600 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                {/* Items List (Edit) */}
                <div className="space-y-2">
                  {editOrderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-slate-300">{item.price.toLocaleString()} ₫</span>
                        <button onClick={() => handleEditRemoveItem(idx)} className="p-1 hover:text-red-500 text-slate-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Tiền Cọc</label>
                  <input
                    type="number"
                    value={editDeposit}
                    onChange={(e) => setEditDeposit(e.target.value)}
                    className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Ngày Trả Dự Kiến</label>
                  <input
                    type="text"
                    value={editExpectedDelivery}
                    onChange={(e) => setEditExpectedDelivery(e.target.value)}
                    className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none"
                    placeholder="dd/mm/yyyy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Ghi Chú</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none h-24 resize-none"
                  placeholder="Ghi chú đơn hàng..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingOrder(null); }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateOrder}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all font-bold"
              >
                Cập Nhật Đơn Hàng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};