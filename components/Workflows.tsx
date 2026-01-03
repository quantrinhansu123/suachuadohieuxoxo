import React, { useState, useRef, useEffect } from 'react';
import { Plus, GitMerge, MoreHorizontal, Settings, Layers, Building2, Package, X, Eye, Edit, Trash2, GripVertical, ArrowUp, ArrowDown, Columns, Users, CheckCircle2, Circle } from 'lucide-react';
import { MOCK_WORKFLOWS, MOCK_INVENTORY, MOCK_MEMBERS } from '../constants';
import { ServiceType, WorkflowDefinition, InventoryItem, WorkflowStage, WorkflowMaterial, Member, TodoStep } from '../types';
import { ref, set, remove, get, onValue } from 'firebase/database';
import { db, DB_PATHS } from '../firebase';

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
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(MOCK_WORKFLOWS);
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
          // Nếu Firebase trống, dùng MOCK_WORKFLOWS
          setWorkflows(MOCK_WORKFLOWS);
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        // Fallback to MOCK_WORKFLOWS on error
        setWorkflows(MOCK_WORKFLOWS);
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

  const workflowsByDept = groupBy(workflows, (wf) => wf.department);

  const handleOpenConfig = (wf: WorkflowDefinition) => {
    setSelectedWorkflow(wf);
    setIsConfigModalOpen(true);
  };


  return (
    <div className="space-y-6">
      {/* Modal Tạo Quy Trình Mới */}
      {showAddModal && (
        <CreateWorkflowModal 
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

      <div className="space-y-8">
        {Object.entries(workflowsByDept).map(([dept, workflows]) => (
          <div key={dept}>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100 mb-4 px-1">
              <Building2 size={20} className="text-gold-500" />
              <span>Phòng {dept}</span>
              <span className="text-xs font-normal text-slate-400 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">{workflows.length} quy trình</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-1.5">
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
                          if (window.confirm(`Bạn có chắc chắn muốn xóa quy trình "${wf.label}"?\n\nHành động này không thể hoàn tác!`)) {
                            try {
                              // Xóa từ Firebase với tên bảng tiếng Việt
                              await remove(ref(db, `${DB_PATHS.WORKFLOWS}/${wf.id}`));
                              alert(`Đã xóa quy trình: ${wf.label}\n\nĐã xóa khỏi Firebase!`);
                              // Workflows will be updated automatically via Firebase listener
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
                          {wf.stages.map((s, i) => `#${i+1} ${s.name}`).join(' → ')}
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

// --- Sub-component: Create Workflow Modal ---
const CreateWorkflowModal: React.FC<{ onClose: () => void; onSuccess?: () => void }> = ({ onClose, onSuccess }) => {
   const [workflowLabel, setWorkflowLabel] = useState('');
   const [workflowDescription, setWorkflowDescription] = useState('');
   const [workflowDepartment, setWorkflowDepartment] = useState<WorkflowDefinition['department']>('Kỹ Thuật');
   const [materials, setMaterials] = useState<WorkflowMaterial[]>([]);
   const [stages, setStages] = useState<WorkflowStage[]>([]);
   const [selectedInventoryId, setSelectedInventoryId] = useState('');
   const [quantity, setQuantity] = useState('');
   const [newStageName, setNewStageName] = useState('');
   const [newStageColor, setNewStageColor] = useState('bg-slate-500');
   const [newStageDetails, setNewStageDetails] = useState('');
   const [newStageStandards, setNewStageStandards] = useState('');
   const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
   const [memberSearchText, setMemberSearchText] = useState('');
   
   // Tự động tạo ID từ tên quy trình
   const generateWorkflowId = (label: string): string => {
      if (!label) return '';
      // Chuyển đổi tên thành ID: bỏ dấu, chuyển thành chữ hoa, thay khoảng trắng bằng gạch dưới
      return label
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
         .toUpperCase()
         .replace(/[^A-Z0-9]/g, '_') // Thay ký tự đặc biệt bằng gạch dưới
         .replace(/_+/g, '_') // Loại bỏ gạch dưới trùng lặp
         .replace(/^_|_$/g, ''); // Loại bỏ gạch dưới ở đầu và cuối
   };
   
   const workflowId = generateWorkflowId(workflowLabel);

   const getInventoryItem = (id: string) => MOCK_INVENTORY.find(i => i.id === id);

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

   const handleSave = async () => {
      if (!workflowLabel) {
         alert('Vui lòng nhập tên quy trình!');
         return;
      }
      
      const autoGeneratedId = generateWorkflowId(workflowLabel);
      if (!autoGeneratedId) {
         alert('Không thể tạo ID từ tên quy trình. Vui lòng nhập tên hợp lệ!');
         return;
      }
      
      // Kiểm tra ID đã tồn tại chưa
      try {
         const existingSnapshot = await get(ref(db, `${DB_PATHS.WORKFLOWS}/${autoGeneratedId}`));
         if (existingSnapshot.exists()) {
            if (!window.confirm(`Quy trình với ID "${autoGeneratedId}" đã tồn tại. Bạn có muốn ghi đè không?`)) {
               return;
            }
         }
      } catch (error) {
         console.error('Error checking existing workflow:', error);
      }
      
      try {
         // Tự động chọn màu dựa trên phòng ban
         const departmentColors: Record<string, string> = {
            'Kỹ Thuật': 'bg-blue-900/30 text-blue-400 border-blue-800',
            'Spa': 'bg-purple-900/30 text-purple-400 border-purple-800',
            'QA/QC': 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
            'Hậu Cần': 'bg-orange-900/30 text-orange-400 border-orange-800'
         };
         
         // Tạo đối tượng quy trình (không dùng undefined cho Firebase)
         const newWorkflow: any = {
            id: autoGeneratedId,
            label: workflowLabel,
            description: workflowDescription || '',
            department: workflowDepartment,
            types: [], // Có thể thêm sau
            color: departmentColors[workflowDepartment] || 'bg-blue-900/30 text-blue-400 border-blue-800'
         };
         
         // Chỉ thêm materials và stages nếu có giá trị (không phải undefined)
         if (materials.length > 0) {
            newWorkflow.materials = materials;
         }
         if (stages.length > 0) {
            newWorkflow.stages = stages;
         }
         if (assignedMembers.length > 0) {
            newWorkflow.assignedMembers = assignedMembers;
         }
         
         // Lưu vào Firebase với tên bảng tiếng Việt
         await set(ref(db, `${DB_PATHS.WORKFLOWS}/${autoGeneratedId}`), newWorkflow);
         
         alert(`Tạo quy trình thành công!\n\nID: ${autoGeneratedId}\nTên: ${workflowLabel}\nPhòng ban: ${workflowDepartment}\nVật tư: ${materials.length} loại\nCác bước: ${stages.length} bước\n\nĐã lưu vào Firebase!`);
         
         // Reset form
         setWorkflowLabel('');
         setWorkflowDescription('');
         setWorkflowDepartment('Kỹ Thuật');
         setMaterials([]);
         setStages([]);
         setAssignedMembers([]);
         setMemberSearchText('');
         
         // Call onSuccess callback to refresh workflows list
         if (onSuccess) {
            onSuccess();
         }
         
         onClose();
      } catch (error: any) {
         console.error('Lỗi khi lưu quy trình:', error);
         const errorMessage = error?.message || String(error);
         alert('Lỗi khi lưu quy trình vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
      }
   };

   return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
               <div>
                  <h3 className="font-bold text-lg text-slate-100">Tạo Quy Trình Mới</h3>
                  <p className="text-xs text-slate-500">Thiết lập quy trình xử lý hoàn chỉnh</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* 1. General Info */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4">Thông Tin Cơ Bản</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Tên quy trình <span className="text-red-500">*</span></label>
                        <input
                           type="text"
                           value={workflowLabel}
                           onChange={(e) => setWorkflowLabel(e.target.value)}
                           placeholder="VD: Spa cao cấp"
                           className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                        />
                        {workflowLabel && (
                           <div className="mt-2 p-2 bg-neutral-800/50 rounded border border-neutral-700">
                              <span className="text-xs text-slate-400">ID tự động: </span>
                              <span className="text-xs font-mono text-gold-500">{workflowId || 'Nhập tên để tạo ID'}</span>
                           </div>
                        )}
                     </div>
                     <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Phòng ban</label>
                        <select
                           value={workflowDepartment}
                           onChange={(e) => {
                              const dept = e.target.value as WorkflowDefinition['department'];
                              setWorkflowDepartment(dept);
                              // Lọc nhân sự theo phòng ban
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
                     <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Mô tả</label>
                        <textarea
                           value={workflowDescription}
                           onChange={(e) => setWorkflowDescription(e.target.value)}
                           placeholder="Mô tả quy trình xử lý..."
                           rows={2}
                           className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200 resize-none"
                        />
                     </div>
                  </div>
               </div>

               {/* 1.5. Nhân sự phụ trách */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Users size={18} className="text-gold-500" />
                     Nhân Sự Phụ Trách
                  </h4>
                  
                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                     <div className="mb-3">
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Tìm kiếm nhân sự</label>
                        <input
                           type="text"
                           value={memberSearchText}
                           onChange={(e) => setMemberSearchText(e.target.value)}
                           placeholder="Tìm theo tên, SĐT, email..."
                           className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                        />
                     </div>
                     
                     <div className="max-h-48 overflow-y-auto space-y-2">
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
                                 className="flex items-center gap-3 p-2 bg-neutral-900 rounded border border-neutral-800 hover:border-gold-500/50 cursor-pointer transition-colors"
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
                           return memberDept === workflowDepartment && m.status === 'Active';
                        }).length === 0 && (
                           <div className="text-center py-4 text-slate-600 text-sm">
                              Không có nhân sự nào trong phòng ban này
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

               {/* 2. Stages Configuration */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Columns size={18} className="text-gold-500" />
                     Các Bước Xử Lý (Hiển thị ở Kanban)
                  </h4>
                  
                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
                     <div className="grid grid-cols-1 gap-3 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Tên bước <span className="text-red-500">*</span></label>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Chi tiết</label>
                              <textarea
                                 value={newStageDetails}
                                 onChange={(e) => setNewStageDetails(e.target.value)}
                                 placeholder="Mô tả chi tiết công việc cần làm..."
                                 rows={2}
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200 resize-none"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Tiêu chuẩn</label>
                              <textarea
                                 value={newStageStandards}
                                 onChange={(e) => setNewStageStandards(e.target.value)}
                                 placeholder="Tiêu chuẩn đánh giá hoàn thành..."
                                 rows={2}
                                 className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200 resize-none"
                              />
                           </div>
                        </div>
                     </div>
                     
                     <button 
                        onClick={() => {
                           if (!newStageName.trim()) return;
                           const newStage: WorkflowStage = {
                              id: newStageName.toLowerCase().replace(/\s+/g, '-'),
                              name: newStageName,
                              order: stages.length,
                              color: newStageColor,
                              details: newStageDetails.trim() || undefined,
                              standards: newStageStandards.trim() || undefined
                           };
                           setStages([...stages, newStage]);
                           setNewStageName('');
                           setNewStageColor('bg-slate-500');
                           setNewStageDetails('');
                           setNewStageStandards('');
                        }}
                        disabled={!newStageName.trim()}
                        className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                     >
                        + Thêm Bước
                     </button>
                  </div>

                  <div className="space-y-2">
                     {stages.length === 0 && (
                        <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                           Chưa có bước nào. Các bước này sẽ hiển thị ở Kanban Board.
                        </div>
                     )}
                     {stages.sort((a, b) => a.order - b.order).map((stage, idx) => {
                        const [showTodoInput, setShowTodoInput] = useState(false);
                        const [newTodoText, setNewTodoText] = useState('');
                        const stageTodos = stage.todos || [];
                        
                        return (
                           <div key={stage.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                       <GripVertical size={16} className="text-slate-600 cursor-move" />
                                       <div className={`w-3 h-3 rounded-full ${stage.color || 'bg-slate-500'}`}></div>
                                    </div>
                                    <div>
                                       <h5 className="font-medium text-sm text-slate-200">{stage.name}</h5>
                                       <div className="flex items-center gap-2 text-xs text-slate-500">
                                          <span>Thứ tự: {idx + 1}</span>
                                          {stageTodos.length > 0 && (
                                             <span className="bg-neutral-800 px-2 py-0.5 rounded">
                                                {stageTodos.filter(t => t.completed).length}/{stageTodos.length} task
                                             </span>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    {idx > 0 && (
                                       <button
                                          onClick={() => {
                                             const newStages = [...stages];
                                             [newStages[idx], newStages[idx - 1]] = [newStages[idx - 1], newStages[idx]];
                                             newStages[idx].order = idx;
                                             newStages[idx - 1].order = idx - 1;
                                             setStages(newStages);
                                          }}
                                          className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                          title="Di chuyển lên"
                                       >
                                          <ArrowUp size={14} />
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
                                          className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                          title="Di chuyển xuống"
                                       >
                                          <ArrowDown size={14} />
                                       </button>
                                    )}
                                    <button 
                                       onClick={() => {
                                          if (window.confirm(`Xóa bước "${stage.name}"?`)) {
                                             setStages(stages.filter(s => s.id !== stage.id).map((s, i) => ({ ...s, order: i })));
                                          }
                                       }}
                                       className="text-slate-500 hover:text-red-500 p-1"
                                    >
                                       <X size={16} />
                                    </button>
                                 </div>
                              </div>
                              {(stage.details || stage.standards) && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-2 border-t border-neutral-800">
                                    {stage.details && (
                                       <div>
                                          <p className="text-xs font-medium text-slate-400 mb-1">Chi tiết:</p>
                                          <p className="text-xs text-slate-300">{stage.details}</p>
                                       </div>
                                    )}
                                    {stage.standards && (
                                       <div>
                                          <p className="text-xs font-medium text-slate-400 mb-1">Tiêu chuẩn:</p>
                                          <p className="text-xs text-slate-300">{stage.standards}</p>
                                       </div>
                                    )}
                                 </div>
                              )}
                              
                              {/* Tasks Section */}
                              <div className="mt-3 pt-3 border-t border-neutral-800">
                                 <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-slate-400">Các task con:</p>
                                    <button
                                       onClick={() => setShowTodoInput(!showTodoInput)}
                                       className="text-xs px-2 py-1 bg-gold-600/20 hover:bg-gold-600/30 text-gold-400 rounded flex items-center gap-1 transition-colors"
                                    >
                                       <Plus size={12} />
                                       Thêm task
                                    </button>
                                 </div>
                                 
                                 {showTodoInput && (
                                    <div className="flex gap-2 mb-2">
                                       <input
                                          type="text"
                                          value={newTodoText}
                                          onChange={(e) => setNewTodoText(e.target.value)}
                                          onKeyPress={(e) => {
                                             if (e.key === 'Enter' && newTodoText.trim()) {
                                                const newTodo: TodoStep = {
                                                   id: `todo-${Date.now()}`,
                                                   title: newTodoText,
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
                                                setShowTodoInput(false);
                                             }
                                          }}
                                          placeholder="Nhập tên task..."
                                          className="flex-1 px-2 py-1 text-xs border border-neutral-700 rounded bg-neutral-800 text-slate-200 outline-none focus:border-gold-500"
                                          autoFocus
                                       />
                                       <button
                                          onClick={() => {
                                             if (newTodoText.trim()) {
                                                const newTodo: TodoStep = {
                                                   id: `todo-${Date.now()}`,
                                                   title: newTodoText,
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
                                                setShowTodoInput(false);
                                             }
                                          }}
                                          className="px-2 py-1 bg-gold-600 hover:bg-gold-700 text-black rounded text-xs font-medium transition-colors"
                                       >
                                          Thêm
                                       </button>
                                    </div>
                                 )}
                                 
                                 {stageTodos.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">Chưa có task nào</p>
                                 ) : (
                                    <div className="space-y-1">
                                       {stageTodos.map(todo => (
                                          <div key={todo.id} className="flex items-center gap-2 text-xs p-1.5 bg-neutral-800/50 rounded">
                                             <button
                                                onClick={() => {
                                                   const updatedStages = stages.map(s => 
                                                      s.id === stage.id
                                                         ? { ...s, todos: (s.todos || []).map(t => 
                                                            t.id === todo.id ? { ...t, completed: !t.completed } : t
                                                         )}
                                                         : s
                                                   );
                                                   setStages(updatedStages);
                                                }}
                                                className="flex-shrink-0"
                                             >
                                                {todo.completed ? (
                                                   <CheckCircle2 size={14} className="text-emerald-500" />
                                                ) : (
                                                   <Circle size={14} className="text-slate-600" />
                                                )}
                                             </button>
                                             <span className={`flex-1 ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                {todo.title}
                                             </span>
                                             <button
                                                onClick={() => {
                                                   const updatedStages = stages.map(s => 
                                                      s.id === stage.id
                                                         ? { ...s, todos: (s.todos || []).filter(t => t.id !== todo.id).map((t, i) => ({ ...t, order: i })) }
                                                         : s
                                                   );
                                                   setStages(updatedStages);
                                                }}
                                                className="text-slate-600 hover:text-red-500 transition-colors"
                                             >
                                                <X size={12} />
                                             </button>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* 3. Materials Configuration */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Package size={18} className="text-gold-500" />
                     Định Mức Nguyên Vật Liệu
                  </h4>
                  
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
                              {MOCK_INVENTORY.map(item => (
                                 <option key={item.id} value={item.id}>
                                    {item.name} (Tồn: {item.quantity} {item.unit})
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
                                 Tồn kho hiện tại: <span className="font-bold text-emerald-500">{getInventoryItem(selectedInventoryId)?.quantity}</span> {getInventoryItem(selectedInventoryId)?.unit}
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
                                    <div className="font-bold text-slate-200 text-sm">{mat.quantity} <span className="text-xs font-normal text-slate-500">{itemDetails?.unit}</span></div>
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

            <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium">Hủy</button>
               <button 
                  onClick={handleSave}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-black rounded-lg text-sm font-medium shadow-lg shadow-gold-900/20"
               >
                  Tạo Quy Trình
               </button>
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
}> = ({ stage, idx, totalStages, onMoveUp, onMoveDown, onDelete, onUpdate }) => {
   const [isExpanded, setIsExpanded] = useState(false);
   const [newTodoTitle, setNewTodoTitle] = useState('');
   const [newTodoNote, setNewTodoNote] = useState('');
   const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
   const [todos, setTodos] = useState<TodoStep[]>(stage.todos || []);

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

   const handleUpdateTodoNote = (todoId: string, note: string) => {
      const updatedTodos = todos.map(t => 
         t.id === todoId ? { ...t, description: note } : t
      );
      setTodos(updatedTodos);
      onUpdate({ ...stage, todos: updatedTodos });
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm overflow-hidden">
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
         </div>

         {/* Show todos preview always */}
         {todos.length > 0 && (
            <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-900/50">
               <div className="text-xs text-slate-400 mb-2 font-medium">Các công việc con:</div>
               <div className="space-y-1 max-h-24 overflow-y-auto">
                  {todos.slice(0, 3).map((todo) => (
                     <div key={todo.id} className="flex items-center gap-2 text-xs">
                        {todo.completed ? (
                           <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                           <Circle size={14} className="text-slate-600 flex-shrink-0" />
                        )}
                        <span className={`${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'} truncate`}>
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

               {/* Todo List */}
               <div className="space-y-2">
                  {todos.length === 0 ? (
                     <div className="text-center py-3 text-slate-600 text-xs border border-dashed border-neutral-700 rounded">
                        Chưa có bước nhỏ nào. Thêm các chi tiết công việc ở đây.
                     </div>
                  ) : (
                     todos.map((todo) => (
                        <div key={todo.id} className="bg-neutral-800/50 rounded border border-neutral-700/50 hover:border-neutral-700 transition-colors">
                           <div className="flex items-center gap-2 p-2">
                              <button
                                 onClick={() => handleToggleTodo(todo.id)}
                                 className="flex-shrink-0 text-slate-500 hover:text-gold-500 transition-colors"
                              >
                                 {todo.completed ? (
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                 ) : (
                                    <Circle size={18} />
                                 )}
                              </button>
                              <div className="flex-1">
                                 <span className={`text-sm block ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {todo.title}
                                 </span>
                                 {editingTodoId === todo.id ? (
                                    <input
                                       type="text"
                                       defaultValue={todo.description || ''}
                                       onBlur={(e) => {
                                          handleUpdateTodoNote(todo.id, e.target.value);
                                          setEditingTodoId(null);
                                       }}
                                       onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                             handleUpdateTodoNote(todo.id, e.currentTarget.value);
                                             setEditingTodoId(null);
                                          }
                                       }}
                                       placeholder="Thêm ghi chú..."
                                       className="w-full mt-1 px-2 py-1 text-xs border border-neutral-600 rounded bg-neutral-900 text-slate-400 outline-none focus:border-gold-500"
                                       autoFocus
                                    />
                                 ) : (
                                    todo.description && (
                                       <span className="text-xs text-slate-500 block mt-1">{todo.description}</span>
                                    )
                                 )}
                              </div>
                              {!editingTodoId && (
                                 <button
                                    onClick={() => setEditingTodoId(todo.id)}
                                    className="text-slate-600 hover:text-blue-400 p-0.5 transition-colors"
                                    title="Thêm/sửa ghi chú"
                                 >
                                    <Edit size={12} />
                                 </button>
                              )}
                              <button
                                 onClick={() => handleRemoveTodo(todo.id)}
                                 className="text-slate-600 hover:text-red-500 p-0.5 transition-colors"
                              >
                                 <X size={14} />
                              </button>
                           </div>
                        </div>
                     ))
                  )}
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
                           const item = MOCK_INVENTORY.find(inv => inv.id === mat.itemId);
                           return (
                              <div key={idx} className="bg-neutral-800/30 p-3 rounded-lg border border-neutral-800">
                                 <div className="flex justify-between items-start">
                                    <span className="text-sm text-slate-300 font-medium">{item?.name || mat.itemId}</span>
                                    <span className="text-xs text-slate-500">{mat.quantity} {item?.unit || ''}</span>
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
                              onMoveUp={() => {}}
                              onMoveDown={() => {}}
                              onDelete={() => {}}
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
   const [materials, setMaterials] = useState(workflow.materials || []);
   const [selectedInventoryId, setSelectedInventoryId] = useState('');
   const [quantity, setQuantity] = useState('');
   const [stages, setStages] = useState<WorkflowStage[]>(workflow.stages || []);
   const [newStageName, setNewStageName] = useState('');
   const [newStageColor, setNewStageColor] = useState('bg-slate-500');
   const [assignedMembers, setAssignedMembers] = useState<string[]>(workflow.assignedMembers || []);
   const [memberSearchText, setMemberSearchText] = useState('');
   const [workflowDepartment, setWorkflowDepartment] = useState<WorkflowDefinition['department']>(workflow.department);

   // Helper to find inventory details
   const getInventoryItem = (id: string) => MOCK_INVENTORY.find(i => i.id === id);

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
         <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
               <div>
                  <h3 className="font-bold text-lg text-slate-100">Cấu Hình Quy Trình</h3>
                  <p className="text-xs text-slate-500">{workflow.label}</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                     <div className="mb-3">
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Tìm kiếm nhân sự</label>
                        <input
                           type="text"
                           value={memberSearchText}
                           onChange={(e) => setMemberSearchText(e.target.value)}
                           placeholder="Tìm theo tên, SĐT, email..."
                           className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                        />
                     </div>
                     
                     <div className="max-h-48 overflow-y-auto space-y-2">
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
                                 className="flex items-center gap-3 p-2 bg-neutral-900 rounded border border-neutral-800 hover:border-gold-500/50 cursor-pointer transition-colors"
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
                           return memberDept === workflowDepartment && m.status === 'Active';
                        }).length === 0 && (
                           <div className="text-center py-4 text-slate-600 text-sm">
                              Không có nhân sự nào trong phòng ban này
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

               {/* 2. Stages Configuration */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Columns size={18} className="text-gold-500" />
                     Các Bước Xử Lý (Hiển thị ở Kanban)
                  </h4>
                  
                  {/* Add Stage Form */}
                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
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
                           const newStage: WorkflowStage = {
                              id: newStageName.toLowerCase().replace(/\s+/g, '-'),
                              name: newStageName,
                              order: stages.length,
                              color: newStageColor
                           };
                           setStages([...stages, newStage]);
                           setNewStageName('');
                           setNewStageColor('bg-slate-500');
                        }}
                        disabled={!newStageName.trim()}
                        className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                     >
                        + Thêm Bước
                     </button>
                  </div>

                  {/* Stages List */}
                  <div className="space-y-3">
                     {stages.length === 0 && (
                        <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
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
                        />
                     ))}
                  </div>
               </div>

               {/* 3. Materials Configuration */}
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
                              {MOCK_INVENTORY.map(item => (
                                 <option key={item.id} value={item.id}>
                                    {item.name} (Tồn: {item.quantity} {item.unit})
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
                                 Tồn kho hiện tại: <span className="font-bold text-emerald-500">{getInventoryItem(selectedInventoryId)?.quantity}</span> {getInventoryItem(selectedInventoryId)?.unit}
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
                                    <div className="font-bold text-slate-200 text-sm">{mat.quantity} <span className="text-xs font-normal text-slate-500">{itemDetails?.unit}</span></div>
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