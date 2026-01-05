import React, { useState, useRef, useEffect } from 'react';
import { Plus, GitMerge, MoreHorizontal, Settings, Layers, Building2, Package, X, Eye, Edit, Trash2, GripVertical, ArrowUp, ArrowDown, Columns, Users, CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import { MOCK_WORKFLOWS, MOCK_MEMBERS } from '../constants';
import { ServiceType, WorkflowDefinition, InventoryItem, WorkflowStage, WorkflowMaterial, Member, TodoStep } from '../types';
import { ref, set, remove, get, onValue, update } from 'firebase/database';
import { db, DB_PATHS } from '../firebase';
import { useAppStore } from '../context';

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
                     if (window.confirm(`Bạn có chắc chắn muốn xóa "${itemName}"?`)) {
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

// Helper to group workflows by department
const groupBy = <T, K extends keyof any>(list: T[], getKey: (item: T) => K) =>
   list.reduce((previous, currentItem) => {
      const group = getKey(currentItem);
      if (!previous[group]) previous[group] = [];
      previous[group].push(currentItem);
      return previous;
   }, {} as Record<K, T[]>);

// Helper to get department from member role
const getDepartmentFromRole = (role: Member['role']): string => {
   switch (role) {
      case 'Quản lý': return 'Quản Lý';
      case 'Kỹ thuật viên': return 'Kỹ Thuật';
      case 'QC': return 'QA/QC';
      case 'Tư vấn viên': return 'Kinh Doanh';
      default: return 'Khác';
   }
};

// Helper to get unique departments from members
const getDepartmentsFromMembers = (): string[] => {
   const departments = new Set<string>();
   MOCK_MEMBERS.forEach(member => {
      const dept = member.department || getDepartmentFromRole(member.role);
      if (dept && dept !== 'Khác') {
         departments.add(dept);
      }
   });
   // Add default departments if not found in members
   const defaultDepts = ['Kỹ Thuật', 'Spa', 'QA/QC', 'Hậu Cần', 'Quản Lý', 'Kinh Doanh'];
   defaultDepts.forEach(dept => departments.add(dept));
   return Array.from(departments).sort();
};

export const Workflows: React.FC = () => {
   const { inventory } = useAppStore();
   const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
   const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
   const [showAddModal, setShowAddModal] = useState(false);
   const [showViewModal, setShowViewModal] = useState(false);
   const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   // Load workflows from Firebase
   useEffect(() => {
      const loadWorkflows = async () => {
         try {
            const snapshot = await get(ref(db, DB_PATHS.WORKFLOWS));
            if (snapshot.exists()) {
               const data = snapshot.val();
               // Convert object to array and ensure all required fields
               const workflowsList: WorkflowDefinition[] = Object.keys(data).map(key => {
                  const wf = data[key] as any;
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
               // Nếu Firebase trống
               setWorkflows([]);
            }
         } catch (error) {
            console.error('Error loading workflows:', error);
            // Set empty array on error
            setWorkflows([]);
         } finally {
            setIsLoading(false);
         }
      };

      loadWorkflows();

      // Listen for real-time updates
      const workflowsRef = ref(db, DB_PATHS.WORKFLOWS);
      const unsubscribe = onValue(workflowsRef, (snapshot) => {
         try {
            if (snapshot.exists()) {
               const data = snapshot.val();
               // Convert object to array and ensure all required fields
               const workflowsList: WorkflowDefinition[] = Object.keys(data).map(key => {
                  const wf = data[key] as any;
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

   // Group workflows by department with explicit type
   const workflowsByDept = groupBy(workflows, (wf: WorkflowDefinition) => wf.department);

   const handleOpenConfig = (wf: WorkflowDefinition) => {
      setSelectedWorkflow(wf);
      setIsConfigModalOpen(true);
   };


   return (
      <div className="space-y-6">
         {/* Modal Tạo Quy Trình Mới */}
         {showAddModal && (
            <CreateWorkflowModal
               workflows={workflows}
               onClose={() => setShowAddModal(false)}
               onSuccess={() => {
                  // Workflows will be updated automatically via Firebase listener
               }}
            />
         )}

         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Quy Trình</h1>
               <p className="text-slate-500 mt-1">Thiết lập các luồng xử lý và định mức nguyên vật liệu.</p>
            </div>
            <button
               onClick={() => setShowAddModal(true)}
               className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
            >
               <Plus size={18} />
               <span>Tạo Quy Trình Mới</span>
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(workflowsByDept).map(([dept, workflows]) => (
               <div key={dept} className="bg-neutral-900/30 rounded-lg border border-neutral-800 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100 mb-2">
                     <Building2 size={16} className="text-gold-500" />
                     <span>Phòng {dept}</span>
                     <span className="text-[10px] font-normal text-slate-400 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded-full">{workflows.length}</span>
                  </h3>

                  <div className="space-y-1">
                     {workflows.map((wf) => (
                        <div key={wf.id} className="bg-neutral-900 px-2 py-1.5 rounded-md shadow-sm border border-neutral-800 flex gap-2 items-center hover:border-gold-900/30 transition-all">
                           <div className={`w-8 h-8 rounded flex items-center justify-center border flex-shrink-0 ${wf.color}`}>
                              <GitMerge size={14} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-1">
                                 <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <h3 className="font-semibold text-xs text-slate-100 truncate">{wf.label}</h3>
                                    <span className="text-[9px] font-mono text-slate-600 flex-shrink-0">{wf.id}</span>
                                    <span className="text-[9px] text-slate-400 bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700 flex-shrink-0">{wf.department}</span>
                                 </div>
                                 <ActionMenu
                                    itemName={wf.label}
                                    onView={() => {
                                       setSelectedWorkflow(wf);
                                       setShowViewModal(true);
                                    }}
                                    onEdit={() => {
                                       handleOpenConfig(wf);
                                    }}
                                    onDelete={async () => {
                                       if (window.confirm(`CẢNH BÁO: BẠN SẮP XÓA QUY TRÌNH "${wf.label}"\n\nHành động này sẽ:\n- Xóa vĩnh viễn quy trình này.\n- Gỡ bỏ quy trình khỏi tất cả Dịch vụ đang sử dụng.\n- HỦY (Cancel) tất cả các công việc đang chạy trên quy trình này.\n\nBạn có chắc chắn muốn tiếp tục?`)) {
                                          try {
                                             // 1. Fetch data necessary for cascade
                                             const [servicesSnap, ordersSnap] = await Promise.all([
                                                get(ref(db, DB_PATHS.SERVICES)),
                                                get(ref(db, DB_PATHS.ORDERS))
                                             ]);

                                             const updates: any = {};
                                             updates[`${DB_PATHS.WORKFLOWS}/${wf.id}`] = null; // Mark workflow for deletion

                                             // 2. Clean Services (Remove workflow reference)
                                             if (servicesSnap.exists()) {
                                                const services = servicesSnap.val();
                                                Object.keys(services).forEach(svcKey => {
                                                   const svc = services[svcKey];
                                                   if (svc.workflows && Array.isArray(svc.workflows)) {
                                                      const originalLen = svc.workflows.length;
                                                      const newWorkflows = svc.workflows.filter((w: any) => w.id !== wf.id);
                                                      if (newWorkflows.length !== originalLen) {
                                                         updates[`${DB_PATHS.SERVICES}/${svcKey}/workflows`] = newWorkflows;
                                                      }
                                                   }
                                                });
                                             }

                                             // 3. Cancel Active Orders/Tasks using this Workflow
                                             if (ordersSnap.exists()) {
                                                const orders = ordersSnap.val();
                                                Object.keys(orders).forEach(orderKey => {
                                                   const order = orders[orderKey];
                                                   if (order.items && Array.isArray(order.items)) {
                                                      let orderChanged = false;
                                                      const newItems = order.items.map((item: any) => {
                                                         // Check if active and uses this workflow
                                                         // We check item.workflowId if present, or if item.status matches stage IDs?
                                                         // Best to rely on workflowId if available, else fuzzy match stages.
                                                         // Assuming workflowId is populated on creation.
                                                         const isActive = item.status !== 'done' && item.status !== 'cancel';
                                                         const usesWorkflow = item.workflowId === wf.id;

                                                         if (isActive && usesWorkflow) {
                                                            orderChanged = true;
                                                            return {
                                                               ...item,
                                                               status: 'cancel',
                                                               cancelReason: `System: Quy trình gốc (${wf.label}) đã bị xóa.`,
                                                               history: [
                                                                  ...(item.history || []),
                                                                  {
                                                                     stageId: 'system',
                                                                     stageName: 'Hủy Tự Động',
                                                                     enteredAt: Date.now(),
                                                                     performedBy: 'System'
                                                                  }
                                                               ]
                                                            };
                                                         }
                                                         return item;
                                                      });

                                                      if (orderChanged) {
                                                         updates[`${DB_PATHS.ORDERS}/${orderKey}/items`] = newItems;
                                                      }
                                                   }
                                                });
                                             }

                                             // Execute atomic update
                                             await update(ref(db), updates);
                                             alert(`Đã xóa quy trình "${wf.label}" và cập nhật dữ liệu liên quan thành công!`);

                                          } catch (error: any) {
                                             console.error('Lỗi khi xóa quy trình:', error);
                                             const errorMessage = error?.message || String(error);
                                             alert('Lỗi khi xóa quy trình: ' + errorMessage);
                                          }
                                       }
                                    }}
                                 />
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-slate-500">
                                 <span>{wf.types.length > 0 ? wf.types.join(', ') : 'Tất cả'}</span>
                                 {wf.materials && wf.materials.length > 0 && (
                                    <span className="flex items-center gap-0.5"><Package size={9} />{wf.materials.length}</span>
                                 )}
                                 {wf.stages && wf.stages.length > 0 && (
                                    <span className="flex items-center gap-0.5"><Columns size={9} />{wf.stages.length}</span>
                                 )}
                                 <span className="text-slate-600">|</span>
                                 {wf.stages && wf.stages.length > 0 && (
                                    <span className="text-slate-400 truncate">
                                       {wf.stages.map((s, i) => `#${i + 1} ${s.name}`).join(' → ')}
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}

                     {/* Add New Placeholder */}
                     <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-neutral-900/50 rounded-md border border-dashed border-neutral-800 flex items-center justify-center py-1.5 text-slate-600 hover:border-gold-600/50 hover:text-gold-500 hover:bg-neutral-900 transition-colors text-xs"
                     >
                        <Plus size={20} className="mr-2" />
                        <span className="font-medium">Thêm quy trình {dept}</span>
                     </button>
                  </div>
               </div>
            ))}
         </div>

         {/* Configuration Modal */}
         {isConfigModalOpen && selectedWorkflow && (
            <WorkflowConfigModal
               workflow={selectedWorkflow}
               onClose={() => setIsConfigModalOpen(false)}
            />
         )}

         {/* View Modal */}
         {showViewModal && selectedWorkflow && (
            <WorkflowViewModal
               workflow={selectedWorkflow}
               onClose={() => {
                  setShowViewModal(false);
                  setSelectedWorkflow(null);
               }}
            />
         )}
      </div>
   );
};

// --- Sub-component: Stage Item ---
const StageItem: React.FC<{
   stage: WorkflowStage;
   idx: number;
   stages: WorkflowStage[];
   setStages: React.Dispatch<React.SetStateAction<WorkflowStage[]>>;
}> = ({ stage, idx, stages, setStages }) => {
   const [showTodoInput, setShowTodoInput] = useState(false);
   const [newTodoText, setNewTodoText] = useState('');
   const [newTodoNote, setNewTodoNote] = useState('');
   const [editingTodo, setEditingTodo] = useState<{ id: string, title: string, description: string } | null>(null);

   const stageTodos = stage.todos || [];

   const handleAddTodo = () => {
      if (!newTodoText.trim()) return;
      const newTodo: TodoStep = {
         id: `todo-${Date.now()}`,
         title: newTodoText,
         description: newTodoNote.trim(),
         completed: false,
         order: stageTodos.length
      };
      const updatedStages = stages.map(s =>
         s.id === stage.id
            ? { ...s, todos: [...(s.todos || []), newTodo] }
            : s
      );
      setStages(updatedStages);
      setNewTodoText('');
      setNewTodoNote('');
      setShowTodoInput(false);
   };

   const startEditing = (todo: TodoStep) => {
      setEditingTodo({
         id: todo.id,
         title: todo.title,
         description: todo.description || ''
      });
   };

   const saveEditing = () => {
      if (!editingTodo || !editingTodo.title.trim()) return;
      const updatedStages = stages.map(s =>
         s.id === stage.id
            ? {
               ...s, todos: (s.todos || []).map(t =>
                  t.id === editingTodo.id ? { ...t, title: editingTodo.title, description: editingTodo.description } : t
               )
            }
            : s
      );
      setStages(updatedStages);
      setEditingTodo(null);
   };

   return (
      <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
         {/* Header Row - Table-like */}
         <div className="grid grid-cols-12 gap-2 p-2 bg-neutral-800/50 items-center text-xs">
            <div className="col-span-1 flex items-center gap-1">
               <GripVertical size={14} className="text-slate-600 cursor-move" />
               <div className={`w-2 h-2 rounded-full ${stage.color || 'bg-slate-500'}`}></div>
            </div>
            <div className="col-span-2 font-medium text-slate-200">
               {idx + 1}. {stage.name}
            </div>
            <div className="col-span-3 text-slate-400">
               {stage.details || <span className="italic text-slate-600">Chưa có chi tiết</span>}
            </div>
            <div className="col-span-3 text-slate-400">
               {stage.standards || <span className="italic text-slate-600">Chưa có tiêu chuẩn</span>}
            </div>
            <div className="col-span-2 text-slate-500 text-center">
               {stageTodos.length > 0 && (
                  <span className="bg-neutral-700 px-2 py-0.5 rounded">
                     {stageTodos.filter(t => t.completed).length}/{stageTodos.length} task
                  </span>
               )}
            </div>
            <div className="col-span-1 flex items-center justify-end gap-1">
               {idx > 0 && (
                  <button
                     onClick={() => {
                        const newStages = [...stages];
                        [newStages[idx], newStages[idx - 1]] = [newStages[idx - 1], newStages[idx]];
                        newStages[idx].order = idx;
                        newStages[idx - 1].order = idx - 1;
                        setStages(newStages);
                     }}
                     className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển lên"
                  >
                     <ArrowUp size={12} />
                  </button>
               )}
               {idx < stages.length - 1 && (
                  <button
                     onClick={() => {
                        const newStages = [...stages];
                        [newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]];
                        newStages[idx].order = idx;
                        newStages[idx + 1].order = idx + 1;
                        setStages(newStages);
                     }}
                     className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển xuống"
                  >
                     <ArrowDown size={12} />
                  </button>
               )}
               <button
                  onClick={() => {
                     if (window.confirm(`Xóa bước "${stage.name}"?`)) {
                        setStages(stages.filter(s => s.id !== stage.id).map((s, i) => ({ ...s, order: i })));
                     }
                  }}
                  className="p-1 hover:bg-neutral-700 rounded text-slate-500 hover:text-red-500"
               >
                  <X size={12} />
               </button>
            </div>
         </div>

         {/* Tasks Section */}
         <div className="p-2 pt-0">
            <div className="flex items-center justify-between mb-1 mt-2">
               <p className="text-[10px] font-medium text-slate-500 uppercase">Các task con</p>
               <button
                  onClick={() => setShowTodoInput(!showTodoInput)}
                  className="text-[10px] px-1.5 py-0.5 bg-gold-600/20 hover:bg-gold-600/30 text-gold-400 rounded flex items-center gap-1 transition-colors"
               >
                  <Plus size={10} />
                  Thêm
               </button>
            </div>

            {showTodoInput && (
               <div className="flex flex-col gap-2 mb-2 p-2 bg-neutral-800 rounded border border-neutral-700 animate-in fade-in zoom-in-95 duration-100">
                  <input
                     type="text"
                     value={newTodoText}
                     onChange={(e) => setNewTodoText(e.target.value)}
                     onKeyPress={(e) => {
                        if (e.key === 'Enter' && newTodoText.trim()) {
                           // Focus note
                           const noteInput = document.getElementById(`new-note-${stage.id}`);
                           if (noteInput) noteInput.focus();
                        }
                     }}
                     placeholder="Tên task..."
                     className="w-full px-2 py-1 text-[11px] border border-neutral-600 rounded bg-neutral-900 text-slate-200 outline-none focus:border-gold-500"
                     autoFocus
                  />
                  <div className="flex gap-2">
                     <input
                        id={`new-note-${stage.id}`}
                        type="text"
                        value={newTodoNote}
                        onChange={(e) => setNewTodoNote(e.target.value)}
                        onKeyPress={(e) => {
                           if (e.key === 'Enter') handleAddTodo();
                        }}
                        placeholder="Ghi chú (tùy chọn)..."
                        className="flex-1 px-2 py-1 text-[11px] border border-neutral-600 rounded bg-neutral-900 text-slate-200 outline-none focus:border-gold-500"
                     />
                     <button
                        onClick={handleAddTodo}
                        className="px-2 py-1 bg-gold-600 hover:bg-gold-700 text-black rounded text-[11px] font-medium transition-colors"
                     >
                        OK
                     </button>
                  </div>
               </div>
            )}

            {stageTodos.length === 0 ? (
               <p className="text-[10px] text-slate-600 italic py-1">Chưa có task</p>
            ) : (
               <div className="space-y-1">
                  {stageTodos.map(todo => (
                     <div key={todo.id} className="bg-neutral-800/30 rounded border border-neutral-800 p-1.5">
                        <div className="flex items-start gap-1.5 text-[11px]">
                           <button
                              onClick={() => {
                                 const updatedStages = stages.map(s =>
                                    s.id === stage.id
                                       ? {
                                          ...s, todos: (s.todos || []).map(t =>
                                             t.id === todo.id ? { ...t, completed: !t.completed } : t
                                          )
                                       }
                                       : s
                                 );
                                 setStages(updatedStages);
                              }}
                              className="flex-shrink-0 mt-0.5"
                           >
                              {todo.completed ? (
                                 <CheckCircle2 size={12} className="text-emerald-500" />
                              ) : (
                                 <Circle size={12} className="text-slate-600" />
                              )}
                           </button>

                           {/* Edit Form or Display */}
                           {editingTodo && editingTodo.id === todo.id ? (
                              <div className="flex-1 space-y-1">
                                 <input
                                    value={editingTodo.title}
                                    onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                                    className="w-full px-1.5 py-0.5 text-[11px] border border-neutral-600 rounded bg-neutral-900 text-slate-200 focus:border-gold-500 outline-none"
                                    autoFocus
                                 />
                                 <div className="flex gap-1">
                                    <input
                                       value={editingTodo.description}
                                       onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                                       className="flex-1 px-1.5 py-0.5 text-[10px] border border-neutral-600 rounded bg-neutral-900 text-slate-300 focus:border-gold-500 outline-none"
                                       placeholder="Ghi chú..."
                                       onKeyDown={e => { if (e.key === 'Enter') saveEditing() }}
                                    />
                                    <button onClick={saveEditing} className="px-1.5 bg-gold-600 text-[10px] text-black rounded">Lưu</button>
                                    <button onClick={() => setEditingTodo(null)} className="px-1.5 bg-neutral-700 text-[10px] text-slate-300 rounded">Hủy</button>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex-1 group" onClick={() => startEditing(todo)} title="Nhấn để sửa">
                                 <div className="flex justify-between items-start">
                                    <span className={`${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'} hover:text-gold-400 cursor-pointer`}>
                                       {todo.title}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                       <button
                                          onClick={(e) => { e.stopPropagation(); startEditing(todo); }}
                                          className="text-slate-600 hover:text-blue-400 transition-colors"
                                       >
                                          <Edit size={10} />
                                       </button>
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             const updatedStages = stages.map(s =>
                                                s.id === stage.id
                                                   ? { ...s, todos: (s.todos || []).filter(t => t.id !== todo.id).map((t, i) => ({ ...t, order: i })) }
                                                   : s
                                             );
                                             setStages(updatedStages);
                                          }}
                                          className="text-slate-600 hover:text-red-500 transition-colors"
                                       >
                                          <X size={10} />
                                       </button>
                                    </div>
                                 </div>
                                 {todo.description && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">{todo.description}</div>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
};

// --- Sub-component: Create Workflow Modal (Simplified) ---
const CreateWorkflowModal: React.FC<{ workflows: WorkflowDefinition[]; onClose: () => void; onSuccess?: () => void }> = ({ workflows, onClose, onSuccess }) => {
   const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
   const [newWorkflowName, setNewWorkflowName] = useState('');
   const [isCreatingNew, setIsCreatingNew] = useState(true);
   const [taskDetail, setTaskDetail] = useState('');
   const [note, setNote] = useState('');
   const [tasks, setTasks] = useState<Array<{ detail: string; note: string }>>([]);
   const [showTaskModal, setShowTaskModal] = useState(false);

   // Tự động tạo ID từ tên quy trình
   const generateWorkflowId = (label: string): string => {
      if (!label) return '';
      return label
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .toUpperCase()
         .replace(/[^A-Z0-9]/g, '_')
         .replace(/_+/g, '_')
         .replace(/^_|_$/g, '');
   };

   const handleOpenTaskModal = () => {
      setShowTaskModal(true);
   };

   const handleCloseTaskModal = () => {
      setShowTaskModal(false);
      setTaskDetail('');
      setNote('');
   };

   const handleAddTask = async () => {
      if (!taskDetail.trim()) return;
      
      if (!isCreatingNew) {
         // Chế độ "Chọn quy trình" - Lưu ngay vào Firebase
         if (!selectedWorkflowId) {
            alert('Vui lòng chọn quy trình!');
            return;
         }

         try {
            const workflow = workflows.find(w => w.id === selectedWorkflowId);
            if (!workflow) {
               alert('Không tìm thấy quy trình!');
               return;
            }

            const existingStages = workflow.stages || [];
            const newStage: WorkflowStage = {
               id: `stage-${Date.now()}`,
               name: taskDetail,
               order: existingStages.length,
               details: note || undefined
            };

            await set(ref(db, `${DB_PATHS.WORKFLOWS}/${selectedWorkflowId}/stages`), [
               ...existingStages,
               newStage
            ]);

            alert('Thêm task thành công!');
            setTaskDetail('');
            setNote('');
            setShowTaskModal(false);
            
            if (onSuccess) onSuccess();
         } catch (error: any) {
            console.error('Lỗi khi thêm task:', error);
            alert('Lỗi: ' + (error?.message || String(error)));
         }
      } else {
         // Chế độ "Tạo mới" - Thêm vào mảng local
         setTasks([...tasks, { detail: taskDetail, note: note }]);
         setTaskDetail('');
         setNote('');
         setShowTaskModal(false);
      }
   };

   const handleRemoveTask = (index: number) => {
      setTasks(tasks.filter((_, i) => i !== index));
   };

   const handleCreate = async () => {
      try {
         if (isCreatingNew) {
            // Tạo quy trình mới
            if (!newWorkflowName.trim()) {
         alert('Vui lòng nhập tên quy trình!');
         return;
      }

            const workflowId = generateWorkflowId(newWorkflowName);
            if (!workflowId) {
         alert('Không thể tạo ID từ tên quy trình. Vui lòng nhập tên hợp lệ!');
         return;
      }

            // Convert tasks to stages
            if (tasks.length === 0) {
               alert('Vui lòng thêm ít nhất một task!');
               return;
            }

            const stages: WorkflowStage[] = tasks.map((task, idx) => ({
               id: `stage-${idx + 1}`,
               name: task.detail,
               order: idx,
               details: task.note || undefined
            }));

         const newWorkflow: any = {
               id: workflowId,
               label: newWorkflowName,
               description: '',
               department: 'Kỹ Thuật',
               types: [],
               color: 'bg-blue-900/30 text-blue-400 border-blue-800',
               stages: stages
            };

            await set(ref(db, `${DB_PATHS.WORKFLOWS}/${workflowId}`), newWorkflow);
            alert('Tạo quy trình thành công!');
         } else {
            // Chế độ "Chọn quy trình" - Chỉ đóng modal (task đã được lưu trong handleAddTask)
            // Không cần làm gì thêm
         }

         // Reset form
         setNewWorkflowName('');
         setSelectedWorkflowId('');
         setTaskDetail('');
         setNote('');
         setTasks([]);
         setIsCreatingNew(true);

         if (onSuccess) onSuccess();
         onClose();
      } catch (error: any) {
         console.error('Lỗi:', error);
         alert('Lỗi: ' + (error?.message || String(error)));
      }
   };

   return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
               <div>
                  <h3 className="font-bold text-lg text-slate-100">Tạo Quy Trình Mới</h3>
                  <p className="text-xs text-slate-500">Thêm quy trình và task</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="p-6 space-y-4">
               {/* Workflow Selection */}
               <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Quy trình</label>
                  <div className="flex gap-2 mb-2">
                     <button
                        onClick={() => setIsCreatingNew(true)}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                           isCreatingNew
                              ? 'bg-gold-600 text-black'
                              : 'bg-neutral-800 text-slate-400 hover:bg-neutral-700'
                        }`}
                     >
                        Tạo mới
                     </button>
                     <button
                        onClick={() => setIsCreatingNew(false)}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                           !isCreatingNew
                              ? 'bg-gold-600 text-black'
                              : 'bg-neutral-800 text-slate-400 hover:bg-neutral-700'
                        }`}
                     >
                        Chọn quy trình
                     </button>
                     </div>
                  {isCreatingNew && (
                        <input
                           type="text"
                        value={newWorkflowName}
                        onChange={(e) => setNewWorkflowName(e.target.value)}
                        placeholder="Nhập tên quy trình mới"
                           className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                        />
                  )}
                     </div>

               {/* Add Task Button */}
               <div>
                  <button
                     onClick={handleOpenTaskModal}
                     className="w-full py-2 bg-gold-600 hover:bg-gold-700 text-black rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                     <Plus size={16} />
                     Thêm Task
                  </button>
                     </div>

               {/* Task Modal/Popup */}
               {showTaskModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                     <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md border border-neutral-800">
                        <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
                           <h3 className="font-bold text-lg text-slate-100">Thêm Task</h3>
                                       <button
                              onClick={handleCloseTaskModal}
                              className="p-1 hover:bg-neutral-800 rounded-full transition-colors text-slate-400"
                                       >
                              <X size={20} />
                                       </button>
               </div>

                        <div className="p-6 space-y-4">
                           {/* Workflow Selection in Task Modal */}
                           {!isCreatingNew && (
               <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Chọn quy trình <span className="text-red-500">*</span></label>
                           <select
                                    value={selectedWorkflowId}
                                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                                    className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 >
                                    <option value="">-- Chọn quy trình --</option>
                                    {workflows.map((wf) => (
                                       <option key={wf.id} value={wf.id}>
                                          {wf.label}
                                       </option>
                                    ))}
                           </select>
                        </div>
                           )}
                        <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Task chi tiết <span className="text-red-500">*</span></label>
                           <input
                              type="text"
                                 value={taskDetail}
                                 onChange={(e) => setTaskDetail(e.target.value)}
                                 placeholder="Nhập chi tiết task"
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 autoFocus
                           />
                        </div>
                        <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Ghi chú</label>
                              <textarea
                                 value={note}
                                 onChange={(e) => setNote(e.target.value)}
                                 placeholder="Nhập ghi chú (tùy chọn)"
                                 rows={3}
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200 resize-none"
                           />
                        </div>
                     </div>

                        <div className="p-5 border-t border-neutral-800 flex justify-end gap-3">
                     <button
                              onClick={handleCloseTaskModal}
                              className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium"
                           >
                              Hủy
                     </button>
                           <button
                              onClick={handleAddTask}
                              disabled={!taskDetail.trim() || (!isCreatingNew && !selectedWorkflowId)}
                              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-800 disabled:text-slate-500 text-black rounded-lg text-sm font-medium transition-colors"
                           >
                              Thêm
                           </button>
                              </div>
                           </div>
                        </div>
                     )}

               {/* Task List */}
               {tasks.length > 0 && (
                  <div className="space-y-2">
                     <label className="text-xs font-medium text-slate-500 block">Danh sách task</label>
                     <div className="space-y-2 max-h-48 overflow-y-auto">
                        {tasks.map((task, idx) => (
                           <div
                              key={idx}
                              className="p-3 bg-neutral-800/50 rounded border border-neutral-700 flex items-start justify-between gap-2"
                           >
                              <div className="flex-1">
                                 <div className="text-sm font-medium text-slate-200">{task.detail}</div>
                                 {task.note && (
                                    <div className="text-xs text-slate-400 mt-1">{task.note}</div>
                                 )}
                                 </div>
                                 <button
                                 onClick={() => handleRemoveTask(idx)}
                                    className="text-slate-500 hover:text-red-500 p-1"
                                 >
                                    <X size={16} />
                                 </button>
                              </div>
                        ))}
                           </div>
                  </div>
               )}
            </div>

            <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium">
                  {isCreatingNew ? 'Hủy' : 'Đóng'}
               </button>
               {isCreatingNew && (
               <button
                     onClick={handleCreate}
                     disabled={tasks.length === 0}
                     className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-800 disabled:text-slate-500 text-black rounded-lg text-sm font-medium shadow-lg shadow-gold-900/20"
               >
                     Tạo
               </button>
               )}
            </div>
         </div>
      </div>
   );
};

// --- Sub-component: Stage Item with Todo Steps ---
const StageItemWithTodos: React.FC<{
   stage: WorkflowStage;
   idx: number;
   totalStages: number;
   onMoveUp: () => void;
   onMoveDown: () => void;
   onDelete: () => void;
   onUpdate: (stage: WorkflowStage) => void;
   autoExpand?: boolean;
}> = ({ stage, idx, totalStages, onMoveUp, onMoveDown, onDelete, onUpdate, autoExpand = false }) => {
   const [isExpanded, setIsExpanded] = useState(autoExpand);
   const [newTodoTitle, setNewTodoTitle] = useState('');
   const [newTodoNote, setNewTodoNote] = useState('');

   // Edit State
   const [editingTodo, setEditingTodo] = useState<{ id: string, title: string, description: string } | null>(null);
   const [isEditingStage, setIsEditingStage] = useState(false);
   const [editStageName, setEditStageName] = useState(stage.name);
   const [editStageDetails, setEditStageDetails] = useState(stage.details || '');

   const [todos, setTodos] = useState<TodoStep[]>(stage.todos || []);

   // Sync todos from props
   useEffect(() => {
      setTodos(stage.todos || []);
   }, [stage.todos]);

   // Auto expand when autoExpand is true
   useEffect(() => {
      if (autoExpand) {
         setIsExpanded(true);
      }
   }, [autoExpand]);

   // Auto expand when autoExpand is true
   useEffect(() => {
      if (autoExpand) {
         setIsExpanded(true);
      }
   }, [autoExpand]);

   // Sync stage data when editing
   useEffect(() => {
      if (!isEditingStage) {
         setEditStageName(stage.name);
         setEditStageDetails(stage.details || '');
      }
   }, [stage, isEditingStage]);

   const handleSaveStageEdit = () => {
      if (!editStageName.trim()) {
         alert('Vui lòng nhập tên stage!');
         return;
      }
      onUpdate({
         ...stage,
         name: editStageName.trim(),
         details: editStageDetails.trim() || undefined
      });
      setIsEditingStage(false);
   };

   const handleCancelStageEdit = () => {
      setEditStageName(stage.name);
      setEditStageDetails(stage.details || '');
      setIsEditingStage(false);
   };

   const handleAddTodo = () => {
      if (!newTodoTitle.trim()) return;
      const newTodo: TodoStep = {
         id: `todo-${Date.now()}`,
         title: newTodoTitle,
         description: newTodoNote.trim(),
         completed: false,
         order: todos.length
      };
      const updatedTodos = [...todos, newTodo];
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
      setNewTodoTitle('');
      setNewTodoNote('');
   };

   const startEditing = (todo: TodoStep) => {
      setEditingTodo({
         id: todo.id,
         title: todo.title,
         description: todo.description || ''
      });
   };

   const saveEditing = () => {
      if (!editingTodo || !editingTodo.title.trim()) return;
      const updatedTodos = todos.map(t =>
         t.id === editingTodo.id
            ? { ...t, title: editingTodo.title, description: editingTodo.description }
            : t
      );
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
      setEditingTodo(null);
   };

   const handleToggleTodo = (todoId: string) => {
      const updatedTodos = todos.map(t =>
         t.id === todoId ? { ...t, completed: !t.completed } : t
      );
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
   };

   const handleRemoveTodo = (todoId: string) => {
      const updatedTodos = todos.filter(t => t.id !== todoId).map((t, i) => ({ ...t, order: i }));
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
   };

   const completedCount = todos.filter(t => t.completed).length;

   return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm overflow-hidden w-80 flex-shrink-0">
         <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 flex-1">
               <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-neutral-800 rounded transition-colors text-slate-500"
               >
                  <Plus size={16} className={`transform transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
               </button>
               <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-slate-600 cursor-move" />
                  <div className={`w-3 h-3 rounded-full ${stage.color || 'bg-slate-500'}`}></div>
               </div>
               <div className="flex-1">
                  <h5 className="font-medium text-sm text-slate-200">{stage.name}</h5>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                     <span>Thứ tự: {idx + 1}</span>
                     {todos.length > 0 && (
                        <span className="bg-neutral-800 px-2 py-0.5 rounded">
                           {completedCount}/{todos.length} todo
                        </span>
                     )}
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button
                  onClick={() => setIsExpanded(true)}
                  className="text-xs px-2 py-1 bg-gold-600/20 hover:bg-gold-600/30 text-gold-400 rounded flex items-center gap-1 transition-colors"
                  title="Thêm task cho bước này"
               >
                  <Plus size={12} />
                  Task
               </button>
               {!isEditingStage && (
                  <button
                     onClick={() => setIsEditingStage(true)}
                     className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                     title="Sửa thông tin"
                  >
                     <Edit size={14} />
                  </button>
               )}
               {idx > 0 && (
                  <button
                     onClick={onMoveUp}
                     className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển lên"
                  >
                     <ArrowUp size={14} />
                  </button>
               )}
               {idx < totalStages - 1 && (
                  <button
                     onClick={onMoveDown}
                     className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                     title="Di chuyển xuống"
                  >
                     <ArrowDown size={14} />
                  </button>
               )}
               <button
                  onClick={onDelete}
                  className="text-slate-500 hover:text-red-500 p-1"
               >
                  <X size={16} />
               </button>
            </div>
         </div>

         {/* Stage Details and Standards - Inline */}
         <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-900/30">
            {isEditingStage ? (
               <div className="space-y-3">
                  <div>
                     <label className="text-xs font-medium text-slate-400 mb-1 block">Tên:</label>
                     <input
                        type="text"
                        value={editStageName}
                        onChange={(e) => setEditStageName(e.target.value)}
                        className="w-full px-2 py-1.5 border border-neutral-700 rounded text-sm bg-neutral-800 text-slate-200 outline-none focus:border-gold-500"
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className="text-xs font-medium text-slate-400 mb-1 block">Nội dung:</label>
                     <textarea
                        value={editStageDetails}
                        onChange={(e) => setEditStageDetails(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1.5 border border-neutral-700 rounded text-sm bg-neutral-800 text-slate-200 outline-none focus:border-gold-500 resize-none"
                        placeholder="Nhập nội dung (tùy chọn)..."
                     />
                  </div>
                  <div className="flex justify-end gap-2">
                     <button
                        onClick={handleCancelStageEdit}
                        className="px-3 py-1.5 border border-neutral-700 rounded text-xs text-slate-400 hover:bg-neutral-800 transition-colors"
                     >
                        Hủy
                     </button>
                     <button
                        onClick={handleSaveStageEdit}
                        className="px-3 py-1.5 bg-gold-600 hover:bg-gold-700 text-black rounded text-xs font-medium transition-colors"
                     >
                        Lưu
                     </button>
                  </div>
               </div>
            ) : (
            <div className="flex items-start gap-4 text-xs">
               <div className="flex-shrink-0">
                  <span className="font-medium text-slate-400">Tên:</span>
                  <span className="ml-1 text-slate-300">{stage.name}</span>
               </div>
               {stage.details && (
                  <div className="flex-1">
                     <span className="font-medium text-slate-400">Nội dung:</span>
                     <span className="ml-1 text-slate-300">{stage.details}</span>
                  </div>
               )}
               {stage.standards && (
                  <div className="flex-1">
                     <span className="font-medium text-slate-400">Tiêu chuẩn:</span>
                     <span className="ml-1 text-slate-300">{stage.standards}</span>
                  </div>
               )}
            </div>
            )}
         </div>

         {/* Show todos preview always */}
         {todos.length > 0 && (
            <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-900/50">
               <div className="space-y-1 max-h-24 overflow-y-auto">
                  {todos.slice(0, 3).map((todo) => (
                     <div key={todo.id} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                        <span className="text-slate-300 truncate">
                           {todo.title}
                        </span>
                     </div>
                  ))}
                  {todos.length > 3 && (
                     <div className="text-xs text-slate-500 italic px-1">
                        +{todos.length - 3} công việc khác...
                     </div>
                  )}
               </div>
            </div>
         )}

         {isExpanded && (
            <div className="border-t border-neutral-800 p-4 bg-neutral-900/50 space-y-3">
               {/* Add Todo Form */}
               <div className="space-y-2">
                  <div className="flex gap-2">
                     <input
                        type="text"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        onKeyPress={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                              handleAddTodo();
                           }
                        }}
                        placeholder="Thêm task..."
                        className="flex-1 px-3 py-1.5 border border-neutral-700 rounded text-xs bg-neutral-800 text-slate-200 outline-none focus:border-gold-500"
                     />
                     <input
                        type="text"
                        value={newTodoNote}
                        onChange={(e) => setNewTodoNote(e.target.value)}
                        placeholder="Ghi chú..."
                        className="flex-1 px-3 py-1.5 border border-neutral-700 rounded text-xs bg-neutral-800 text-slate-200 outline-none focus:border-gold-500"
                     />
                     <button
                        onClick={handleAddTodo}
                        disabled={!newTodoTitle.trim()}
                        className="px-3 py-1.5 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-700 text-black rounded text-xs font-medium transition-colors"
                     >
                        +
                     </button>
                  </div>
               </div>

               {/* Todo List - Horizontal Scroll */}
               <div className="overflow-x-auto pb-2">
                  <div className="flex gap-2 min-w-max">
                     {todos.length === 0 ? (
                        <div className="text-center py-3 px-4 text-slate-600 text-xs border border-dashed border-neutral-700 rounded whitespace-nowrap">
                           Chưa có bước nhỏ nào. Thêm các chi tiết công việc ở đây.
                        </div>
                     ) : (
                        todos.map((todo) => (
                        <div key={todo.id} className="bg-neutral-800/50 rounded border border-neutral-700/50 hover:border-neutral-700 transition-colors w-64 flex-shrink-0">
                           <div className="flex items-start gap-2 p-2 relative">
                              {/* BulletPoint */}
                              <div className="flex-shrink-0 self-start mt-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              </div>

                              {/* Content or Edit Form */}
                              {editingTodo && editingTodo.id === todo.id ? (
                                 <div className="flex-1 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    {/* Edit Title */}
                                    <div>
                                       <input
                                          value={editingTodo.title}
                                          onChange={e => setEditingTodo({ ...editingTodo, title: e.target.value })}
                                          className="w-full px-2 py-1.5 text-sm font-medium border border-neutral-600 rounded bg-neutral-900 text-slate-200 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-500"
                                          autoFocus
                                          placeholder="Tên công việc..."
                                          onKeyDown={e => {
                                             if (e.key === 'Enter') {
                                                // Focus next input or save
                                                const descInput = document.getElementById(`edit-desc-${todo.id}`);
                                                if (descInput) descInput.focus();
                                             }
                                          }}
                                       />
                                    </div>
                                    {/* Edit Description & Buttons */}
                                    <div className="flex gap-2">
                                       <input
                                          id={`edit-desc-${todo.id}`}
                                          value={editingTodo.description}
                                          onChange={e => setEditingTodo({ ...editingTodo, description: e.target.value })}
                                          className="flex-1 px-2 py-1.5 text-xs border border-neutral-700 rounded bg-neutral-900 text-slate-300 focus:border-gold-500 outline-none placeholder-slate-600"
                                          placeholder="Ghi chú (tùy chọn)..."
                                          onKeyDown={e => {
                                             if (e.key === 'Enter') saveEditing();
                                          }}
                                       />
                                       <div className="flex gap-1">
                                          <button
                                             onClick={saveEditing}
                                             className="px-3 py-1.5 bg-gold-600 text-black text-xs font-bold rounded hover:bg-gold-700 transition-colors flex items-center gap-1"
                                             title="Lưu thay đổi"
                                          >
                                             Lưu
                                          </button>
                                          <button
                                             onClick={() => setEditingTodo(null)}
                                             className="px-3 py-1.5 bg-neutral-700 text-slate-300 text-xs font-medium rounded hover:bg-neutral-600 transition-colors"
                                             title="Hủy bỏ"
                                          >
                                             Hủy
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex-1 group" onClick={() => startEditing(todo)} title="Nhấn để sửa">
                                    <div className="flex justify-between items-start">
                                       <span className={`text-sm font-medium transition-colors ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300 group-hover:text-gold-400 cursor-pointer'}`}>
                                          {todo.title}
                                       </span>
                                       <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                          <button
                                             onClick={(e) => { e.stopPropagation(); startEditing(todo); }}
                                             className="text-slate-600 hover:text-blue-400 p-1 transition-colors"
                                             title="Sửa công việc"
                                          >
                                             <Edit size={14} />
                                          </button>
                                          <button
                                             onClick={(e) => { e.stopPropagation(); handleRemoveTodo(todo.id); }}
                                             className="text-slate-600 hover:text-red-500 p-1 transition-colors"
                                             title="Xóa công việc"
                                          >
                                             <X size={14} />
                                          </button>
                                       </div>
                                    </div>
                                    {todo.description && (
                                       <span className="text-xs text-slate-500 block mt-0.5 group-hover:text-slate-400">{todo.description}</span>
                                    )}
                                 </div>
                              )}
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

// --- Sub-component: View Workflow Modal (Read-only with task management) ---
const WorkflowViewModal: React.FC<{ workflow: WorkflowDefinition, onClose: () => void }> = ({ workflow, onClose }) => {
   const [stages, setStages] = useState<WorkflowStage[]>(workflow.stages || []);

   const handleUpdateStage = async (updatedStage: WorkflowStage) => {
      const updatedStages = stages.map(s => s.id === updatedStage.id ? updatedStage : s);
      setStages(updatedStages);

      // Save to Firebase
      try {
         await set(ref(db, `${DB_PATHS.WORKFLOWS}/${workflow.id}/stages`), updatedStages);
      } catch (error) {
         console.error('Error saving stage:', error);
      }
   };

   return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
               <div>
                  <h2 className="text-xl font-serif font-bold text-slate-100">{workflow.label}</h2>
                  <p className="text-sm text-slate-400 mt-1">{workflow.description || 'Xem chi tiết quy trình'}</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* General Info */}
               <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                        <span className="text-slate-500">ID:</span>
                        <span className="ml-2 font-mono text-slate-300">{workflow.id}</span>
                     </div>
                     <div>
                        <span className="text-slate-500">Phòng ban:</span>
                        <span className="ml-2 text-slate-300">{workflow.department}</span>
                     </div>
                     <div className="col-span-2">
                        <span className="text-slate-500">Áp dụng cho:</span>
                        <span className="ml-2 text-slate-300">{workflow.types.length > 0 ? workflow.types.join(', ') : 'Tất cả dịch vụ'}</span>
                     </div>
                  </div>
               </div>

               {/* Materials */}
               {workflow.materials && workflow.materials.length > 0 && (
                  <div>
                     <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-gold-500" />
                        Nguyên Vật Liệu ({workflow.materials.length})
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {workflow.materials.map((mat, idx) => {
                           const item = (inventory || []).find(inv => inv.id === mat.itemId || inv.id === mat.inventoryItemId);
                           return (
                              <div key={idx} className="bg-neutral-800/30 p-3 rounded-lg border border-neutral-800">
                                 <div className="flex justify-between items-start">
                                    <span className="text-sm text-slate-300 font-medium">{item?.name || mat.itemId}</span>
                                    <span className="text-xs text-slate-500">{mat.quantity.toLocaleString('vi-VN')} {item?.unit || ''}</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}

               {/* Stages with Tasks */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Columns size={18} className="text-gold-500" />
                     Các Bước Xử Lý ({stages.length})
                  </h4>

                  {stages.length === 0 ? (
                     <div className="text-center py-8 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                        Chưa có bước nào được cấu hình
                     </div>
                  ) : (
                     <div className="space-y-3">
                        {stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                           <StageItemWithTodos
                              key={stage.id}
                              stage={stage}
                              idx={idx}
                              totalStages={stages.length}
                              onMoveUp={() => { }}
                              onMoveDown={() => { }}
                              onDelete={() => { }}
                              onUpdate={handleUpdateStage}
                           />
                        ))}
                     </div>
                  )}
               </div>

               {/* Assigned Members */}
               {workflow.assignedMembers && workflow.assignedMembers.length > 0 && (
                  <div>
                     <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                        <Users size={18} className="text-gold-500" />
                        Nhân Sự Phụ Trách ({workflow.assignedMembers.length})
                     </h4>
                     <div className="flex flex-wrap gap-2">
                        {workflow.assignedMembers.map(memberId => {
                           const member = MOCK_MEMBERS.find(m => m.id === memberId);
                           if (!member) return null;
                           return (
                              <div
                                 key={memberId}
                                 className="px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg"
                              >
                                 <div className="text-sm font-medium text-slate-200">{member.name}</div>
                                 <div className="text-xs text-slate-500">{member.role}</div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </div>

            <div className="border-t border-neutral-800 p-4">
               <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 rounded-lg font-medium transition-colors"
               >
                  Đóng
               </button>
            </div>
         </div>
      </div>
   );
};

// --- Sub-component: Config Modal ---
const WorkflowConfigModal: React.FC<{ workflow: WorkflowDefinition, onClose: () => void }> = ({ workflow, onClose }) => {
   const { inventory } = useAppStore();
   const [materials, setMaterials] = useState(workflow.materials || []);
   const [selectedInventoryId, setSelectedInventoryId] = useState('');
   const [quantity, setQuantity] = useState('');
   const [stages, setStages] = useState<WorkflowStage[]>(workflow.stages || []);
   const [newStageName, setNewStageName] = useState('');
   const [newStageColor, setNewStageColor] = useState('bg-slate-500');
   const [newlyAddedStageId, setNewlyAddedStageId] = useState<string | null>(null);
   const [assignedMembers, setAssignedMembers] = useState<string[]>(workflow.assignedMembers || []);
   const [memberSearchText, setMemberSearchText] = useState('');
   const [workflowDepartment, setWorkflowDepartment] = useState<WorkflowDefinition['department']>(workflow.department);
   const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
   const memberDropdownRef = useRef<HTMLDivElement>(null);
   const [isCreatingNewStage, setIsCreatingNewStage] = useState(true);
   const [selectedStageId, setSelectedStageId] = useState<string>('');
   const [showAddTaskForm, setShowAddTaskForm] = useState(false);
   const [newTaskTitle, setNewTaskTitle] = useState('');
   const [newTaskDescription, setNewTaskDescription] = useState('');

   // Helper to find inventory details
   const getInventoryItem = (id: string) => (inventory || []).find(i => i.id === id);

   // Close member dropdown when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
            setIsMemberDropdownOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const handleAddMaterial = () => {
      if (!selectedInventoryId || !quantity) return;

      const newItem = {
         inventoryItemId: selectedInventoryId,
         quantity: parseFloat(quantity)
      };

      setMaterials([...materials, newItem]);
      setSelectedInventoryId('');
      setQuantity('');
   };

   const handleRemoveMaterial = (index: number) => {
      const newMaterials = [...materials];
      newMaterials.splice(index, 1);
      setMaterials(newMaterials);
   };

   return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
               <div>
                  <h3 className="font-bold text-lg text-slate-100">Cấu Hình Quy Trình</h3>
                  <p className="text-xs text-slate-500">{workflow.label}</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
               <div className="space-y-6">
                  {/* Hàng 1: 2 Cột - General Info + Nhân Sự và Vật Tư */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Cột 1: General Info + Nhân Sự Phụ Trách */}
                     <div className="space-y-6">
               {/* 1. General Info */}
               <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30 text-sm space-y-3">
                  <div>
                     <label className="text-xs font-medium text-slate-500 mb-1 block">Phòng ban</label>
                     <select
                        value={workflowDepartment}
                        onChange={(e) => {
                           const dept = e.target.value as WorkflowDefinition['department'];
                           setWorkflowDepartment(dept);
                           // Lọc nhân sự theo phòng ban mới
                           const membersInDept = MOCK_MEMBERS.filter(m => {
                              const memberDept = m.department || getDepartmentFromRole(m.role);
                              return memberDept === dept;
                           });
                           // Cập nhật assignedMembers chỉ giữ lại những người thuộc phòng ban mới
                           setAssignedMembers(prev => prev.filter(id =>
                              membersInDept.some(m => m.id === id)
                           ));
                        }}
                        className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                     >
                        {getDepartmentsFromMembers().map(dept => (
                           <option key={dept} value={dept}>{dept}</option>
                        ))}
                     </select>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-slate-500">Áp dụng cho:</span>
                     <span className="font-medium text-slate-200">{workflow.types.join(', ') || 'Tất cả'}</span>
                  </div>
               </div>

               {/* 1.5. Nhân sự phụ trách */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Users size={18} className="text-gold-500" />
                     Nhân Sự Phụ Trách
                  </h4>

                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                     <div className="mb-3 relative" ref={memberDropdownRef}>
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Tìm kiếm nhân sự</label>
                        <div className="relative">
                        <input
                           type="text"
                           value={memberSearchText}
                              onChange={(e) => {
                                 setMemberSearchText(e.target.value);
                                 setIsMemberDropdownOpen(true);
                              }}
                              onFocus={() => setIsMemberDropdownOpen(true)}
                           placeholder="Tìm theo tên, SĐT, email..."
                              className="w-full p-2 pr-8 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                           />
                           <button
                              onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                           >
                              <ChevronDown 
                                 size={18} 
                                 className={`transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`}
                              />
                           </button>
                     </div>

                        {isMemberDropdownOpen && (
                           <div className="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        {MOCK_MEMBERS
                           .filter(m => {
                              const memberDept = m.department || getDepartmentFromRole(m.role);
                              const matchesDept = memberDept === workflowDepartment;
                              const matchesSearch = !memberSearchText.trim() ||
                                 m.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
                                 m.phone.includes(memberSearchText) ||
                                 m.email.toLowerCase().includes(memberSearchText.toLowerCase());
                              return matchesDept && matchesSearch && m.status === 'Active';
                           })
                           .map(member => (
                              <label
                                 key={member.id}
                                       className="flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 cursor-pointer transition-colors border-b border-neutral-800 last:border-b-0"
                              >
                                 <input
                                    type="checkbox"
                                    checked={assignedMembers.includes(member.id)}
                                    onChange={(e) => {
                                       if (e.target.checked) {
                                          setAssignedMembers([...assignedMembers, member.id]);
                                       } else {
                                          setAssignedMembers(assignedMembers.filter(id => id !== member.id));
                                       }
                                    }}
                                    className="w-4 h-4 text-gold-600 bg-neutral-800 border-neutral-700 rounded focus:ring-gold-500"
                                 />
                                 <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-200">{member.name}</div>
                                    <div className="text-xs text-slate-500">{member.role} • {member.phone}</div>
                                 </div>
                              </label>
                           ))}
                        {MOCK_MEMBERS.filter(m => {
                           const memberDept = m.department || getDepartmentFromRole(m.role);
                                 const matchesDept = memberDept === workflowDepartment;
                                 const matchesSearch = !memberSearchText.trim() ||
                                    m.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
                                    m.phone.includes(memberSearchText) ||
                                    m.email.toLowerCase().includes(memberSearchText.toLowerCase());
                                 return matchesDept && matchesSearch && m.status === 'Active';
                        }).length === 0 && (
                              <div className="text-center py-4 text-slate-600 text-sm">
                                       Không tìm thấy nhân sự
                                    </div>
                              )}
                              </div>
                           )}
                     </div>

                     {assignedMembers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-800">
                           <div className="text-xs font-medium text-slate-400 mb-2">Đã chọn ({assignedMembers.length}):</div>
                           <div className="flex flex-wrap gap-2">
                              {assignedMembers.map(memberId => {
                                 const member = MOCK_MEMBERS.find(m => m.id === memberId);
                                 if (!member) return null;
                                 return (
                                    <div
                                       key={memberId}
                                       className="flex items-center gap-2 px-2 py-1 bg-gold-900/20 text-gold-400 border border-gold-800/30 rounded text-xs"
                                    >
                                       {member.name}
                                       <button
                                          onClick={() => setAssignedMembers(assignedMembers.filter(id => id !== memberId))}
                                          className="text-gold-500 hover:text-gold-300"
                                       >
                                          <X size={12} />
                                       </button>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
                  </div>

                  {/* Cột 2: Định Mức Nguyên Vật Liệu */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Package size={18} className="text-gold-500" />
                     Định Mức Nguyên Vật Liệu
                  </h4>

                  {/* Add Form */}
                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="md:col-span-2">
                           <label className="text-xs font-medium text-slate-500 mb-1 block">Chọn vật tư trong kho</label>
                           <select
                              className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                              value={selectedInventoryId}
                              onChange={(e) => setSelectedInventoryId(e.target.value)}
                           >
                              <option value="">-- Chọn vật tư --</option>
                              {(inventory || []).map(item => (
                                 <option key={item.id} value={item.id}>
                                    {item.name} (Tồn: {item.quantity.toLocaleString('vi-VN')} {item.unit})
                                 </option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-medium text-slate-500 mb-1 block">Định mức / SP</label>
                           <div className="flex">
                              <input
                                 type="number"
                                 step="0.01"
                                 className="w-full p-2 border border-neutral-700 rounded-l text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 placeholder="0.00"
                                 value={quantity}
                                 onChange={(e) => setQuantity(e.target.value)}
                              />
                              <span className="bg-neutral-800 px-3 py-2 text-xs flex items-center rounded-r border-y border-r border-neutral-700 text-slate-400">
                                 {selectedInventoryId ? getInventoryItem(selectedInventoryId)?.unit : 'Đơn vị'}
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Show selected item details preview */}
                     {selectedInventoryId && (
                        <div className="flex items-center gap-3 mb-3 bg-neutral-900 p-2 rounded border border-neutral-800">
                           <img
                              src={getInventoryItem(selectedInventoryId)?.image}
                              alt=""
                              className="w-8 h-8 rounded object-cover opacity-80"
                           />
                           <div className="text-xs">
                              <span className="font-medium text-slate-200">{getInventoryItem(selectedInventoryId)?.name}</span>
                              <div className="text-slate-500">
                                 Tồn kho hiện tại: <span className="font-bold text-emerald-500">{getInventoryItem(selectedInventoryId)?.quantity?.toLocaleString('vi-VN') || '0'}</span> {getInventoryItem(selectedInventoryId)?.unit}
                              </div>
                           </div>
                        </div>
                     )}

                     <button
                        onClick={handleAddMaterial}
                        disabled={!selectedInventoryId || !quantity}
                        className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                     >
                        + Thêm vào quy trình
                     </button>
                  </div>

                  {/* List */}
                  <div className="space-y-2">
                     {materials.length === 0 && (
                        <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                           Chưa có định mức vật tư
                        </div>
                     )}
                     {materials.map((mat, idx) => {
                        const itemDetails = getInventoryItem(mat.inventoryItemId);
                        return (
                           <div key={idx} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded bg-neutral-800 overflow-hidden flex-shrink-0">
                                    <img src={itemDetails?.image} alt="" className="w-full h-full object-cover opacity-80" />
                                 </div>
                                 <div>
                                    <h5 className="font-medium text-sm text-slate-200">{itemDetails?.name}</h5>
                                    <p className="text-xs text-slate-500">{itemDetails?.sku}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-right">
                                    <div className="font-bold text-slate-200 text-sm">{mat.quantity.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">{itemDetails?.unit}</span></div>
                                    <div className="text-[10px] text-slate-500">định mức</div>
                                 </div>
                                 <button
                                    onClick={() => handleRemoveMaterial(idx)}
                                    className="text-slate-500 hover:text-red-500 p-1"
                                 >
                                    <X size={16} />
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                     </div>
                  </div>
               </div>

               {/* Hàng 2: Các Bước Xử Lý - Full Width, Horizontal Scroll */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Columns size={18} className="text-gold-500" />
                     Các Bước Xử Lý (Hiển thị ở Kanban)
                  </h4>

                  {/* Add Stage Form */}
                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
                        {/* Toggle: Tạo mới / Chọn có sẵn */}
                        <div className="flex gap-2 mb-3">
                           <button
                              onClick={() => {
                                 setIsCreatingNewStage(true);
                                 setSelectedStageId('');
                                 setShowAddTaskForm(false);
                              }}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                 isCreatingNewStage
                                    ? 'bg-gold-600 text-black'
                                    : 'bg-neutral-800 text-slate-400 hover:bg-neutral-700'
                              }`}
                           >
                              Tạo mới
                           </button>
                           <button
                              onClick={() => {
                                 setIsCreatingNewStage(false);
                                 setNewStageName('');
                                 setNewStageColor('bg-slate-500');
                                 setShowAddTaskForm(false);
                              }}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                 !isCreatingNewStage
                                    ? 'bg-gold-600 text-black'
                                    : 'bg-neutral-800 text-slate-400 hover:bg-neutral-700'
                              }`}
                           >
                              Chọn CV
                           </button>
                        </div>

                        {isCreatingNewStage ? (
                           /* Form Tạo bước mới */
                           <>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                 <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Tên bước</label>
                                    <input
                                       type="text"
                                       value={newStageName}
                                       onChange={(e) => setNewStageName(e.target.value)}
                                       placeholder="VD: Vệ sinh, Sửa chữa, Kiểm tra..."
                                       className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Màu sắc</label>
                                    <select
                                       value={newStageColor}
                                       onChange={(e) => setNewStageColor(e.target.value)}
                                       className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                    >
                                       <option value="bg-slate-500">Xám</option>
                                       <option value="bg-blue-500">Xanh dương</option>
                                       <option value="bg-orange-500">Cam</option>
                                       <option value="bg-purple-500">Tím</option>
                                       <option value="bg-emerald-500">Xanh lá</option>
                                       <option value="bg-red-500">Đỏ</option>
                                       <option value="bg-yellow-500">Vàng</option>
                                       <option value="bg-pink-500">Hồng</option>
                                    </select>
                                 </div>
                              </div>

                              <button
                                 onClick={() => {
                                    if (!newStageName.trim()) return;
                                    const newStageId = newStageName.toLowerCase().replace(/\s+/g, '-');
                                    const newStage: WorkflowStage = {
                                       id: newStageId,
                                       name: newStageName,
                                       order: stages.length,
                                       color: newStageColor,
                                       todos: []
                                    };
                                    setStages([...stages, newStage]);
                                    setNewStageName('');
                                    setNewStageColor('bg-slate-500');
                                    setNewlyAddedStageId(newStageId);
                                    setTimeout(() => setNewlyAddedStageId(null), 100);
                                 }}
                                 disabled={!newStageName.trim()}
                                 className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                              >
                                 + Thêm Bước
                              </button>
                           </>
                        ) : (
                           /* Form Chọn CV và Thêm Task */
                           <div className="space-y-3">
                              <div>
                                 <label className="text-xs font-medium text-slate-500 mb-1 block">Chọn CV</label>
                                 <div className="flex gap-2">
                                    <select
                                       value={selectedStageId}
                                       onChange={(e) => {
                                          setSelectedStageId(e.target.value);
                                          setShowAddTaskForm(false);
                                       }}
                                       className="flex-1 p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                    >
                                       <option value="">-- Chọn CV --</option>
                                       {stages.sort((a, b) => a.order - b.order).map((stage) => (
                                          <option key={stage.id} value={stage.id}>
                                             {stage.name}
                                          </option>
                                       ))}
                                    </select>
                                    {selectedStageId && (
                                       <button
                                          onClick={() => setShowAddTaskForm(true)}
                                          className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-black rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                       >
                                          <Plus size={16} />
                                          Thêm Task
                                       </button>
                                    )}
                                 </div>
                              </div>

                              {showAddTaskForm && selectedStageId && (
                                 <div className="mt-3 pt-3 border-t border-neutral-700 space-y-3">
                                    <div>
                                       <label className="text-xs font-medium text-slate-500 mb-1 block">Task chi tiết <span className="text-red-500">*</span></label>
                                       <input
                                          type="text"
                                          value={newTaskTitle}
                                          onChange={(e) => setNewTaskTitle(e.target.value)}
                                          placeholder="Nhập chi tiết task"
                                          className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                          autoFocus
                                       />
                                    </div>
                                    <div>
                                       <label className="text-xs font-medium text-slate-500 mb-1 block">Ghi chú</label>
                                       <textarea
                                          value={newTaskDescription}
                                          onChange={(e) => setNewTaskDescription(e.target.value)}
                                          placeholder="Nhập ghi chú (tùy chọn)"
                                          rows={3}
                                          className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200 resize-none"
                                       />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                       <button
                                          onClick={() => {
                                             setShowAddTaskForm(false);
                                             setNewTaskTitle('');
                                             setNewTaskDescription('');
                                          }}
                                          className="px-3 py-1.5 border border-neutral-700 rounded text-xs text-slate-400 hover:bg-neutral-800 transition-colors"
                                       >
                                          Hủy
                                       </button>
                                       <button
                                          onClick={() => {
                                             if (!newTaskTitle.trim()) {
                                                alert('Vui lòng nhập task chi tiết!');
                                                return;
                                             }
                                             const selectedStage = stages.find(s => s.id === selectedStageId);
                                             if (!selectedStage) return;

                                             const newTodo: TodoStep = {
                                                id: `todo-${Date.now()}`,
                                                title: newTaskTitle,
                                                description: newTaskDescription.trim(),
                                                completed: false,
                                                order: (selectedStage.todos || []).length
                                             };

                                             const updatedTodos = [...(selectedStage.todos || []), newTodo];
                                             const updatedStage = { ...selectedStage, todos: updatedTodos };
                                             const newStages = stages.map(s => s.id === selectedStageId ? updatedStage : s);
                                             setStages(newStages);

                                             setNewTaskTitle('');
                                             setNewTaskDescription('');
                                             setShowAddTaskForm(false);
                                          }}
                                          disabled={!newTaskTitle.trim()}
                                          className="px-3 py-1.5 bg-gold-600 hover:bg-gold-700 disabled:bg-neutral-800 disabled:text-slate-500 text-black rounded text-xs font-medium transition-colors"
                                       >
                                          Thêm
                                       </button>
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                  {/* Stages List - Horizontal Scroll */}
                  <div className="overflow-x-auto pb-2">
                     <div className="flex gap-4 min-w-max">
                        {stages.length === 0 && (
                           <div className="text-center py-8 px-12 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg min-w-full">
                              Chưa có bước nào. Các bước này sẽ hiển thị ở Kanban Board.
                           </div>
                        )}
                        {stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                           <StageItemWithTodos
                              key={stage.id}
                              stage={stage}
                              idx={idx}
                              totalStages={stages.length}
                              onMoveUp={() => {
                                 const newStages = [...stages];
                                 [newStages[idx], newStages[idx - 1]] = [newStages[idx - 1], newStages[idx]];
                                 newStages[idx].order = idx;
                                 newStages[idx - 1].order = idx - 1;
                                 setStages(newStages);
                              }}
                              onMoveDown={() => {
                                 const newStages = [...stages];
                                 [newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]];
                                 newStages[idx].order = idx;
                                 newStages[idx + 1].order = idx + 1;
                                 setStages(newStages);
                              }}
                              onDelete={() => {
                                 if (window.confirm(`Xóa bước "${stage.name}"?`)) {
                                    setStages(stages.filter(s => s.id !== stage.id).map((s, i) => ({ ...s, order: i })));
                                 }
                              }}
                              onUpdate={(updatedStage) => {
                                 const newStages = [...stages];
                                 newStages[idx] = updatedStage;
                                 setStages(newStages);
                              }}
                              autoExpand={newlyAddedStageId === stage.id}
                           />
                        ))}
                     </div>
                  </div>
               </div>
               </div>
            </div>

            <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium">Đóng</button>
               <button
                  onClick={async () => {
                     try {
                        // Tự động chọn màu dựa trên phòng ban
                        const departmentColors: Record<string, string> = {
                           'Kỹ Thuật': 'bg-blue-900/30 text-blue-400 border-blue-800',
                           'Spa': 'bg-purple-900/30 text-purple-400 border-purple-800',
                           'QA/QC': 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
                           'Hậu Cần': 'bg-orange-900/30 text-orange-400 border-orange-800',
                           'Quản Lý': 'bg-gold-900/30 text-gold-400 border-gold-800',
                           'Kinh Doanh': 'bg-cyan-900/30 text-cyan-400 border-cyan-800'
                        };

                        // Cập nhật quy trình với materials và stages mới
                        // Đảm bảo giữ lại tất cả các field bắt buộc
                        const updatedWorkflow: any = {
                           id: workflow.id,
                           label: workflow.label,
                           description: workflow.description || '',
                           department: workflowDepartment,
                           types: workflow.types || [],
                           color: departmentColors[workflowDepartment] || workflow.color || 'bg-blue-900/30 text-blue-400 border-blue-800'
                        };

                        // Chỉ thêm materials và stages nếu có giá trị (không phải undefined)
                        if (materials.length > 0) {
                           updatedWorkflow.materials = materials;
                        }
                        if (stages.length > 0) {
                           updatedWorkflow.stages = stages;
                        }
                        if (assignedMembers.length > 0) {
                           updatedWorkflow.assignedMembers = assignedMembers;
                        }

                        // Lưu vào Firebase với tên bảng tiếng Việt
                        await set(ref(db, `${DB_PATHS.WORKFLOWS}/${workflow.id}`), updatedWorkflow);

                        alert(`Đã lưu cấu hình quy trình!\n\n- Vật tư: ${materials.length} loại\n- Các bước: ${stages.length} bước\n\nĐã lưu vào Firebase!`);
                        onClose();
                        // Workflows will be updated automatically via Firebase listener
                     } catch (error: any) {
                        console.error('Lỗi khi lưu cấu hình:', error);
                        const errorMessage = error?.message || String(error);
                        alert('Lỗi khi lưu cấu hình vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
                     }
                  }}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-black rounded-lg text-sm font-medium shadow-lg shadow-gold-900/20"
               >
                  Lưu Cấu Hình
               </button>
            </div>
         </div>
      </div>
   );
};