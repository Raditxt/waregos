class ApiConstants {
  // Hostname mDNS — otomatis resolve di jaringan lokal
  // Tidak perlu IP manual
  static const String baseUrl = 'http://192.168.110.47:3001/api';
  
  // Auth
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';
  
  // Products
  static const String products = '/products';
  static const String lowStock = '/products/low-stock';
  static const String expiringSoon = '/products/expiring-soon';
  
  // Transactions
  static const String transactions = '/transactions';
  
  // Debts
  static const String debts = '/debts';
  static const String debtPayment = '/debts/payment';
  static const String debtSearch = '/debts/search';
  
  // Reports
  static const String reportSummary = '/reports/summary';
  static const String reportClosing = '/reports/closing';
  
  // Catalog
  static const String categories = '/catalog/categories';
  static const String units = '/catalog/units';
}