import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Layers, Briefcase, Tag, Eye, Edit, Trash2, ArrowUp, ArrowDown, GripVertical, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { SERVICE_CATALOG, MOCK_WORKFLOWS } from '../constants';
import { TableFilter, FilterState } from './TableFilter';
import { ref, set, remove, get, onValue } from 'firebase/database';
import { db, DB_PATHS } from '../firebase';
import { ServiceCatalogItem, WorkflowDefinition, ServiceCategory } from '../types';

// Define 4-level category structure
const CATEGORY_TREE: ServiceCategory[] = [
  {
    id: 'cat-1',
    name: 'Chăm Sóc Túi Xách & Ví',
    level: 1,
    icon: '👜',
    color: 'text-purple-400',
    children: [
      {
        id: 'cat-1-1',
        name: 'Dịch Vụ Spa',
        level: 2,
        parentId: 'cat-1',
        icon: '✨',
        children: [
          {
            id: 'cat-1-1-1',
            name: 'Túi Xách',
            level: 3,
            parentId: 'cat-1-1',
            children: [
              { id: 'cat-1-1-1-1', name: 'Spa Basic', level: 4, parentId: 'cat-1-1-1' },
              { id: 'cat-1-1-1-2', name: 'Spa Premium', level: 4, parentId: 'cat-1-1-1' },
              { id: 'cat-1-1-1-3', name: 'Deep Clean', level: 4, parentId: 'cat-1-1-1' },
            ]
          },
          {
            id: 'cat-1-1-2',
            name: 'Ví',
            level: 3,
            parentId: 'cat-1-1',
            children: [
              { id: 'cat-1-1-2-1', name: 'Vệ Sinh Ví', level: 4, parentId: 'cat-1-1-2' },
              { id: 'cat-1-1-2-2', name: 'Phục Hồi Ví', level: 4, parentId: 'cat-1-1-2' },
            ]
          }
        ]
      },
      {
        id: 'cat-1-2',
        name: 'Sửa Chữa & Phục Hồi',
        level: 2,
        parentId: 'cat-1',
        icon: '🔧',
        children: [
          {
            id: 'cat-1-2-1',
            name: 'Túi Xách',
            level: 3,
            parentId: 'cat-1-2',
            children: [
              { id: 'cat-1-2-1-1', name: 'Retouch (Dặm Màu)', level: 4, parentId: 'cat-1-2-1' },
              { id: 'cat-1-2-1-2', name: 'Recolor (Đổi Màu)', level: 4, parentId: 'cat-1-2-1' },
              { id: 'cat-1-2-1-3', name: 'Sửa Khóa/Dây', level: 4, parentId: 'cat-1-2-1' },
            ]
          }
        ]
      },
      {
        id: 'cat-1-3',
        name: 'Xi Mạ & Nâng Cấp',
        level: 2,
        parentId: 'cat-1',
        icon: '⚡',
        children: [
          {
            id: 'cat-1-3-1',
            name: 'Xi Mạ Vàng',
            level: 3,
            parentId: 'cat-1-3',
            children: [
              { id: 'cat-1-3-1-1', name: 'Mạ Logo 18K', level: 4, parentId: 'cat-1-3-1' },
              { id: 'cat-1-3-1-2', name: 'Mạ Logo 24K', level: 4, parentId: 'cat-1-3-1' },
              { id: 'cat-1-3-1-3', name: 'Mạ Chi Tiết Kim Loại', level: 4, parentId: 'cat-1-3-1' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'cat-2',
    name: 'Chăm Sóc Giày Dép',
    level: 1,
    icon: '👟',
    color: 'text-blue-400',
    children: [
      {
        id: 'cat-2-1',
        name: 'Vệ Sinh Giày',
        level: 2,
        parentId: 'cat-2',
        icon: '🧼',
        children: [
          {
            id: 'cat-2-1-1',
            name: 'Sneaker',
            level: 3,
            parentId: 'cat-2-1',
            children: [
              { id: 'cat-2-1-1-1', name: 'Vệ Sinh Cơ Bản', level: 4, parentId: 'cat-2-1-1' },
              { id: 'cat-2-1-1-2', name: 'Deep Clean', level: 4, parentId: 'cat-2-1-1' },
            ]
          },
          {
            id: 'cat-2-1-2',
            name: 'Giày Tây',
            level: 3,
            parentId: 'cat-2-1',
            children: [
              { id: 'cat-2-1-2-1', name: 'Vệ Sinh & Đánh Bóng', level: 4, parentId: 'cat-2-1-2' },
              { id: 'cat-2-1-2-2', name: 'Patina', level: 4, parentId: 'cat-2-1-2' },
            ]
          }
        ]
      },
      {
        id: 'cat-2-2',
        name: 'Sửa Chữa Giày',
        level: 2,
        parentId: 'cat-2',
        icon: '🔨',
        children: [
          {
            id: 'cat-2-2-1',
            name: 'Thay Đế',
            level: 3,
            parentId: 'cat-2-2',
            children: [
              { id: 'cat-2-2-1-1', name: 'Dán Đế Vibram', level: 4, parentId: 'cat-2-2-1' },
              { id: 'cat-2-2-1-2', name: 'Thay Đế Cao Su', level: 4, parentId: 'cat-2-2-1' },
            ]
          }
        ]
      }
    ]
  }
];

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

// Category Sidebar Component
const CategorySidebar: React.FC<{
  categories: ServiceCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}> = ({ categories, selectedCategory, onSelectCategory }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['cat-1', 'cat-2']));

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderCategory = (category: ServiceCategory, depth: number = 0) => {
    const isExpanded = expandedNodes.has(category.id);
    const isSelected = selectedCategory === category.id;
    const hasChildren = category.children && category.children.length > 0;
    
    const paddingLeft = depth * 16 + 8;
    
    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all hover:bg-neutral-800 ${
            isSelected ? 'bg-gold-900/20 text-gold-400 border-l-2 border-gold-500' : 'text-slate-300'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onSelectCategory(isSelected ? null : category.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(category.id);
              }}
              className="p-0.5 hover:bg-neutral-700 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {category.icon && <span className="text-sm">{category.icon}</span>}
          {category.level === 1 && !category.icon && (
            isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
          )}
          
          <span className={`text-sm flex-1 ${category.level === 1 ? 'font-bold' : category.level === 2 ? 'font-semibold' : ''} ${category.color || ''}`}>
            {category.name}
          </span>
          
          {category.level === 4 && (
            <span className="text-xs text-slate-500 bg-neutral-800 px-1.5 py-0.5 rounded">L4</span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="font-bold text-slate-100 mb-2 flex items-center gap-2">
          <Tag size={18} className="text-gold-500" />
          Danh Mục Dịch Vụ
        </h3>
        <p className="text-xs text-slate-500">4 cấp phân loại</p>
      </div>

      <button
        onClick={() => onSelectCategory(null)}
        className={`w-full mb-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          selectedCategory === null
            ? 'bg-gold-600 text-black'
            : 'bg-neutral-800 text-slate-300 hover:bg-neutral-700'
        }`}
      >
        Tất Cả Dịch Vụ
      </button>

      <div className="space-y-1">
        {categories.map((category) => renderCategory(category, 0))}
      </div>
    </div>
  );
};

export const Services: React.FC = () => {
  const [filter, setFilter] = useState<FilterState>({ locNhanh: 'all', thoiGian: { tuNgay: null, denNgay: null } });
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [workflowSearch, setWorkflowSearch] = useState('');
  const [services, setServices] = useState<ServiceCatalogItem[]>(SERVICE_CATALOG);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(MOCK_WORKFLOWS);
  const [isLoading, setIsLoading] = useState(true);
  const [newService, setNewService] = useState({
    name: '',
    category: '',
    tier: '1',
    price: '',
    desc: '',
    workflows: [] as Array<{ id: string; order: number }>, // Mảng các quy trình đã chọn với thứ tự
    image: ''
  });

  // Define service tiers
  const serviceTiers = [
    { id: '1', name: 'Cấp 1 - Dịch Vụ Cơ Bản', color: 'bg-blue-900/30 text-blue-400 border-blue-800' },
    { id: '2', name: 'Cấp 2 - Dịch Vụ Tiêu Chuẩn', color: 'bg-purple-900/30 text-purple-400 border-purple-800' },
    { id: '3', name: 'Cấp 3 - Dịch Vụ Premium', color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800' },
    { id: '4', name: 'Cấp 4 - Dịch Vụ VIP', color: 'bg-gold-900/30 text-gold-400 border-gold-800' },
  ];

  // Load services from Firebase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const snapshot = await get(ref(db, DB_PATHS.SERVICES));
        
        // Bắt đầu với MOCK data
        const mergedServices = new Map<string, ServiceCatalogItem>();
        
        // Thêm tất cả MOCK services trước
        SERVICE_CATALOG.forEach(svc => {
          mergedServices.set(svc.id, { ...svc });
        });
        
        // Merge với data từ Firebase (ưu tiên Firebase nếu trùng ID)
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.keys(data).forEach(key => {
            const svc = data[key];
            const serviceId = svc.id || key;
            mergedServices.set(serviceId, {
              id: serviceId,
              name: svc.name || '',
              category: svc.category || '',
              price: svc.price || 0,
              desc: svc.desc || '',
              image: svc.image || '',
              workflowId: svc.workflows || svc.workflowId || ''
            } as ServiceCatalogItem);
          });
        }
        
        setServices(Array.from(mergedServices.values()));
      } catch (error) {
        console.error('Error loading services:', error);
        setServices(SERVICE_CATALOG);
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();

    // Listen for real-time updates
    const servicesRef = ref(db, DB_PATHS.SERVICES);
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      try {
        // Bắt đầu với MOCK data
        const mergedServices = new Map<string, ServiceCatalogItem>();
        
        // Thêm tất cả MOCK services trước
        SERVICE_CATALOG.forEach(svc => {
          mergedServices.set(svc.id, { ...svc });
        });
        
        // Merge với data từ Firebase (ưu tiên Firebase nếu trùng ID)
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.keys(data).forEach(key => {
            const svc = data[key];
            const serviceId = svc.id || key;
            mergedServices.set(serviceId, {
              id: serviceId,
              name: svc.name || '',
              category: svc.category || '',
              price: svc.price || 0,
              desc: svc.desc || '',
              image: svc.image || '',
              workflowId: svc.workflows || svc.workflowId || ''
            } as ServiceCatalogItem);
          });
        }
        
        setServices(Array.from(mergedServices.values()));
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setServices(SERVICE_CATALOG);
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
          console.log('Services: Loaded workflows from Firebase:', workflowsList);
          setWorkflows(workflowsList);
        } else {
          console.log('Services: No workflows in Firebase, using MOCK_WORKFLOWS');
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
          console.log('Services: Real-time workflows update:', workflowsList);
          setWorkflows(workflowsList);
        } else {
          console.log('Services: Real-time update - no workflows, using MOCK_WORKFLOWS');
          setWorkflows(MOCK_WORKFLOWS);
        }
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setWorkflows(MOCK_WORKFLOWS);
      }
    });

    return () => unsubscribe();
  }, []);

  // Lấy danh sách danh mục unique
  const categories = useMemo(() => {
    const cats = [...new Set(services.map(s => s.category))];
    return ['all', ...cats];
  }, [services]);

  // Helper function to check if service belongs to selected category
  const isServiceInCategory = (service: ServiceCatalogItem, categoryId: string): boolean => {
    if (!service.categoryPath || service.categoryPath.length === 0) return false;
    return service.categoryPath.includes(categoryId);
  };

  // Lọc dịch vụ theo tìm kiếm, danh mục và cấp độ
  const filteredServices = useMemo(() => {
    let result = [...services];
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.desc.toLowerCase().includes(search)
      );
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }

    if (tierFilter !== 'all') {
      result = result.filter(s => (s.tier || '1') === tierFilter);
    }

    // Filter by selected category from sidebar
    if (selectedCategory) {
      result = result.filter(s => isServiceInCategory(s, selectedCategory));
    }
    
    return result;
  }, [services, searchText, categoryFilter, tierFilter, selectedCategory]);

  // Group services by tier
  const servicesByTier = useMemo(() => {
    const grouped: Record<string, ServiceCatalogItem[]> = {};
    serviceTiers.forEach(tier => {
      grouped[tier.id] = filteredServices.filter(s => (s.tier || '1') === tier.id);
    });
    return grouped;
  }, [filteredServices]);

  const handleAddService = async () => {
    if (!newService.name || !newService.category || !newService.price || newService.workflows.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc và chọn ít nhất một quy trình!');
      return;
    }
    
    try {
      // Tạo ID tự động từ tên dịch vụ
      const serviceId = `SVC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Tạo đối tượng dịch vụ
      const serviceData: any = {
        id: serviceId,
        name: newService.name,
        category: newService.category,
        tier: newService.tier || '1',
        price: parseInt(newService.price),
        desc: newService.desc || '',
        image: newService.image || '',
        workflows: newService.workflows.sort((a, b) => a.order - b.order)
      };
      
      // Lưu vào Firebase
      await set(ref(db, `${DB_PATHS.SERVICES}/${serviceId}`), serviceData);
      
      const workflowLabels = newService.workflows
        .sort((a, b) => a.order - b.order)
        .map(w => workflows.find(wf => wf.id === w.id)?.label)
        .filter(Boolean);
      
      alert(`Thêm dịch vụ thành công!\n\nTên: ${newService.name}\nDanh mục: ${newService.category}\nGiá: ${parseInt(newService.price).toLocaleString()} ₫\nQuy trình: ${workflowLabels.join(' → ')}\n\nĐã lưu vào Firebase!`);
      
      setNewService({
        name: '',
        category: '',
        tier: '1',
        price: '',
        desc: '',
        workflows: [],
        image: ''
      });
      setWorkflowSearch('');
      setShowAddModal(false);
      // Services will be updated automatically via Firebase listener
    } catch (error: any) {
      console.error('Lỗi khi lưu dịch vụ:', error);
      const errorMessage = error?.message || String(error);
      alert('Lỗi khi lưu dịch vụ vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
    }
  };

  const handleViewService = (service: any) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    // Chuyển đổi workflowId (có thể là string hoặc string[]) thành mảng với thứ tự
    let workflowIds: string[] = [];
    if (Array.isArray(service.workflowId)) {
      workflowIds = service.workflowId;
    } else if (service.workflowId) {
      workflowIds = [service.workflowId];
    }
    
    // Nếu service có workflows với order, dùng luôn, nếu không thì tạo mới
    let workflows: Array<{ id: string; order: number }> = [];
    if (service.workflows && Array.isArray(service.workflows)) {
      workflows = service.workflows;
    } else {
      workflows = workflowIds.map((id, index) => ({ id, order: index + 1 }));
    }
    
    setNewService({
      name: service.name,
      category: service.category,
      tier: service.tier || '1',
      price: service.price.toString(),
      desc: service.desc,
      workflows: workflows,
      image: service.image
    });
    setWorkflowSearch('');
    setShowEditModal(true);
  };

  const handleUpdateService = async () => {
    if (!newService.name || !newService.category || !newService.price || newService.workflows.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc và chọn ít nhất một quy trình!');
      return;
    }
    
    if (!selectedService || !selectedService.id) {
      alert('Không tìm thấy dịch vụ để cập nhật!');
      return;
    }
    
    try {
      // Cập nhật đối tượng dịch vụ
      const serviceData: any = {
        id: selectedService.id,
        name: newService.name,
        category: newService.category,
        tier: newService.tier || '1',
        price: parseInt(newService.price),
        desc: newService.desc || '',
        image: newService.image || '',
        workflows: newService.workflows.sort((a, b) => a.order - b.order)
      };
      
      // Lưu vào Firebase
      await set(ref(db, `${DB_PATHS.SERVICES}/${selectedService.id}`), serviceData);
      
      const workflowLabels = newService.workflows
        .sort((a, b) => a.order - b.order)
        .map(w => workflows.find(wf => wf.id === w.id)?.label)
        .filter(Boolean);
      
      alert(`Cập nhật dịch vụ thành công!\n\nTên: ${newService.name}\nDanh mục: ${newService.category}\nGiá: ${parseInt(newService.price).toLocaleString()} ₫\nQuy trình: ${workflowLabels.join(' → ')}\n\nĐã lưu vào Firebase!`);
      
      setNewService({
        name: '',
        category: '',
        tier: '1',
        price: '',
        desc: '',
        workflows: [],
        image: ''
      });
      setWorkflowSearch('');
      setShowEditModal(false);
      setSelectedService(null);
      // Services will be updated automatically via Firebase listener
    } catch (error: any) {
      console.error('Lỗi khi cập nhật dịch vụ:', error);
      const errorMessage = error?.message || String(error);
      alert('Lỗi khi cập nhật dịch vụ vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
    }
  };

  const handleDeleteService = async (service: any) => {
    if (!service || !service.id) {
      return;
    }
    
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${service.name}"?`)) {
      return;
    }
    
    try {
      // Kiểm tra xem dịch vụ có trong Firebase không
      const snapshot = await get(ref(db, `${DB_PATHS.SERVICES}/${service.id}`));
      
      if (snapshot.exists()) {
        // Xóa từ Firebase nếu có
        await remove(ref(db, `${DB_PATHS.SERVICES}/${service.id}`));
        // Services will be updated automatically via Firebase listener
      } else {
        // Nếu không có trong Firebase, chỉ xóa khỏi state local (MOCK data)
        setServices(prev => prev.filter(s => s.id !== service.id));
      }
    } catch (error: any) {
      console.error('Lỗi khi xóa dịch vụ:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-12">
      {/* Sidebar */}
      <CategorySidebar
        categories={CATEGORY_TREE}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Modal Xem Dịch Vụ */}
      {showViewModal && selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Chi Tiết Dịch Vụ</h2>
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedService(null);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                  <img src={selectedService.image} alt={selectedService.name} className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-2xl text-slate-100 mb-2">{selectedService.name}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-slate-400 bg-neutral-800 px-3 py-1 rounded border border-neutral-700">{selectedService.category}</span>
                    <span className="font-mono text-slate-600 text-sm">#{selectedService.id}</span>
                  </div>
                  <div className="font-bold text-2xl text-gold-500">
                    {selectedService.price.toLocaleString()} ₫
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Quy trình xử lý</label>
                  {(() => {
                    // Xử lý workflows có thể là mảng object {id, order} hoặc mảng string
                    let workflows: Array<{ id: string; order: number }> = [];
                    
                    if (selectedService.workflows && Array.isArray(selectedService.workflows)) {
                      workflows = selectedService.workflows;
                    } else {
                      const workflowIds = Array.isArray(selectedService.workflowId) 
                        ? selectedService.workflowId 
                        : [selectedService.workflowId].filter(Boolean);
                      workflows = workflowIds.map((id, index) => ({ id, order: index + 1 }));
                    }
                    
                    if (workflows.length === 0) {
                      return <span className="text-slate-500">Chưa gán quy trình</span>;
                    }
                    
                    return (
                      <div className="space-y-2">
                        {workflows
                          .sort((a, b) => a.order - b.order)
                          .map((w, idx) => {
                            const workflow = workflows.find(wf => wf.id === w.id);
                            return workflow ? (
                              <div key={w.id} className={`px-3 py-2 rounded-lg border flex items-center gap-3 ${workflow.color}`}>
                                <div className="w-6 h-6 rounded-full bg-gold-600/20 border border-gold-600/50 flex items-center justify-center text-gold-500 font-bold text-xs">
                                  {w.order}
                                </div>
                                <Layers size={14} />
                                <span className="font-semibold text-sm">{workflow.label}</span>
                                <span className="text-xs opacity-75">({workflow.department})</span>
                              </div>
                            ) : null;
                          })}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                  <p className="text-slate-300 bg-neutral-800 p-4 rounded-lg border border-neutral-700 whitespace-pre-wrap">
                    {selectedService.desc || 'Không có mô tả'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedService(null);
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Dịch Vụ */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Sửa Dịch Vụ</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedService(null);
                  setNewService({
                    name: '',
                    category: '',
                    price: '',
                    desc: '',
                    workflows: [],
                    image: ''
                  });
                  setWorkflowSearch('');
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tên dịch vụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                  placeholder="VD: Spa Túi Xách Premium"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newService.category}
                    onChange={(e) => setNewService({...newService, category: e.target.value})}
                    placeholder="VD: Túi Xách"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Cấp Độ Dịch Vụ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newService.tier}
                    onChange={(e) => setNewService({...newService, tier: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  >
                    {serviceTiers.map(tier => (
                      <option key={tier.id} value={tier.id}>{tier.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Giá dịch vụ (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService({...newService, price: e.target.value})}
                    placeholder="1500000"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Quy trình xử lý <span className="text-red-500">*</span>
                  <span className="text-xs text-slate-500 ml-2">(Có thể chọn nhiều, sắp xếp theo thứ tự)</span>
                </label>
                
                {/* Tìm kiếm quy trình */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={workflowSearch}
                      onChange={(e) => setWorkflowSearch(e.target.value)}
                      placeholder="Tìm kiếm quy trình..."
                      className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 text-sm"
                    />
                  </div>
                </div>
                
                {/* Danh sách quy trình để chọn */}
                <div className="max-h-64 overflow-y-auto border border-neutral-700 rounded-lg bg-neutral-800/50 p-3 space-y-2 mb-3">
                  {workflows.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      Đang tải quy trình từ Firebase...
                    </div>
                  ) : (
                    workflows
                      .filter(wf => {
                        if (!workflowSearch.trim()) return true;
                        const search = workflowSearch.toLowerCase();
                        return wf.label.toLowerCase().includes(search) ||
                               wf.department.toLowerCase().includes(search) ||
                               (wf.description && wf.description.toLowerCase().includes(search));
                      })
                      .map(wf => {
                        const isSelected = newService.workflows.some(w => w.id === wf.id);
                        return (
                          <label key={wf.id} className="flex items-start gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const maxOrder = newService.workflows.length > 0 
                                    ? Math.max(...newService.workflows.map(w => w.order))
                                    : 0;
                                  setNewService({
                                    ...newService, 
                                    workflows: [...newService.workflows, { id: wf.id, order: maxOrder + 1 }]
                                  });
                                } else {
                                  setNewService({
                                    ...newService, 
                                    workflows: newService.workflows
                                      .filter(w => w.id !== wf.id)
                                      .map((w, idx) => ({ ...w, order: idx + 1 }))
                                  });
                                }
                              }}
                              className="mt-1 w-4 h-4 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-gold-500" />
                                <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                  {wf.department}
                                </span>
                              </div>
                              {wf.description && (
                                <p className="text-xs text-slate-500 mt-1">{wf.description}</p>
                              )}
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
                
                {/* Danh sách quy trình đã chọn với thứ tự */}
                {newService.workflows.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-400 mb-2">Thứ tự thực hiện:</p>
                    {newService.workflows
                      .sort((a, b) => a.order - b.order)
                      .map((w, idx) => {
                        const wf = workflows.find(workflow => workflow.id === w.id);
                        if (!wf) return null;
                        return (
                          <div key={w.id} className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <GripVertical size={16} className="text-slate-600" />
                              <div className="w-8 h-8 rounded-full bg-gold-600/20 border border-gold-600/50 flex items-center justify-center text-gold-500 font-bold text-sm">
                                {w.order}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-gold-500" />
                                <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                  {wf.department}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  onClick={() => {
                                    const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                    [sorted[idx].order, sorted[idx - 1].order] = [sorted[idx - 1].order, sorted[idx].order];
                                    setNewService({ ...newService, workflows: sorted });
                                  }}
                                  className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                  title="Lên trước"
                                >
                                  <ArrowUp size={14} />
                                </button>
                              )}
                              {idx < newService.workflows.length - 1 && (
                                <button
                                  onClick={() => {
                                    const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                    [sorted[idx].order, sorted[idx + 1].order] = [sorted[idx + 1].order, sorted[idx].order];
                                    setNewService({ ...newService, workflows: sorted });
                                  }}
                                  className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                  title="Xuống sau"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">URL hình ảnh</label>
                <input
                  type="url"
                  value={newService.image}
                  onChange={(e) => setNewService({...newService, image: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                <textarea
                  value={newService.desc}
                  onChange={(e) => setNewService({...newService, desc: e.target.value})}
                  placeholder="Mô tả dịch vụ..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedService(null);
                  setNewService({
                    name: '',
                    category: '',
                    price: '',
                    desc: '',
                    workflows: [],
                    image: ''
                  });
                  setWorkflowSearch('');
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateService}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Cập Nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Dịch Vụ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Dịch Vụ Mới</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tên dịch vụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                  placeholder="VD: Spa Túi Xách Premium"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newService.category}
                    onChange={(e) => setNewService({...newService, category: e.target.value})}
                    placeholder="VD: Túi Xách"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Giá dịch vụ (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService({...newService, price: e.target.value})}
                    placeholder="1500000"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Quy trình xử lý <span className="text-red-500">*</span>
                  <span className="text-xs text-slate-500 ml-2">(Có thể chọn nhiều, sắp xếp theo thứ tự)</span>
                </label>
                
                {/* Tìm kiếm quy trình */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={workflowSearch}
                      onChange={(e) => setWorkflowSearch(e.target.value)}
                      placeholder="Tìm kiếm quy trình..."
                      className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 text-sm"
                    />
                  </div>
                </div>
                
                {/* Danh sách quy trình để chọn */}
                <div className="max-h-64 overflow-y-auto border border-neutral-700 rounded-lg bg-neutral-800/50 p-3 space-y-2 mb-3">
                  {workflows.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      Đang tải quy trình từ Firebase...
                    </div>
                  ) : (
                    workflows
                      .filter(wf => {
                        if (!workflowSearch.trim()) return true;
                        const search = workflowSearch.toLowerCase();
                        return wf.label.toLowerCase().includes(search) ||
                               wf.department.toLowerCase().includes(search) ||
                               (wf.description && wf.description.toLowerCase().includes(search));
                      })
                      .map(wf => {
                        const isSelected = newService.workflows.some(w => w.id === wf.id);
                        return (
                          <label key={wf.id} className="flex items-start gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const maxOrder = newService.workflows.length > 0 
                                    ? Math.max(...newService.workflows.map(w => w.order))
                                    : 0;
                                  setNewService({
                                    ...newService, 
                                    workflows: [...newService.workflows, { id: wf.id, order: maxOrder + 1 }]
                                  });
                                } else {
                                  setNewService({
                                    ...newService, 
                                    workflows: newService.workflows
                                      .filter(w => w.id !== wf.id)
                                      .map((w, idx) => ({ ...w, order: idx + 1 }))
                                  });
                                }
                              }}
                              className="mt-1 w-4 h-4 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-gold-500" />
                                <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                  {wf.department}
                                </span>
                              </div>
                              {wf.description && (
                                <p className="text-xs text-slate-500 mt-1">{wf.description}</p>
                              )}
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
                
                {/* Danh sách quy trình đã chọn với thứ tự */}
                {newService.workflows.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-400 mb-2">Thứ tự thực hiện:</p>
                    {newService.workflows
                      .sort((a, b) => a.order - b.order)
                      .map((w, idx) => {
                        const wf = workflows.find(workflow => workflow.id === w.id);
                        if (!wf) return null;
                        return (
                          <div key={w.id} className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <GripVertical size={16} className="text-slate-600" />
                              <div className="w-8 h-8 rounded-full bg-gold-600/20 border border-gold-600/50 flex items-center justify-center text-gold-500 font-bold text-sm">
                                {w.order}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-gold-500" />
                                <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                  {wf.department}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  onClick={() => {
                                    const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                    [sorted[idx].order, sorted[idx - 1].order] = [sorted[idx - 1].order, sorted[idx].order];
                                    setNewService({ ...newService, workflows: sorted });
                                  }}
                                  className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                  title="Lên trước"
                                >
                                  <ArrowUp size={14} />
                                </button>
                              )}
                              {idx < newService.workflows.length - 1 && (
                                <button
                                  onClick={() => {
                                    const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                    [sorted[idx].order, sorted[idx + 1].order] = [sorted[idx + 1].order, sorted[idx].order];
                                    setNewService({ ...newService, workflows: sorted });
                                  }}
                                  className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                  title="Xuống sau"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">URL hình ảnh</label>
                <input
                  type="url"
                  value={newService.image}
                  onChange={(e) => setNewService({...newService, image: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                <textarea
                  value={newService.desc}
                  onChange={(e) => setNewService({...newService, desc: e.target.value})}
                  placeholder="Mô tả dịch vụ..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewService({
                    name: '',
                    category: '',
                    price: '',
                    desc: '',
                    workflows: [],
                    image: ''
                  });
                  setWorkflowSearch('');
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddService}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Thêm Dịch Vụ
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Danh Mục Dịch Vụ</h1>
          <p className="text-slate-500 mt-1">Quản lý giá, mô tả và gán quy trình xử lý cho từng dịch vụ.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Thêm Dịch Vụ</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm dịch vụ..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-600"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <TableFilter onFilterChange={setFilter} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 text-sm focus:ring-1 focus:ring-gold-500 outline-none"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 text-sm focus:ring-1 focus:ring-gold-500 outline-none"
          >
            <option value="all">Tất cả cấp độ</option>
            {serviceTiers.map(tier => (
              <option key={tier.id} value={tier.id}>{tier.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Services List by Tier */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Đang tải dịch vụ...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {serviceTiers.map((tier) => {
            const tierServices = servicesByTier[tier.id] || [];
            const tierColor = tier.color;
            
            return (
              <div key={tier.id}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-4 ${tierColor}`}>
                  <div>
                    <h3 className="font-bold text-lg">{tier.name}</h3>
                    <p className="text-xs opacity-80">{tierServices.length} dịch vụ</p>
                  </div>
                </div>

                {tierServices.length === 0 ? (
                  <div className="bg-neutral-900/50 p-8 rounded-lg border border-dashed border-neutral-700 text-center text-slate-500">
                    Chưa có dịch vụ nào ở cấp này
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tierServices.map((service) => {
                      // Xử lý workflows có thể là mảng object {id, order} hoặc mảng string
                      let workflows: Array<{ id: string; order: number }> = [];
                      
                      if (service.workflows && Array.isArray(service.workflows)) {
                        workflows = service.workflows;
                      } else {
                        const workflowIds = Array.isArray(service.workflowId) 
                          ? service.workflowId 
                          : [service.workflowId].filter(Boolean);
                        workflows = workflowIds.map((id, index) => ({ id, order: index + 1 }));
                      }
                      
                      const sortedWorkflows = workflows
                        .sort((a, b) => a.order - b.order)
                        .map(w => workflows.find(wf => wf.id === w.id))
                        .filter(Boolean);
                      
                      return (
                        <div key={service.id} className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex gap-6 items-center hover:border-gold-900/30 transition-all">
                          <div className="w-24 h-24 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                            <img src={service.image} alt={service.name} className="w-full h-full object-cover opacity-80" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-lg text-slate-100">{service.name}</h3>
                                <div className="flex items-center gap-3 text-sm mt-1">
                                  <span className="text-slate-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">{service.category}</span>
                                  <span className="font-mono text-slate-600 text-xs">#{service.id}</span>
                                </div>
                              </div>
                              <ActionMenu
                                itemName={service.name}
                                onView={() => handleViewService(service)}
                                onEdit={() => handleEditService(service)}
                                onDelete={() => handleDeleteService(service)}
                              />
                            </div>
                            <p className="text-slate-500 text-sm mt-2 line-clamp-1">{service.desc}</p>
                            
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500 uppercase font-semibold">Quy trình:</span>
                                {sortedWorkflows.length > 0 ? (
                                  sortedWorkflows.map((workflow, idx) => {
                                    if (!workflow) return null;
                                    const workflowOrder = workflows.find(w => w.id === workflow.id)?.order || idx + 1;
                                    return (
                                      <span key={workflow.id} className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${workflow.color}`}>
                                        <span className="text-gold-500 font-mono">{workflowOrder}</span>
                                        <Layers size={12} />
                                        {workflow.label}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-slate-500">Chưa gán quy trình</span>
                                )}
                              </div>
                              <div className="font-bold text-lg text-gold-500">
                                {service.price.toLocaleString()} ₫
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredServices.length === 0 && (
            <div className="bg-neutral-900 p-8 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 text-center text-slate-500">
              Không tìm thấy dịch vụ nào phù hợp với bộ lọc
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};