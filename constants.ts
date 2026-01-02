import { Order, OrderStatus, ServiceType, Customer, CRMTask, RevenueStat, InventoryItem, Member, ServiceCatalogItem, Product, WorkflowDefinition, CompanyConfig, RoleConfig, SalaryConfig } from './types';

// --- 3. KHO VẬN (INVENTORY) ---
export const MOCK_INVENTORY: InventoryItem[] = [
  { 
    id: 'INV001', 
    sku: 'CHEM-SAP-01', 
    name: 'Xi Saphir Medaille d\'Or (Đen)', 
    category: 'Hoá chất', 
    quantity: 15, 
    unit: 'Hộp', 
    minThreshold: 5, 
    importPrice: 350000, 
    supplier: 'Saphir Vietnam', 
    lastImport: '20/09/2023',
    image: 'https://images.unsplash.com/photo-1617260053912-32b70f058090?auto=format&fit=crop&q=80&w=200&h=200' 
  },
  { 
    id: 'INV002', 
    sku: 'CHEM-ANG-02', 
    name: 'Dung dịch vệ sinh Angelus', 
    category: 'Hoá chất', 
    quantity: 4, 
    unit: 'Chai 1L', 
    minThreshold: 5, 
    importPrice: 850000, 
    supplier: 'Angelus Direct', 
    lastImport: '15/10/2023',
    image: 'https://images.unsplash.com/photo-1620505199676-e918544e9999?auto=format&fit=crop&q=80&w=200&h=200' 
  },
  { 
    id: 'INV003', 
    sku: 'ACC-ZIP-YKK', 
    name: 'Đầu khoá YKK Vàng số 5', 
    category: 'Phụ kiện', 
    quantity: 150, 
    unit: 'Cái', 
    minThreshold: 50, 
    importPrice: 15000, 
    supplier: 'Khoá Kéo YKK', 
    lastImport: '01/10/2023',
    image: 'https://images.unsplash.com/photo-1598532163257-52c676d1e466?auto=format&fit=crop&q=80&w=200&h=200' 
  },
  { 
    id: 'INV004', 
    sku: 'TOOL-BRUSH-01', 
    name: 'Bàn chải lông ngựa cao cấp', 
    category: 'Dụng cụ', 
    quantity: 8, 
    unit: 'Cái', 
    minThreshold: 3, 
    importPrice: 250000, 
    supplier: 'Local Craft', 
    lastImport: '10/08/2023',
    image: 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&q=80&w=200&h=200' 
  },
  { 
    id: 'INV005', 
    sku: 'MAT-COTTON', 
    name: 'Khăn Cotton chuyên dụng', 
    category: 'Vật tư tiêu hao', 
    quantity: 200, 
    unit: 'Cái', 
    minThreshold: 100, 
    importPrice: 5000, 
    supplier: 'Vải Sợi SG', 
    lastImport: '25/10/2023',
    image: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=200&h=200' 
  },
  { 
    id: 'INV006', 
    sku: 'CHEM-GOLD-24K', 
    name: 'Dung dịch mạ vàng 24K', 
    category: 'Hoá chất', 
    quantity: 1, 
    unit: 'Lít', 
    minThreshold: 1, 
    importPrice: 15000000, 
    supplier: 'Gold Plating Tech', 
    lastImport: '10/09/2023',
    image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=200&h=200' 
  },
];

// --- 0. QUY TRÌNH (WORKFLOWS) ---
// Updated colors for Dark Theme compatibility
export const MOCK_WORKFLOWS: WorkflowDefinition[] = [
  { 
    id: 'SPA', 
    label: 'Quy trình Spa & Vệ sinh', 
    types: [ServiceType.CLEANING],
    description: 'Quy trình tiêu chuẩn cho việc làm sạch, vệ sinh và khử mùi.',
    color: 'bg-blue-900/30 text-blue-400 border-blue-800',
    department: 'Spa',
    materials: [
      { inventoryItemId: 'INV002', quantity: 0.1 }, // 100ml Angelus
      { inventoryItemId: 'INV005', quantity: 2 }    // 2 Khăn
    ]
  },
  { 
    id: 'REPAIR', 
    label: 'Quy trình Sửa chữa & Phục hồi', 
    types: [ServiceType.REPAIR, ServiceType.DYEING, ServiceType.CUSTOM],
    description: 'Dành cho các dịch vụ sửa chữa lỗi, dặm màu, nhuộm đổi màu.',
    color: 'bg-orange-900/30 text-orange-400 border-orange-800',
    department: 'Kỹ Thuật',
    materials: [
      { inventoryItemId: 'INV001', quantity: 1 } // 1 Hộp Xi
    ]
  },
  { 
    id: 'PLATING', 
    label: 'Quy trình Xi mạ & Kim loại', 
    types: [ServiceType.PLATING],
    description: 'Xử lý các chi tiết kim loại, xi mạ vàng 18k/24k.',
    color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    department: 'Kỹ Thuật',
    materials: [
      { inventoryItemId: 'INV006', quantity: 0.05 } // 50ml vàng
    ]
  },
  { 
    id: 'QC_FINAL', 
    label: 'Quy trình Kiểm định (QC)', 
    types: [],
    description: 'Kiểm tra chất lượng cuối cùng trước khi đóng gói.',
    color: 'bg-purple-900/30 text-purple-400 border-purple-800',
    department: 'QA/QC'
  }
];

