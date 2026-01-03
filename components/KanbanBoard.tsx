import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_MEMBERS, MOCK_WORKFLOWS } from '../constants';
import { ServiceItem, ServiceType, WorkflowDefinition, WorkflowStage, ServiceCatalogItem } from '../types';
import { useAppStore } from '../context';
import { MoreHorizontal, Calendar, User, Columns, Layers, ChevronRight, Briefcase, XCircle, AlertTriangle, RotateCcw, History, Clock, Info } from 'lucide-react';
import { ref, get, onValue, set, update } from 'firebase/database';
import { db, DB_PATHS } from '../firebase';
import { EditStageTasksModal } from './EditStageTasksModal';

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
// Fallback user since MOCK_MEMBERS is now empty
const CURRENT_USER = MOCK_MEMBERS[0] || {
  id: 'system',
  name: 'Hệ thống',
  role: 'Quản lý' as const,
  phone: '',
  email: '',
  status: 'Active' as const
};

// Helper to remove undefined values before saving to Firebase
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

export const KanbanBoard: React.FC = () => {
  const { orders, updateOrderItemStatus, updateOrder } = useAppStore();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);

  // Load services for workflow sequence lookup
  useEffect(() => {
    const servicesRef = ref(db, DB_PATHS.SERVICES);
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key } as ServiceCatalogItem));
        setServices(list);
      } else {
        setServices([]);
      }
    });
    return () => unsubscribe();
  }, []);

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
          setWorkflows([]);
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows([]);
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
          setWorkflows([]);
        }
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setWorkflows([]);
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
        .map(item => {
          // Auto-detect workflow if missing
          let workflowId = item.workflowId;
          if (!workflowId) {
            const matchedWf = workflows.find(w => w.types && w.types.includes(item.type));
            if (matchedWf) workflowId = matchedWf.id;
          }

          return {
            ...item,
            orderId: order.id,
            customerName: order.customerName,
            expectedDelivery: order.expectedDelivery,
            workflowId: workflowId
          };
        })
    );

    console.log('Kanban items:', {
      totalOrders: orders.length,
      totalItems: allItems.length,
      items: allItems.map(i => ({
        id: i.id,
        orderId: i.orderId,
        name: i.name,
        status: i.status,
        type: i.type,
        wf: i.workflowId
      }))
    });

    return allItems;
  }, [orders, workflows]);

  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<string>('ALL');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);
  const [editingStage, setEditingStage] = useState<{ stageId: string; stageName: string } | null>(null);

  // Get columns from active workflow
  const columns = useMemo(() => {
    if (activeWorkflow === 'ALL') {
      return workflows.map(wf => ({
        id: wf.id,
        title: wf.label,
        color: wf.color ? wf.color.replace('-500', '-900/10') : 'bg-neutral-900',
        dot: 'bg-slate-500',
        isSpecial: false
      }));
    }

    let workflowColumns: any[] = [];
    const workflow = workflows.find(wf => wf.id === activeWorkflow);

    if (workflow?.stages && workflow.stages.length > 0) {
      workflowColumns = workflow.stages.sort((a, b) => a.order - b.order).map(stage => ({
        id: stage.id,
        title: stage.name,
        color: stage.color ? stage.color.replace('-500', '-900/10') : 'bg-neutral-900',
        dot: stage.color || 'bg-slate-500',
        isSpecial: false
      }));
    } else {
      workflowColumns = DEFAULT_COLUMNS.map(col => ({
        id: mapStatusToStageId(col.id),
        title: col.title,
        color: col.color,
        dot: col.dot,
        isSpecial: false
      }));
    }

    return [
      ...workflowColumns,
      {
        id: 'done',
        title: 'Done',
        color: 'bg-emerald-900/10',
        dot: 'bg-emerald-500',
        isSpecial: true,
        specialType: 'done'
      },
      {
        id: 'cancel',
        title: 'Cancel',
        color: 'bg-red-900/10',
        dot: 'bg-red-500',
        isSpecial: true,
        specialType: 'cancel'
      }
    ];
  }, [activeWorkflow, workflows]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'CANCEL' | 'BACKWARD' | null;
    item: KanbanItem | null;
    targetStatus?: string;
    previousWorkflow?: { workflow: WorkflowDefinition; stage: WorkflowStage };
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
    e.dataTransfer.setData('text/plain', item.id); // Required for drag to work in some browsers
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, statusId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.status === statusId) {
      setDraggedItem(null);
      return;
    }

    const validStatus = columns.find(c => c.id === statusId);
    if (!validStatus) return;

    const oldStatusTitle = columns.find(c => c.id === draggedItem.status)?.title;
    const newStatusTitle = validStatus.title;

    // Handle special columns
    if (statusId === 'done') {
      console.log('🎯 Done column detected, checking for next workflow...');
      let movedToNextWorkflow = false;

      // Check for Next Workflow
      console.log('📋 Item info:', {
        serviceId: draggedItem.serviceId,
        workflowId: draggedItem.workflowId,
        itemName: draggedItem.name,
        FULL_ITEM: draggedItem
      });

      if (draggedItem.serviceId && draggedItem.workflowId) {
        const service = services.find(s => s.id === draggedItem.serviceId);
        console.log('🔍 Found service:', service ? {
          id: service.id,
          name: service.name,
          workflows: service.workflows
        } : 'NOT FOUND');

        // Ensure service exists and has workflows config
        if (service && service.workflows && service.workflows.length > 0) {
          // Find current workflow index
          const currentWfIndex = service.workflows.findIndex(wf => wf.id === draggedItem.workflowId);
          console.log('📊 Workflow index:', {
            currentWfIndex,
            totalWorkflows: service.workflows.length,
            currentWorkflowId: draggedItem.workflowId,
            allWorkflowIds: service.workflows.map(w => w.id)
          });

          if (currentWfIndex !== -1 && currentWfIndex < service.workflows.length - 1) {
            // Determine next workflow
            const nextWfConfig = service.workflows[currentWfIndex + 1];
            const nextWf = workflows.find(w => w.id === nextWfConfig.id);
            console.log('➡️ Next workflow:', nextWf ? {
              id: nextWf.id,
              label: nextWf.label,
              stagesCount: nextWf.stages?.length || 0
            } : 'NOT FOUND');

            if (nextWf && nextWf.stages && nextWf.stages.length > 0) {
              // Find first stage of next workflow
              const sortedStages = [...nextWf.stages].sort((a, b) => a.order - b.order);
              const firstStage = sortedStages[0];
              console.log('🎬 First stage of next workflow:', firstStage);

              // Perform Update
              const order = orders.find(o => o.id === draggedItem.orderId);
              if (order) {
                const now = Date.now();
                const updatedItems = order.items.map(item => {
                  if (item.id === draggedItem.id) {
                    // Close history
                    const newHistory = [...(item.history || [])];
                    if (newHistory.length > 0) {
                      const lastEntry = newHistory[newHistory.length - 1];
                      if (!lastEntry.leftAt) {
                        newHistory[newHistory.length - 1] = {
                          ...lastEntry,
                          leftAt: now,
                          duration: now - lastEntry.enteredAt
                        };
                      }
                    }
                    // Open new history
                    newHistory.push({
                      stageId: firstStage.id,
                      stageName: firstStage.name,
                      enteredAt: now,
                      performedBy: CURRENT_USER.name
                    });

                    return {
                      ...item,
                      workflowId: nextWf.id,
                      status: firstStage.id,
                      history: newHistory,
                      lastUpdated: now
                    };
                  }
                  return item;
                });

                console.log('💾 Updating order with new workflow...');
                const cleanedOrder = removeUndefined({ ...order, items: updatedItems });
                await updateOrder(order.id, cleanedOrder);
                addVisualLog('Chuyển quy trình', draggedItem.name, `Chuyển sang quy trình: ${nextWf.label} (Bước: ${firstStage.name})`, 'info');
                movedToNextWorkflow = true;
                console.log('✅ Successfully moved to next workflow!');
              }
            } else {
              console.log('❌ Next workflow has no stages');
              alert('Quy trình tiếp theo chưa được cấu hình các bước!');
            }
          } else {
            console.log('ℹ️ No next workflow (last workflow or not found)');
          }
        } else {
          console.log('⚠️ Service has no workflows configured');
        }
      } else {
        console.log('⚠️ Item missing serviceId or workflowId');
      }

      if (!movedToNextWorkflow) {
        console.log('🏁 Marking as done (no next workflow)');
        // No next workflow -> Mark as Done
        updateOrderItemStatus(draggedItem.orderId, draggedItem.id, 'done', CURRENT_USER.name);
        addVisualLog('Hoàn thành', draggedItem.name, `Đã hoàn thành toàn bộ quy trình`, 'info');
      }

      setDraggedItem(null);
      return;
    }

    if (statusId === 'cancel') {
      console.log('🚫 Cancel column detected, checking for previous workflow...');
      let movedToPreviousWorkflow = false;

      // Check for Previous Workflow
      console.log('📋 Item info for cancel:', {
        serviceId: draggedItem.serviceId,
        workflowId: draggedItem.workflowId,
        itemName: draggedItem.name
      });

      if (draggedItem.serviceId && draggedItem.workflowId) {
        const service = services.find(s => s.id === draggedItem.serviceId);
        console.log('🔍 Found service:', service ? {
          id: service.id,
          name: service.name,
          workflows: service.workflows
        } : 'NOT FOUND');

        if (service && service.workflows && service.workflows.length > 0) {
          const currentWfIndex = service.workflows.findIndex(wf => wf.id === draggedItem.workflowId);
          console.log('📊 Current workflow index:', {
            currentWfIndex,
            totalWorkflows: service.workflows.length
          });

          // Check if there's a previous workflow (index > 0)
          if (currentWfIndex > 0) {
            const prevWfConfig = service.workflows[currentWfIndex - 1];
            const prevWf = workflows.find(w => w.id === prevWfConfig.id);
            console.log('⬅️ Previous workflow:', prevWf ? {
              id: prevWf.id,
              label: prevWf.label,
              stagesCount: prevWf.stages?.length || 0
            } : 'NOT FOUND');

            if (prevWf && prevWf.stages && prevWf.stages.length > 0) {
              // Find LAST stage of previous workflow
              const sortedStages = [...prevWf.stages].sort((a, b) => a.order - b.order);
              const lastStage = sortedStages[sortedStages.length - 1];
              console.log('🎬 Last stage of previous workflow:', lastStage);

              // Show modal to get reason
              setModalConfig({
                isOpen: true,
                type: 'CANCEL',
                item: draggedItem,
                targetStatus: 'previous_workflow',
                previousWorkflow: { workflow: prevWf, stage: lastStage }
              });
              setDraggedItem(null);
              return;
            } else {
              alert('Quy trình trước chưa được cấu hình các bước!');
            }
          } else {
            console.log('ℹ️ No previous workflow (first workflow)');
            alert('Đây là quy trình đầu tiên, không thể quay lại quy trình trước!');
          }
        } else {
          console.log('⚠️ Service has no workflows configured');
        }
      } else {
        console.log('⚠️ Item missing serviceId or workflowId');
      }

      // If no previous workflow, just show cancel modal
      if (!movedToPreviousWorkflow) {
        setModalConfig({
          isOpen: true,
          type: 'CANCEL',
          item: draggedItem,
          targetStatus: statusId
        });
      }

      setDraggedItem(null);
      return;
    }

    // Normal column logic
    const currentStageId = mapStatusToStageId(draggedItem.status);
    const oldIndex = columns.findIndex(c => c.id === currentStageId);
    const newIndex = columns.findIndex(c => c.id === statusId);

    console.log('🔍 Drag Debug:', {
      draggedItemStatus: draggedItem.status,
      mappedCurrentStageId: currentStageId,
      targetStatusId: statusId,
      oldIndex,
      newIndex,
      columnsIds: columns.map(c => c.id)
    });

    // If oldIndex is -1, the item's current status doesn't match any column
    // This can happen with legacy data or items from different workflows
    // In this case, allow the move (treat as forward move)
    if (oldIndex === -1) {
      console.log('⚠️ Current status not found in columns, allowing move');
      updateOrderItemStatus(draggedItem.orderId, draggedItem.id, statusId, CURRENT_USER.name);
      addVisualLog('Cập nhật tiến độ', draggedItem.name, `Chuyển sang [${newStatusTitle}]`, 'info');
    } else if (newIndex < oldIndex) {
      console.log('⬅️ Backward move detected, showing modal');
      setModalConfig({
        isOpen: true,
        type: 'BACKWARD',
        item: draggedItem,
        targetStatus: statusId
      });
    } else {
      console.log('➡️ Forward move, calling updateOrderItemStatus');
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
      // Check if we need to move to previous workflow
      if (modalConfig.previousWorkflow) {
        const { workflow: prevWf, stage: lastStage } = modalConfig.previousWorkflow;
        const order = orders.find(o => o.id === modalConfig.item.orderId);

        if (order) {
          const now = Date.now();
          const updatedItems = order.items.map(item => {
            if (item.id === modalConfig.item.id) {
              // Close history
              const newHistory = [...(item.history || [])];
              if (newHistory.length > 0) {
                const lastEntry = newHistory[newHistory.length - 1];
                if (!lastEntry.leftAt) {
                  newHistory[newHistory.length - 1] = {
                    ...lastEntry,
                    leftAt: now,
                    duration: now - lastEntry.enteredAt
                  };
                }
              }
              // Open new history
              newHistory.push({
                stageId: lastStage.id,
                stageName: lastStage.name,
                enteredAt: now,
                performedBy: CURRENT_USER.name
              });

              return {
                ...item,
                workflowId: prevWf.id,
                status: lastStage.id,
                history: newHistory,
                lastUpdated: now
              };
            }
            return item;
          });

          const cleanedOrder = removeUndefined({ ...order, items: updatedItems });
          updateOrder(order.id, cleanedOrder);
          addVisualLog('Trả lại quy trình', modalConfig.item.name, `Từ [${oldStatusTitle}] về quy trình: ${prevWf.label} (${lastStage.name}). Lý do: ${reasonInput}`, 'warning');
        }
      } else {
        // Just mark as cancelled
        updateOrderItemStatus(modalConfig.item.orderId, modalConfig.item.id, 'cancel', CURRENT_USER.name, reasonInput);
        addVisualLog('Hủy', modalConfig.item.name, `Từ [${oldStatusTitle}]. Lý do: ${reasonInput}`, 'danger');
      }
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

  // Helper to check if item matches column
  const checkStatusMatch = (item: KanbanItem, colId: string) => {
    if (activeWorkflow === 'ALL') {
      if (item.workflowId === colId) return true;
      if (!item.workflowId) {
        const wf = workflows.find(w => w.id === colId);
        if (wf && wf.types && wf.types.includes(item.type)) return true;
      }
      return false;
    }

    if (item.status === colId) return true;
    const itemStatusId = mapStatusToStageId(item.status);
    if (itemStatusId === colId) return true;
    if (item.status.toLowerCase() === colId.toLowerCase()) return true;

    // Check against all stages across all workflows
    const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === colId);
    if (stage && (item.status === stage.name || item.status.toLowerCase() === stage.name.toLowerCase())) {
      return true;
    }
    return false;
  };

  const renderCard = (item: KanbanItem) => {
    const getStageName = (statusId: string) => {
      const stage = workflows.flatMap(wf => wf.stages || []).find(s => s.id === statusId);
      if (stage) return stage.name;
      if (statusId === 'in-queue') return 'Chờ xử lý';
      if (statusId === 'ready') return 'Hoàn thành';
      if (statusId === 'done') return 'Hoàn thành';
      if (statusId === 'cancel') return 'Đã hủy';
      return statusId;
    };

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        className="bg-neutral-900 p-3 rounded-lg shadow-lg shadow-black/20 border border-neutral-800 cursor-move hover:border-gold-500/50 transition-all group active:cursor-grabbing relative mb-3 last:mb-0"
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
                <button
                  onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, type: 'CANCEL', item }); }}
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
            {item.technicalLog && item.technicalLog.length > 0 && (() => {
              const latestLog = item.technicalLog[item.technicalLog.length - 1];
              return (
                <div className="mt-2 text-[10px] bg-orange-900/20 text-orange-400 px-2 py-1 rounded border border-orange-900/30 flex items-start gap-1">
                  <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-orange-300">{latestLog.author} - {latestLog.timestamp}</div>
                    <div className="line-clamp-2 mt-0.5">{latestLog.content}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-col gap-2">
          {/* Status & Workflow Info */}
          <div className="bg-neutral-950/50 p-2 rounded border border-neutral-800/50 space-y-1">
            {/* Workflow Name */}
            {(() => {
              const wf = workflows.find(w => w.id === item.workflowId);
              return wf ? (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-b border-neutral-800/50 pb-1 mb-1">
                  <Layers size={10} />
                  <span className="font-medium truncate">{wf.label}</span>
                </div>
              ) : null;
            })()}

            {/* Stage Info */}
            <div className="flex flex-wrap items-center gap-1">
              {item.history && item.history.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  <History size={10} className="text-slate-600 mr-0.5" />
                  {item.history.map((h, idx) => (
                    <div key={idx} className="flex items-center text-[9px] text-slate-500">
                      {idx > 0 && <ChevronRight size={8} className="mx-0.5 text-slate-700" />}
                      <span className="truncate max-w-[60px]">{h.stageName}</span>
                    </div>
                  ))}
                  <ChevronRight size={8} className="mx-0.5 text-slate-700" />
                  <span className="text-[10px] font-bold text-gold-500">{getStageName(item.status)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-gold-500">{getStageName(item.status)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-neutral-800 px-2 py-1 rounded border border-neutral-800">
              <Calendar size={12} />
              <span>Ngày hẹn: <span className="text-slate-300">{item.expectedDelivery}</span></span>
            </div>
            <span className="text-xs font-bold text-gold-500">{item.price.toLocaleString()} ₫</span>
          </div>

          {item.lastUpdated && (
            <div className="text-[10px] text-slate-600 flex items-center justify-end gap-1">
              <Clock size={10} />
              <span>
                {new Date(item.lastUpdated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
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
                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${isActive
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

        {/* Right Content: Kanban Board or Matrix View */}
        <div className="flex-1 overflow-hidden bg-neutral-900/50 rounded-xl border border-neutral-800 relative">
          {activeWorkflow === 'ALL' ? (
            // MATRIX VIEW
            <div className="absolute inset-0 overflow-auto">
              <div className="min-w-full w-max">
                {/* Header Row */}
                <div className="flex border-b border-neutral-800 sticky top-0 bg-neutral-900 z-20">
                  {columns.map(col => (
                    <div key={col.id} className="w-[280px] flex-shrink-0 p-4 border-r border-neutral-800 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                      <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{col.title}</h3>
                    </div>
                  ))}
                  <div className="w-[200px] flex-shrink-0 p-3 font-bold text-gold-500 text-center bg-neutral-800 border-l border-neutral-700 sticky right-0 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.5)] z-30 ml-auto">
                    THÔNG TIN
                  </div>
                </div>

                {/* Order Rows */}
                {(() => {
                  // Group items by OrderID
                  const orderGroups: Record<string, KanbanItem[]> = {};
                  filteredItems.forEach(item => {
                    if (!orderGroups[item.orderId]) orderGroups[item.orderId] = [];
                    orderGroups[item.orderId].push(item);
                  });

                  return Object.entries(orderGroups).map(([orderId, orderItems]) => {
                    const firstItem = orderItems[0];
                    return (
                      <div key={orderId} className="flex border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors group">
                        {/* Stage Columns */}
                        {columns.map(col => {
                          const itemsInStage = orderItems.filter(item => checkStatusMatch(item, col.id));
                          return (
                            <div
                              key={col.id}
                              className={`w-[280px] flex-shrink-0 p-3 border-r border-neutral-800 min-h-[150px] ${itemsInStage.length > 0 ? '' : 'bg-neutral-900/20'}`}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, col.id)}
                            >
                              {itemsInStage.map(item => renderCard(item))}
                            </div>
                          );
                        })}

                        {/* Order Info Column (Sticky Right) */}
                        <div className="w-[200px] flex-shrink-0 p-3 bg-neutral-900/95 border-l border-neutral-800 flex flex-col justify-center sticky right-0 z-10 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.5)] ml-auto">
                          <h3 className="text-xl font-serif font-bold text-gold-500 mb-1">#{orderId}</h3>
                          <p className="text-slate-300 font-medium text-lg mb-2">{firstItem.customerName}</p>

                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Calendar size={14} />
                              <span>Ngày hẹn: <span className="text-slate-300">{firstItem.expectedDelivery}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Briefcase size={14} />
                              <span>Tổng mục: <span className="text-slate-300">{orderItems.length}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            // STANDARD KANBAN VIEW
            <div className="flex h-full gap-6 min-w-[1200px] p-4 overflow-x-auto">
              {columns.map(col => {
                const colItems = filteredItems.filter(i => checkStatusMatch(i, col.id));

                return (
                  <div
                    key={col.id}
                    className="flex-1 flex flex-col bg-neutral-950/50 rounded-xl border border-neutral-800 shadow-sm min-w-[320px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    {/* Column Header */}
                    <div className="p-4 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 backdrop-blur rounded-t-xl sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                        <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{col.title}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="bg-neutral-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                          {colItems.length}
                        </span>
                        <button
                          onClick={() => setEditingStage({ stageId: col.id, stageName: col.title })}
                          className="p-1.5 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                          title="Chỉnh sửa tasks mặc định"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Column Body */}
                    <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${col.color}`}>
                      {colItems.map(item => renderCard(item))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Confirmation & Warning Modal */}
      {
        modalConfig.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-neutral-800">
              {/* Flashing Header */}
              <div className={`p-4 flex items-center gap-3 ${modalConfig.type === 'CANCEL' ? 'bg-red-900/20' : 'bg-orange-900/20'
                }`}>
                <div className={`p-2 rounded-full ${modalConfig.type === 'CANCEL' ? 'bg-red-900/40 text-red-500' : 'bg-orange-900/40 text-orange-500'
                  } animate-pulse`}>
                  {modalConfig.type === 'CANCEL' ? <AlertTriangle size={24} /> : <RotateCcw size={24} />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${modalConfig.type === 'CANCEL' ? 'text-red-500' : 'text-orange-500'
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
                    className={`w-full p-3 border rounded-lg focus:ring-1 outline-none text-sm bg-neutral-950 text-slate-200 ${modalConfig.type === 'CANCEL'
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
                    className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all text-sm ${modalConfig.type === 'CANCEL'
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
        )
      }

      {/* History Log Modal (Visual + Real Data Mix) */}
      {
        showHistory && (
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
                          <p className={`text-xs font-medium mb-1 ${log.type === 'danger' ? 'text-red-500' :
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
        )
      }


      {/* Edit Stage Tasks Modal */}
      {
        editingStage && (
          <EditStageTasksModal
            stageId={editingStage.stageId}
            stageName={editingStage.stageName}
            currentWorkflow={workflows.find(wf => wf.id === activeWorkflow)}
            onClose={() => setEditingStage(null)}
          />
        )
      }
    </div >
  );
};