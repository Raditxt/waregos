import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';

class ProductModel {
  final String id;
  final String name;
  final String? sku;
  final String? barcode;
  final String? categoryName;
  final String unitSymbol;
  final double? buyPrice;
  final double sellPrice;
  final int stock;
  final int minStock;
  final String? expiryDate;
  final String? expiryStatus;

  const ProductModel({
    required this.id,
    required this.name,
    this.sku,
    this.barcode,
    this.categoryName,
    required this.unitSymbol,
    this.buyPrice,
    required this.sellPrice,
    required this.stock,
    required this.minStock,
    this.expiryDate,
    this.expiryStatus,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      sku: json['sku'] as String?,
      barcode: json['barcode'] as String?,
      categoryName: json['categoryName'] as String?,
      unitSymbol: json['unitSymbol'] as String,
      buyPrice: json['buyPrice'] != null
          ? (json['buyPrice'] as num).toDouble()
          : null,
      sellPrice: (json['sellPrice'] as num).toDouble(),
      stock: json['stock'] as int,
      minStock: json['minStock'] as int,
      expiryDate: json['expiryDate'] as String?,
      expiryStatus: json['expiryStatus'] as String?,
    );
  }

  bool get isLowStock => stock <= minStock;
  bool get isExpired => expiryStatus == 'expired';
  bool get isExpiringSoon => expiryStatus == 'expiring_soon';
}

class ProductsState {
  final List<ProductModel> products;
  final List<ProductModel> lowStock;
  final List<ProductModel> expiringSoon;
  final int total; // jumlah di server (daftar bisa lebih pendek dari ini)
  final bool isLoading;
  final String? error;
  final String searchQuery;

  const ProductsState({
    this.products = const [],
    this.lowStock = const [],
    this.expiringSoon = const [],
    this.total = 0,
    this.isLoading = false,
    this.error,
    this.searchQuery = '',
  });

  ProductsState copyWith({
    List<ProductModel>? products,
    List<ProductModel>? lowStock,
    List<ProductModel>? expiringSoon,
    int? total,
    bool? isLoading,
    String? error,
    String? searchQuery,
  }) {
    return ProductsState(
      products: products ?? this.products,
      lowStock: lowStock ?? this.lowStock,
      expiringSoon: expiringSoon ?? this.expiringSoon,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class ProductsNotifier extends StateNotifier<ProductsState> {
  ProductsNotifier() : super(const ProductsState());

  List<ProductModel> _parseProducts(List raw) => raw
      .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
      .toList();

  int _totalOf(Response res, int fallback) {
    final meta = res.data['meta'];
    if (meta is Map && meta['total'] is num) {
      return (meta['total'] as num).toInt();
    }
    return fallback;
  }

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        ApiClient.get(ApiConstants.products, params: {'limit': '100'}),
        // Stok tipis difilter di server; bentuk datanya sama dengan daftar produk
        ApiClient.get(ApiConstants.products,
            params: {'lowStock': 'true', 'limit': '100'}),
        ApiClient.get(ApiConstants.expiringSoon),
      ]);

      for (final r in results) {
        if (!ApiClient.isSuccess(r)) {
          state = state.copyWith(
            isLoading: false,
            error: ApiClient.serverMessage(r) ?? 'Gagal memuat produk',
          );
          return;
        }
      }

      final products = _parseProducts(results[0].data['data'] as List);
      final lowStock = _parseProducts(results[1].data['data'] as List);

      final expiringSoon = (results[2].data['data'] as List)
          .map((e) => ProductModel.fromJson({
                'id': e['id'],
                'name': e['name'],
                'unitSymbol': e['unit'],
                'sellPrice': 0,
                'stock': e['stock'],
                'minStock': 0,
                'expiryDate': e['expiryDate'],
                'expiryStatus': e['status'],
              }))
          .toList();

      state = state.copyWith(
        products: products,
        lowStock: lowStock,
        expiringSoon: expiringSoon,
        total: _totalOf(results[0], products.length),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiClient.describeError(e, fallback: 'Gagal memuat produk'),
      );
    }
  }

  Future<void> search(String query) async {
    state = state.copyWith(searchQuery: query);

    // Jeda singkat: kalau ada ketikan baru, pencarian ini dibatalkan
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (state.searchQuery != query) return;

    if (query.isEmpty) {
      await loadAll();
      return;
    }
    try {
      final res = await ApiClient.get(
        ApiConstants.products,
        params: {'search': query, 'limit': '50'},
      );
      if (state.searchQuery != query) return; // jawaban lama, sudah ada ketikan baru
      if (!ApiClient.isSuccess(res)) return;
      final products = _parseProducts(res.data['data'] as List);
      state = state.copyWith(
        products: products,
        total: _totalOf(res, products.length),
      );
    } catch (_) {}
  }
}

final productsProvider =
    StateNotifierProvider<ProductsNotifier, ProductsState>((ref) {
  return ProductsNotifier();
});