// --- SETTINGS MOCK DATA ---
export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  name: 'XOXO Luxury Repair',
  slogan: 'Nâng niu giá trị thời gian',
  address: '88 Đồng Khởi, Quận 1, TP. Hồ Chí Minh',
  phone: '0909 888 999',
  email: 'contact@xoxo.vn',
  website: 'www.xoxoluxury.vn',
  logoUrl: 'https://via.placeholder.com/150/000000/FFFFFF?text=XOXO',
  themeColor: '#c68a35' // Gold
};

export const MOCK_ROLES: RoleConfig[] = [
  { 
    id: 'ADMIN', 
    name: 'Quản trị viên', 
    permissions: { dashboard: true, customers: true, orders: true, inventory: true, settings: true } 
  },
  { 
    id: 'MANAGER', 
    name: 'Quản lý cửa hàng', 
    permissions: { dashboard: true, customers: true, orders: true, inventory: true, settings: false } 
  },
  { 
    id: 'TECH', 
    name: 'Kỹ thuật viên', 
    permissions: { dashboard: false, customers: false, orders: true, inventory: false, settings: false } 
  },
  { 
    id: 'SALE', 
    name: 'Tư vấn viên', 
    permissions: { dashboard: true, customers: true, orders: true, inventory: false, settings: false } 
  }
];

export const MOCK_SALARIES: SalaryConfig[] = [
  {
    roleId: 'TECH',
    baseSalary: 8000000,
    allowance: 1000000,
    commissionRate: {
      [ServiceType.CLEANING]: 10, // 10%
      [ServiceType.REPAIR]: 15,
      [ServiceType.PLATING]: 20
    }
  },
  {
    roleId: 'SALE',
    baseSalary: 6000000,
    allowance: 500000,
    commissionRate: {
      [ServiceType.CLEANING]: 5,
      [ServiceType.REPAIR]: 5,
      [ServiceType.PLATING]: 5
    }
  }
];

// --- 1. KHÁCH HÀNG (CRM) ---
export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'C001', 
    name: 'Nguyễn Thùy Linh', 
    phone: '0909123456', 
    email: 'linh.nguyen@gmail.com', 
    address: 'Vinhomes Central Park, Bình Thạnh, HCM',
    tier: 'VVIP', 
    totalSpent: 125000000, 
    lastVisit: '2023-10-25',
    notes: 'Khách khó tính, thích dùng đồ Hermes, yêu cầu giao nhận tại nhà.'
  },
  { 
    id: 'C002', 
    name: 'Trần Minh Tuấn', 
    phone: '0918889999', 
    email: 'tuan.tran@ceo.vn', 
    address: 'Thảo Điền, Quận 2, HCM',
    tier: 'VIP', 
    totalSpent: 45000000, 
    lastVisit: '2023-10-20',
    notes: 'Thường spa giày tây và cặp da công sở.'
  },
  { 
    id: 'C003', 
    name: 'Lê Thị Hồng Hạnh', 
    phone: '0933456789', 
    email: 'hanh.le@showroom.com', 
    address: 'Quận 1, HCM',
    tier: 'Standard', 
    totalSpent: 2000000, 
    lastVisit: '2023-10-15' 
  },
  { 
    id: 'C004', 
    name: 'Phạm Hương Giang', 
    phone: '0987654321', 
    email: 'giang.pham@model.vn', 
    address: 'Quận 7, HCM',
    tier: 'VIP', 
    totalSpent: 28000000, 
    lastVisit: '2023-10-28' 
  },
  { 
    id: 'C005', 
    name: 'Đặng Văn Lâm', 
    phone: '0901239876', 
    email: 'lam.dang@sport.vn', 
    address: 'Quận 3, HCM',
    tier: 'Standard', 
    totalSpent: 1500000, 
    lastVisit: '2023-10-01' 
  }
];

