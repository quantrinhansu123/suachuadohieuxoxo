import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_MEMBERS, MOCK_WORKFLOWS } from '../constants';
import { ServiceItem, ServiceType, WorkflowDefinition } from '../types';
import { useAppStore } from '../context'; 
import { MoreHorizontal, Calendar, User, Columns, Layers, ChevronRight, Briefcase, XCircle, AlertTriangle, RotateCcw, History, Clock, Info } from 'lucide-react';
import { ref, get, onValue } from 'firebase/database';
import { db, DB_PATHS } from '../firebase';

interface KanbanItem extends ServiceItem {
  orderId: string;
  customerName: string;
  expectedDelivery: string;
  cancelReason?: string;
  note?: string;
}

interface ActivityLog {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  itemName: string;
  timestamp: string;
  details?: string;
  type: 'info' | 'warning' | 'danger';
}

// Default columns fallback
const DEFAULT_COLUMNS = [
  { id: 'In Queue', title: 'Chờ Xử Lý', color: 'bg-neutral-900', dot: 'bg-slate-500' },
  { id: 'Cleaning', title: 'Vệ Sinh', color: 'bg-blue-900/10', dot: 'bg-blue-500' },
  { id: 'Repairing', title: 'Sửa Chữa', color: 'bg-orange-900/10', dot: 'bg-orange-500' },
  { id: 'QC', title: 'Kiểm Tra (QC)', color: 'bg-purple-900/10', dot: 'bg-purple-500' },
  { id: 'Ready', title: 'Hoàn Thành', color: 'bg-emerald-900/10', dot: 'bg-emerald-500' },
];

const CURRENT_USER = MOCK_MEMBERS[0]; 

