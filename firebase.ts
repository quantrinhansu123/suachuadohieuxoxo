import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Cấu hình Firebase - Sử dụng URL bạn cung cấp
// Lưu ý: Trong môi trường thực tế, bạn nên thêm apiKey, authDomain,... để bảo mật
const firebaseConfig = {
  databaseURL: "https://xoxo-b2c0d-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Định nghĩa tên bảng Tiếng Việt trong Database
export const DB_PATHS = {
  ORDERS: 'don_hang',           // Orders
  INVENTORY: 'kho_vat_tu',      // Inventory
  CUSTOMERS: 'khach_hang',      // Customers
  SERVICES: 'dich_vu_spa',      // Services
  PRODUCTS: 'san_pham_ban_le',  // Products
  WORKFLOWS: 'quy_trinh',       // Workflows
  MEMBERS: 'nhan_su',           // Members
};