// --- 2. NHÂN SỰ (MEMBERS) ---
export const MOCK_MEMBERS: Member[] = [
  { id: 'S001', name: 'Ngô Thanh Vân', role: 'Quản lý', phone: '0909000001', email: 'van.ngo@xoxo.vn', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=van' },
  { id: 'S002', name: 'Lê Bảo Trung', role: 'Kỹ thuật viên', phone: '0909000002', email: 'trung.le@xoxo.vn', status: 'Active', specialty: 'Phục hồi màu', avatar: 'https://i.pravatar.cc/150?u=trung' },
  { id: 'S003', name: 'Phạm Quỳnh Anh', role: 'Tư vấn viên', phone: '0909000003', email: 'anh.pham@xoxo.vn', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=anh' },
  { id: 'S004', name: 'Trương Thế Vinh', role: 'Kỹ thuật viên', phone: '0909000004', email: 'vinh.truong@xoxo.vn', status: 'Active', specialty: 'Xi mạ vàng', avatar: 'https://i.pravatar.cc/150?u=vinh' },
  { id: 'S005', name: 'Mai Phương Thúy', role: 'QC', phone: '0909000005', email: 'thuy.mai@xoxo.vn', status: 'Off', avatar: 'https://i.pravatar.cc/150?u=thuy' },
];

// --- 4. DANH MỤC DỊCH VỤ (SERVICE CATALOG) ---
export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { 
    id: 'SVC-001', 
    name: 'Spa Túi Xách Basic', 
    category: 'Túi Xách', 
    price: 800000, 
    desc: 'Vệ sinh bề mặt, dưỡng da, khử mùi nhẹ.', 
    workflowId: 'SPA',
    image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-002', 
    name: 'Spa Túi Xách Deep Clean', 
    category: 'Túi Xách', 
    price: 1500000, 
    desc: 'Vệ sinh sâu, xử lý nấm mốc, khử mùi ozon, dưỡng da chuyên sâu.', 
    workflowId: 'SPA',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-003', 
    name: 'Phục Hồi Màu Túi (Retouch)', 
    category: 'Sửa Chữa', 
    price: 2500000, 
    desc: 'Dặm màu các vết xước góc, trầy xước bề mặt, phục hồi màu nguyên bản.', 
    workflowId: 'REPAIR',
    image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-004', 
    name: 'Đổi Màu Túi (Recolor)', 
    category: 'Sửa Chữa', 
    price: 4500000, 
    desc: 'Sơn đổi màu toàn bộ túi theo yêu cầu, phủ lớp bảo vệ.', 
    workflowId: 'REPAIR',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-005', 
    name: 'Xi Mạ Vàng 18K/24K Logo', 
    category: 'Xi Mạ', 
    price: 3000000, 
    desc: 'Mạ vàng thật cho logo, khoá kéo, chi tiết kim loại.', 
    workflowId: 'PLATING',
    image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-006', 
    name: 'Vệ Sinh Giày Sneaker', 
    category: 'Giày', 
    price: 250000, 
    desc: 'Vệ sinh tay, chiếu UV diệt khuẩn, hong khô.', 
    workflowId: 'SPA',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-007', 
    name: 'Patina Giày Tây', 
    category: 'Giày', 
    price: 1800000, 
    desc: 'Đánh màu nghệ thuật Patina, tạo hiệu ứng chuyển màu sang trọng.', 
    workflowId: 'REPAIR',
    image: 'https://images.unsplash.com/photo-1478683011038-16430b1a5ad1?auto=format&fit=crop&q=80&w=400&h=400'
  },
  { 
    id: 'SVC-008', 
    name: 'Dán Đế Vibram', 
    category: 'Sửa Chữa', 
    price: 850000, 
    desc: 'Dán đế bảo vệ chống trượt Vibram chính hãng.', 
    workflowId: 'REPAIR',
    image: 'https://images.unsplash.com/photo-1534653299134-96a171b61581?auto=format&fit=crop&q=80&w=400&h=400'
  },
];

// --- 5. SẢN PHẨM BÁN KÈM (PRODUCTS) ---
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'PROD-001',
    name: 'Bộ Vệ Sinh Giày Cao Cấp Crep Protect',
    category: 'Vệ Sinh Giày',
    price: 850000,
    stock: 24,
    image: 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Combo bàn chải, dung dịch vệ sinh và khăn lau.'
  },
  {
    id: 'PROD-002',
    name: 'Xi Saphir Pommadier 1925',
    category: 'Chăm Sóc Da',
    price: 450000,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1617260053912-32b70f058090?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Xi kem cao cấp giúp dưỡng da và phục hồi màu.'
  },
  {
    id: 'PROD-003',
    name: 'Chai Xịt Chống Thấm Nano',
    category: 'Bảo Vệ',
    price: 350000,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1620505199676-e918544e9999?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Bảo vệ giày và túi khỏi nước và vết bẩn.'
  },
  {
    id: 'PROD-004',
    name: 'Cây Giữ Form Giày (Shoe Tree) Gỗ Tuyết Tùng',
    category: 'Phụ Kiện',
    price: 650000,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Giữ form giày tây, hút ẩm và khử mùi.'
  },
  {
    id: 'PROD-005',
    name: 'Khăn Lau Da Chuyên Dụng (Set 3)',
    category: 'Phụ Kiện',
    price: 150000,
    stock: 100,
    image: 'https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Sợi microfiber mềm mịn, không gây trầy xước da.'
  }
];

