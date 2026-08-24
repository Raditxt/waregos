import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/products_provider.dart'; // adjust import to your project structure

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();

  final _rupiahFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(productsProvider.notifier).loadAll();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(productsProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Cari produk...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        ref.read(productsProvider.notifier).loadAll();
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16, vertical: 12,
              ),
            ),
            onChanged: (v) =>
                ref.read(productsProvider.notifier).search(v),
          ),
        ),

        // Tabs
        TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Semua (${state.products.length})'),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (state.lowStock.isNotEmpty)
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(right: 4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                  Text('Stok Tipis (${state.lowStock.length})'),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (state.expiringSoon.isNotEmpty)
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(right: 4),
                      decoration: const BoxDecoration(
                        color: Colors.orange,
                        shape: BoxShape.circle,
                      ),
                    ),
                  Text('Kadaluarsa (${state.expiringSoon.length})'),
                ],
              ),
            ),
          ],
          labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 12),
        ),

        // Content
        Expanded(
          child: state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : state.error != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline,
                              size: 48, color: colorScheme.error),
                          const SizedBox(height: 8),
                          Text(state.error!),
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: () =>
                                ref.read(productsProvider.notifier).loadAll(),
                            child: const Text('Coba Lagi'),
                          ),
                        ],
                      ),
                    )
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildProductList(state.products, colorScheme),
                        _buildLowStockList(state.lowStock, colorScheme),
                        _buildExpirySoonList(state.expiringSoon, colorScheme),
                      ],
                    ),
        ),
      ],
    );
  }

  Widget _buildProductList(
      List<ProductModel> products, ColorScheme colorScheme) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined,
                size: 48, color: colorScheme.outlineVariant),
            const SizedBox(height: 8),
            Text('Tidak ada produk',
                style: GoogleFonts.inter(color: colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(productsProvider.notifier).loadAll(),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: products.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (ctx, i) => _buildProductCard(products[i], colorScheme),
      ),
    );
  }

  Widget _buildProductCard(ProductModel p, ColorScheme colorScheme) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: p.isLowStock
                    ? Colors.red.shade50
                    : colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.inventory_2_rounded,
                size: 22,
                color: p.isLowStock
                    ? Colors.red.shade600
                    : colorScheme.onPrimaryContainer,
              ),
            ),
            const SizedBox(width: 12),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (p.categoryName != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: colorScheme.secondaryContainer,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            p.categoryName!,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              color: colorScheme.onSecondaryContainer,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        _rupiahFormat.format(p.sellPrice),
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  if (p.isExpired || p.isExpiringSoon) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.warning_amber_rounded,
                          size: 12,
                          color: p.isExpired
                              ? Colors.red.shade600
                              : Colors.orange.shade600,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          p.isExpired ? 'Sudah kadaluarsa' : 'Segera kadaluarsa',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: p.isExpired
                                ? Colors.red.shade600
                                : Colors.orange.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Stock badge
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: p.isLowStock
                        ? Colors.red.shade100
                        : Colors.grey.shade100,
                  ),
                  child: Text(
                    '${p.stock} ${p.unitSymbol}',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: p.isLowStock
                          ? Colors.red.shade700
                          : Colors.grey.shade700,
                    ),
                  ),
                ),
                if (p.isLowStock) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Stok tipis',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      color: Colors.red.shade600,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLowStockList(
      List<ProductModel> products, ColorScheme colorScheme) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline,
                size: 48, color: Colors.green.shade400),
            const SizedBox(height: 8),
            Text(
              'Semua stok aman!',
              style: GoogleFonts.inter(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) => _buildProductCard(products[i], colorScheme),
    );
  }

  Widget _buildExpirySoonList(
      List<ProductModel> products, ColorScheme colorScheme) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline,
                size: 48, color: Colors.green.shade400),
            const SizedBox(height: 8),
            Text(
              'Tidak ada produk hampir kadaluarsa!',
              style: GoogleFonts.inter(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final p = products[i];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: p.isExpired
                  ? Colors.red.shade200
                  : Colors.orange.shade200,
            ),
          ),
          color: p.isExpired
              ? Colors.red.shade50
              : Colors.orange.shade50,
          child: ListTile(
            leading: Icon(
              Icons.warning_amber_rounded,
              color: p.isExpired
                  ? Colors.red.shade600
                  : Colors.orange.shade600,
            ),
            title: Text(
              p.name,
              style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            ),
            subtitle: Text(
              p.expiryDate != null
                  ? 'Kadaluarsa: ${DateFormat('d MMM yyyy').format(DateTime.parse(p.expiryDate!))}'
                  : '',
              style: GoogleFonts.inter(fontSize: 12),
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: p.isExpired
                    ? Colors.red.shade100
                    : Colors.orange.shade100,
              ),
              child: Text(
                p.isExpired ? 'Expired' : 'Segera',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: p.isExpired
                      ? Colors.red.shade700
                      : Colors.orange.shade700,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}