export const KanbanBoard: React.FC = () => {
  const { orders, updateOrderItemStatus } = useAppStore();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(MOCK_WORKFLOWS);

  // Load workflows from Firebase
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const snapshot = await get(ref(db, DB_PATHS.WORKFLOWS));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const workflowsList: WorkflowDefinition[] = Object.keys(data).map(key => {
            const wf = data[key];
            return {
              id: wf.id || key,
              label: wf.label || '',
              description: wf.description || '',
              department: wf.department || 'Kỹ Thuật',
              types: wf.types || [],
              color: wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
              materials: wf.materials || undefined,
              stages: wf.stages || undefined,
              assignedMembers: wf.assignedMembers || undefined
            } as WorkflowDefinition;
          });
          setWorkflows(workflowsList);
        } else {
          setWorkflows(MOCK_WORKFLOWS);
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows(MOCK_WORKFLOWS);
      }
    };

    loadWorkflows();

    // Listen for real-time updates
    const workflowsRef = ref(db, DB_PATHS.WORKFLOWS);
    const unsubscribe = onValue(workflowsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const workflowsList: WorkflowDefinition[] = Object.keys(data).map(key => {
            const wf = data[key];
            return {
              id: wf.id || key,
              label: wf.label || '',
              description: wf.description || '',
              department: wf.department || 'Kỹ Thuật',
              types: wf.types || [],
              color: wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
              materials: wf.materials || undefined,
              stages: wf.stages || undefined,
              assignedMembers: wf.assignedMembers || undefined
            } as WorkflowDefinition;
          });
          setWorkflows(workflowsList);
        } else {
          setWorkflows(MOCK_WORKFLOWS);
        }
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setWorkflows(MOCK_WORKFLOWS);
      }
    });

    return () => unsubscribe();
  }, []);

  const WORKFLOWS_FILTER = useMemo(() => [
    { id: 'ALL', label: 'Tất cả công việc', types: [] as ServiceType[], color: 'bg-neutral-800 text-slate-400' },
    ...workflows
  ], [workflows]); 

  // Helper to map old status to new stage IDs - must be defined before useMemo that uses it
  const mapStatusToStageId = (status: string): string => {
    const statusMap: Record<string, string> = {
      'In Queue': 'in-queue',
      'Cleaning': 'cleaning',
      'Repairing': 'repairing',
      'QC': 'qc',
      'Ready': 'ready',
      'Done': 'ready'
    };
    return statusMap[status] || status.toLowerCase().replace(/\s+/g, '-');
  };

  const items: KanbanItem[] = useMemo(() => {
    const allItems = orders.flatMap(order => 
      order.items
        .filter(item => !item.isProduct)
        .map(item => ({
          ...item,
          orderId: order.id,
          customerName: order.customerName,
          expectedDelivery: order.expectedDelivery
        }))
    );
    
    console.log('Kanban items:', {
      totalOrders: orders.length,
      totalItems: allItems.length,
      items: allItems.map(i => ({ id: i.id, name: i.name, status: i.status, type: i.type }))
    });
    
    return allItems;
  }, [orders]);

  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<string>('ALL');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);

  // Get columns from active workflow
  const columns = useMemo(() => {
    if (activeWorkflow === 'ALL') {
      // Get all unique stages from all workflows
      const allStages = workflows.flatMap(wf => wf.stages || []);
      const uniqueStages = Array.from(
        new Map(allStages.map(s => [s.id, s])).values()
      ).sort((a, b) => a.order - b.order);
      
      if (uniqueStages.length > 0) {
        return uniqueStages.map(stage => ({
          id: stage.id,
          title: stage.name,
          color: stage.color ? stage.color.replace('-500', '-900/10') : 'bg-neutral-900',
          dot: stage.color || 'bg-slate-500'
        }));
      }
      // Fallback: map default columns to stage format
      return DEFAULT_COLUMNS.map(col => ({
        id: mapStatusToStageId(col.id),
        title: col.title,
        color: col.color,
        dot: col.dot
      }));
    } else {
      const workflow = workflows.find(wf => wf.id === activeWorkflow);
      if (workflow?.stages && workflow.stages.length > 0) {
        return workflow.stages.sort((a, b) => a.order - b.order).map(stage => ({
          id: stage.id,
          title: stage.name,
          color: stage.color ? stage.color.replace('-500', '-900/10') : 'bg-neutral-900',
          dot: stage.color || 'bg-slate-500'
        }));
      }
      // Fallback: map default columns to stage format
      return DEFAULT_COLUMNS.map(col => ({
        id: mapStatusToStageId(col.id),
        title: col.title,
        color: col.color,
        dot: col.dot
      }));
    }
  }, [activeWorkflow, workflows]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'CANCEL' | 'BACKWARD' | null;
    item: KanbanItem | null;
    targetStatus?: string;
  }>({ isOpen: false, type: null, item: null });
  const [reasonInput, setReasonInput] = useState('');

  const addVisualLog = (action: string, itemName: string, details?: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      user: CURRENT_USER.name,
      userAvatar: CURRENT_USER.avatar,
      action,
      itemName,
      timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', second: '2-digit' }),
      details,
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: KanbanItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, statusId: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    if (draggedItem.status === statusId) {
        setDraggedItem(null);
        return;
    }

    const validStatus = columns.find(c => c.id === statusId);
    if (!validStatus) return;

    const oldIndex = columns.findIndex(c => c.id === draggedItem.status);
    const newIndex = columns.findIndex(c => c.id === statusId);

    const oldStatusTitle = columns.find(c => c.id === draggedItem.status)?.title;
    const newStatusTitle = validStatus.title;

    if (newIndex < oldIndex) {
      setModalConfig({
        isOpen: true,
        type: 'BACKWARD',
        item: draggedItem,
        targetStatus: statusId
      });
    } else {
      updateOrderItemStatus(draggedItem.orderId, draggedItem.id, statusId, CURRENT_USER.name);
      addVisualLog('Cập nhật tiến độ', draggedItem.name, `Chuyển từ [${oldStatusTitle}] sang [${newStatusTitle}]`, 'info');
    }
    
    setDraggedItem(null);
  };

  const handleCancelRequest = (item: KanbanItem) => {
    setReasonInput('');
    setModalConfig({
      isOpen: true,
      type: 'CANCEL',
      item: item
    });
  };

  const confirmAction = () => {
    if (!modalConfig.item) return;

    if (!reasonInput.trim()) {
       alert("Vui lòng nhập nội dung ghi chú!");
       return;
    }

    const oldStatusTitle = columns.find(c => c.id === modalConfig.item?.status)?.title;

    if (modalConfig.type === 'CANCEL') {
      addVisualLog('Hủy công việc', modalConfig.item.name, `Lý do: ${reasonInput}`, 'danger');
    } 
    else if (modalConfig.type === 'BACKWARD' && modalConfig.targetStatus) {
      const newStatusTitle = columns.find(c => c.id === modalConfig.targetStatus)?.title;
      updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, modalConfig.targetStatus, CURRENT_USER.name, reasonInput);
      addVisualLog('Trả lại quy trình', modalConfig.item.name, `Từ [${oldStatusTitle}] về [${newStatusTitle}]. Ghi chú: ${reasonInput}`, 'warning');
    }

    closeModal();
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, item: null });
    setReasonInput('');
  };

  const filteredItems = useMemo(() => {
    if (activeWorkflow === 'ALL') return items;
    const currentWorkflow = workflows.find(w => w.id === activeWorkflow);
    if (!currentWorkflow) return items;
    
    // If workflow has types, filter by types
    if (currentWorkflow.types && currentWorkflow.types.length > 0) {
      return items.filter(item => currentWorkflow.types.includes(item.type));
    }
    
    // If no types defined, show all items (workflow might be for all types)
    return items;
  }, [items, activeWorkflow, workflows]);

  const getWorkflowCount = (workflowId: string, types: ServiceType[]) => {
    if (workflowId === 'ALL') return items.length;
    const currentWorkflow = workflows.find(w => w.id === workflowId);
    if (!currentWorkflow) return 0;
    
    // If workflow has types, filter by types
    if (currentWorkflow.types && currentWorkflow.types.length > 0) {
      return items.filter(item => currentWorkflow.types.includes(item.type)).length;
    }
    
    // If no types defined, show all items (workflow might be for all types)
    return items.length;
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}p`;
    return `${minutes}p`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-3">
            <Columns className="text-gold-500" />
            Bảng Tiến Độ (Kanban)
          </h1>
          <p className="text-slate-500 mt-1">Quản lý trực quan quy trình sản xuất theo từng nhóm việc.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowHistory(true)}
             className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors relative"
           >
             <History size={16} />
             <span>Lịch sử</span>
             {logs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-neutral-900"></span>
             )}
           </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Sidebar: Workflows */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-2">Danh sách quy trình</h3>
          {WORKFLOWS_FILTER.map((wf) => {
            const isActive = activeWorkflow === wf.id;
            const count = getWorkflowCount(wf.id, wf.types);
            
            return (
              <button
                key={wf.id}
                onClick={() => setActiveWorkflow(wf.id)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                  isActive 
                    ? 'bg-neutral-800 shadow-md border-l-4 border-gold-500' 
                    : 'hover:bg-neutral-900/50 text-slate-500 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-gold-600 text-black' : 'bg-neutral-800 text-slate-500 group-hover:bg-neutral-700'}`}>
                    {wf.id === 'ALL' ? <Layers size={18} /> : <Briefcase size={18} />}
                  </div>
                  <div>
                    <span className={`block font-medium text-sm ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                      {wf.label}
                    </span>
                    <span className="text-xs text-slate-600">{count} công việc</span>
                  </div>
                </div>
                {isActive && <ChevronRight size={16} className="text-gold-500" />}
              </button>
            );
          })}
        </div>

        {/* Right Content: Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 bg-neutral-900/50 rounded-xl border border-neutral-800 p-1">
          <div className="flex h-full gap-6 min-w-[1200px] p-4">
            {columns.map(col => {
              const colItems = filteredItems.filter(i => {
                // Try exact match first
                if (i.status === col.id) return true;
                
                // Try mapping status to stage ID
                const itemStatusId = mapStatusToStageId(i.status);
                if (itemStatusId === col.id) return true;
                
                // Try case-insensitive match
                if (i.status.toLowerCase() === col.id.toLowerCase()) return true;
                
                // Try matching with stage name (for backward compatibility)
                const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === col.id);
                if (stage && (i.status === stage.name || i.status.toLowerCase() === stage.name.toLowerCase())) {
                  return true;
                }
                
                return false;
              });
              
              return (
                <div 
                  key={col.id} 
                  className="flex-1 flex flex-col bg-neutral-950/50 rounded-xl border border-neutral-800 shadow-sm"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className="p-4 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 backdrop-blur rounded-t-xl sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                      <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{col.title}</h3>
                    </div>
                    <span className="bg-neutral-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${col.color}`}>
                    {colItems.map(item => (
                      <div 
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        className="bg-neutral-900 p-3 rounded-lg shadow-lg shadow-black/20 border border-neutral-800 cursor-move hover:border-gold-500/50 transition-all group active:cursor-grabbing relative"
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-md bg-neutral-800 overflow-hidden flex-shrink-0 relative">
                             {item.beforeImage ? (
                               <img src={item.beforeImage} alt="" className="w-full h-full object-cover opacity-80" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Img</div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                               <span className="text-[10px] font-mono text-slate-500 bg-neutral-800 px-1 rounded">{item.id}</span>
                               <div className="flex items-center gap-1">
                                 {/* Cancel Button */}
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleCancelRequest(item); }}
                                    className="text-slate-600 hover:text-red-500 p-1 rounded hover:bg-red-900/20 transition-colors"
                                    title="Hủy công việc"
                                 >
                                   <XCircle size={14} />
                                 </button>
                               </div>
                            </div>
                            <h4 className="font-medium text-slate-200 text-sm truncate mt-1" title={item.name}>{item.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                               <User size={12} className="text-slate-600" />
                               <span className="truncate">{item.customerName}</span>
                            </div>
                            {item.note && (
                               <div className="mt-2 text-[10px] bg-orange-900/20 text-orange-400 px-2 py-1 rounded border border-orange-900/30 flex items-start gap-1">
                                  <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{item.note}</span>
                               </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-col gap-2">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-neutral-800 px-2 py-1 rounded border border-neutral-800">
                                  <Calendar size={12} />
                                  <span>{item.expectedDelivery}</span>
                              </div>
                              <span className="text-xs font-bold text-gold-500">{item.price.toLocaleString()} ₫</span>
                           </div>

                           {/* Last Updated / Duration Badge */}
                           {item.lastUpdated && (
                               <div className="text-[10px] text-slate-600 flex items-center justify-end gap-1">
                                   <Clock size={10} />
                                   <span>
                                     {new Date(item.lastUpdated).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                   </span>
                               </div>
                           )}
                           
                           {/* Previous Stage Duration Info (if exists) */}
                           {item.history && item.history.length > 1 && item.history[item.history.length - 2].duration && (
                               <div className="text-[10px] text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-900/30">
                                  <Info size={10} />
                                  <span>
                                    Bước trước: {formatDuration(item.history[item.history.length - 2].duration || 0)}
                                  </span>
                               </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation & Warning Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-neutral-800">
            {/* Flashing Header */}
            <div className={`p-4 flex items-center gap-3 ${
              modalConfig.type === 'CANCEL' ? 'bg-red-900/20' : 'bg-orange-900/20'
            }`}>
              <div className={`p-2 rounded-full ${
                modalConfig.type === 'CANCEL' ? 'bg-red-900/40 text-red-500' : 'bg-orange-900/40 text-orange-500'
              } animate-pulse`}> 
                {modalConfig.type === 'CANCEL' ? <AlertTriangle size={24} /> : <RotateCcw size={24} />}
              </div>
              <div>
                <h3 className={`font-bold text-lg ${
                  modalConfig.type === 'CANCEL' ? 'text-red-500' : 'text-orange-500'
                } animate-pulse`}>
                  {modalConfig.type === 'CANCEL' ? 'Xác nhận Hủy Công Việc' : 'Cảnh báo: Lùi Quy Trình'}
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-slate-400 mb-4 text-sm">
                {modalConfig.type === 'CANCEL' 
                  ? `Bạn có chắc chắn muốn hủy công việc "${modalConfig.item?.name}" không? Hành động này không thể hoàn tác.`
                  : `Bạn đang chuyển công việc "${modalConfig.item?.name}" về bước trước đó. Vui lòng ghi rõ lý do (VD: QC không đạt, làm lại...).`
                }
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {modalConfig.type === 'CANCEL' ? 'Lý do hủy' : 'Ghi chú / Lý do trả lại'}
                  <span className={modalConfig.type === 'CANCEL' ? "text-red-500" : "text-orange-500"}> *</span>
                </label>
                <textarea 
                  className={`w-full p-3 border rounded-lg focus:ring-1 outline-none text-sm bg-neutral-950 text-slate-200 ${
                    modalConfig.type === 'CANCEL' 
                      ? 'border-red-900 focus:border-red-500' 
                      : 'border-orange-900 focus:border-orange-500'
                  }`}
                  rows={3}
                  placeholder={
                    modalConfig.type === 'CANCEL' 
                      ? "Nhập lý do hủy đơn..." 
                      : "Nhập lý do chuyển lại bước trước (VD: Đường chỉ lỗi, màu chưa chuẩn...)"
                  }
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 font-medium text-sm"
                >
                  Quay lại
                </button>
                <button 
                  onClick={confirmAction}
                  className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all text-sm ${
                    modalConfig.type === 'CANCEL' 
                      ? 'bg-red-700 hover:bg-red-800 shadow-red-900/20' 
                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20'
                  }`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Log Modal (Visual + Real Data Mix) */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex justify-end backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-neutral-800">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
              <h3 className="font-serif font-bold text-lg text-slate-100 flex items-center gap-2">
                <History size={20} className="text-gold-500" />
                Lịch Sử Hoạt Động
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                <XCircle size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {logs.length === 0 ? (
                 <div className="text-center py-10 text-slate-600">
                   <History size={48} className="mx-auto mb-3 opacity-20" />
                   <p>Chưa có hoạt động nào được ghi nhận trong phiên này.</p>
                 </div>
               ) : (
                 logs.map(log => (
                   <div key={log.id} className="flex gap-3 relative pb-6 last:pb-0">
                     <div className="absolute left-[15px] top-8 bottom-0 w-px bg-neutral-800 last:hidden"></div>
                     <div className="flex-shrink-0">
                       {log.userAvatar ? (
                         <img src={log.userAvatar} alt="" className="w-8 h-8 rounded-full border border-neutral-700" />
                       ) : (
                         <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-slate-400">
                           {log.user.charAt(0)}
                         </div>
                       )}
                     </div>
                     <div className="flex-1">
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm text-slate-300">{log.user}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock size={10} /> {log.timestamp}
                            </span>
                          </div>
                          <p className={`text-xs font-medium mb-1 ${
                            log.type === 'danger' ? 'text-red-500' : 
                            log.type === 'warning' ? 'text-orange-500' : 'text-blue-500'
                          }`}>
                            {log.action}: {log.itemName}
                          </p>
                          {log.details && (
                            <p className="text-xs text-slate-500 leading-relaxed italic border-t border-neutral-800 pt-1 mt-1">
                              "{log.details}"
                            </p>
                          )}
                        </div>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};