// --- 6. DANH SÁCH ĐƠN HÀNG (MOCK ORDERS) ---
export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2023-001',
    customerId: 'C001',
    customerName: 'Nguyễn Thùy Linh',
    items: [
      {
        id: 'SI-001',
        name: 'Spa Túi Hermes Birkin',
        type: ServiceType.CLEANING,
        price: 2500000,
        status: 'Repairing',
        quantity: 1,
        beforeImage: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80&w=400&h=400'
      },
      {
        id: 'SI-002',
        name: 'Vệ sinh Giày Gucci',
        type: ServiceType.CLEANING,
        price: 450000,
        status: 'In Queue',
        quantity: 1,
        beforeImage: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=400&h=400'
      }
    ],
    totalAmount: 2950000,
    deposit: 1500000,
    status: OrderStatus.PROCESSING,
    createdAt: '2023-10-25',
    expectedDelivery: '2023-11-01',
    notes: 'Khách yêu cầu giữ nguyên tag.'
  },
  {
    id: 'ORD-2023-002',
    customerId: 'C002',
    customerName: 'Trần Minh Tuấn',
    items: [
      {
        id: 'SI-003',
        name: 'Dán Đế Vibram Giày Tây',
        type: ServiceType.REPAIR,
        price: 850000,
        status: 'Ready',
        quantity: 1,
        beforeImage: 'https://images.unsplash.com/photo-1478683011038-16430b1a5ad1?auto=format&fit=crop&q=80&w=400&h=400'
      }
    ],
    totalAmount: 850000,
    deposit: 850000,
    status: OrderStatus.DONE,
    createdAt: '2023-10-20',
    expectedDelivery: '2023-10-25'
  },
  {
    id: 'ORD-2023-003',
    customerId: 'C004',
    customerName: 'Phạm Hương Giang',
    items: [
      {
        id: 'SI-004',
        name: 'Đổi Màu Túi Chanel',
        type: ServiceType.CUSTOM,
        price: 4500000,
        status: 'Cleaning',
        quantity: 1,
        beforeImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400&h=400'
      }
    ],
    totalAmount: 4500000,
    deposit: 2000000,
    status: OrderStatus.CONFIRMED,
    createdAt: '2023-10-28',
    expectedDelivery: '2023-11-10'
  },
  {
    id: 'ORD-2023-004',
    customerId: 'C003',
    customerName: 'Lê Thị Hồng Hạnh',
    items: [
      {
        id: 'SI-005',
        name: 'Xi Mạ Khóa Vàng 18K',
        type: ServiceType.PLATING,
        price: 3000000,
        status: 'QC',
        quantity: 1,
        beforeImage: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&q=80&w=400&h=400'
      }
    ],
    totalAmount: 3000000,
    deposit: 1500000,
    status: OrderStatus.PROCESSING,
    createdAt: '2023-10-26',
    expectedDelivery: '2023-11-05'
  }
];

// --- 7. DỮ LIỆU BIỂU ĐỒ & CRM (CHART DATA & TASKS) ---
export const REVENUE_DATA: RevenueStat[] = [
  { name: 'T2', value: 12500000 },
  { name: 'T3', value: 18200000 },
  { name: 'T4', value: 15800000 },
  { name: 'T5', value: 24500000 },
  { name: 'T6', value: 21000000 },
  { name: 'T7', value: 38000000 },
  { name: 'CN', value: 32000000 },
];

export const MOCK_CRM_TASKS: CRMTask[] = [
  { 
    id: 'TSK-1', 
    customerId: 'C001', 
    customerName: 'Nguyễn Thùy Linh', 
    type: 'Call Day 3', 
    dueDate: 'Hôm nay', 
    status: 'Pending' 
  },
  { 
    id: 'TSK-2', 
    customerId: 'C002', 
    customerName: 'Trần Minh Tuấn', 
    type: 'Warranty Check', 
    dueDate: 'Hôm qua', 
    status: 'Overdue' 
  },
  { 
    id: 'TSK-3', 
    customerId: 'C005', 
    customerName: 'Đặng Văn Lâm', 
    type: 'Birthday', 
    dueDate: '02/11/2023', 
    status: 'Pending' 
  },
  { 
    id: 'TSK-4', 
    customerId: 'C003', 
    customerName: 'Lê Thị Hồng Hạnh', 
    type: 'Call Day 7', 
    dueDate: '03/11/2023', 
    status: 'Pending' 
  }
];