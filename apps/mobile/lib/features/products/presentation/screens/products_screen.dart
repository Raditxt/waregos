import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:animations/animations.dart';
import '../providers/products_provider.dart'; // adjust import to your project structure
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/status_badge.dart';

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
    final semantic = Theme.of(context).extension<AppSemanticColors>()!;

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
                  if (state.lowStock.isNotEmpty) ...[
                    _PulsingDot(color: colorScheme.error),
                    const SizedBox(width: 4),
                  ],
                  Text('Stok Tipis (${state.lowStock.length})'),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (state.expiringSoon.isNotEmpty) ...[
                    _PulsingDot(color: semantic.warning),
                    const SizedBox(width: 4),
                  ],
                  Text('Kadaluarsa (${state.expiringSoon.length})'),
                ],
              ),
            ),
          ],
          labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 12),
        ),

        // Content — fade-through antar state (loading/error/data), bukan ganti tiba-tiba
        Expanded(
          child: PageTransitionSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, animation, secondaryAnimation) {
              return FadeThroughTransition(
                animation: animation,
                secondaryAnimation: secondaryAnimation,
                child: child,
              );
            },
            child: state.isLoading
                ? const Center(
                    key: ValueKey('loading'),
                    child: CircularProgressIndicator(),
                  )
                : state.error != null
                    ? Center(
                        key: const ValueKey('error'),
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
                        key: const ValueKey('data'),
                        controller: _tabController,
                        children: [
                          _buildProductList(state.products, colorScheme, semantic),
                          _buildLowStockList(state.lowStock, colorScheme, semantic),
                          _buildExpirySoonList(state.expiringSoon, colorScheme, semantic),
                        ],
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildProductList(
      List<ProductModel> products, ColorScheme colorScheme, AppSemanticColors semantic) {
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
        ).animate().fadeIn(duration: 300.ms),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(productsProvider.notifier).loadAll(),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: products.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (ctx, i) => _buildProductCard(products[i], colorScheme, semantic, i),
      ),
    );
  }

  Widget _buildProductCard(
      ProductModel p, ColorScheme colorScheme, AppSemanticColors semantic, int index) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: p.isLowStock ? colorScheme.error.withValues(alpha: 0.3) : colorScheme.outlineVariant,
        ),
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
                color: p.isLowStock ? colorScheme.errorContainer : colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.inventory_2_rounded,
                size: 22,
                color: p.isLowStock ? colorScheme.error : colorScheme.onPrimaryContainer,
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
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (p.categoryName != null) ...[
                        StatusBadge(label: p.categoryName!, variant: BadgeVariant.accent),
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
                    StatusBadge(
                      label: p.isExpired ? 'Sudah kadaluarsa' : 'Segera kadaluarsa',
                      variant: p.isExpired ? BadgeVariant.error : BadgeVariant.warning,
                      icon: Icons.warning_amber_rounded,
                    ),
                  ],
                ],
              ),
            ),

            // Stock badge
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                StatusBadge(
                  label: '${p.stock} ${p.unitSymbol}',
                  variant: p.isLowStock ? BadgeVariant.error : BadgeVariant.neutral,
                ),
                if (p.isLowStock) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Stok tipis',
                    style: GoogleFonts.inter(fontSize: 10, color: colorScheme.error),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    )
        .animate(delay: (index * 40).ms)
        .fadeIn(duration: 300.ms, curve: Curves.easeOut)
        .slideY(begin: 0.08, end: 0, duration: 300.ms, curve: Curves.easeOut);
  }

  Widget _buildLowStockList(
      List<ProductModel> products, ColorScheme colorScheme, AppSemanticColors semantic) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 48, color: semantic.success),
            const SizedBox(height: 8),
            Text(
              'Semua stok aman!',
              style: GoogleFonts.inter(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ).animate().fadeIn(duration: 300.ms).scale(begin: const Offset(0.9, 0.9)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) => _buildProductCard(products[i], colorScheme, semantic, i),
    );
  }

  Widget _buildExpirySoonList(
      List<ProductModel> products, ColorScheme colorScheme, AppSemanticColors semantic) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 48, color: semantic.success),
            const SizedBox(height: 8),
            Text(
              'Tidak ada produk hampir kadaluarsa!',
              style: GoogleFonts.inter(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ).animate().fadeIn(duration: 300.ms).scale(begin: const Offset(0.9, 0.9)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final p = products[i];
        final isExpired = p.isExpired;
        final tint = isExpired ? colorScheme.error : semantic.warning;
        final tintContainer = isExpired ? colorScheme.errorContainer : semantic.warningContainer;

        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: tint.withValues(alpha: 0.35)),
          ),
          color: tintContainer,
          child: ListTile(
            leading: Icon(Icons.warning_amber_rounded, color: tint),
            title: Text(
              p.name,
              style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: colorScheme.onSurface),
            ),
            subtitle: Text(
              p.expiryDate != null
                  ? 'Kadaluarsa: ${DateFormat('d MMM yyyy').format(DateTime.parse(p.expiryDate!))}'
                  : '',
              style: GoogleFonts.inter(fontSize: 12, color: colorScheme.onSurfaceVariant),
            ),
            trailing: StatusBadge(
              label: isExpired ? 'Expired' : 'Segera',
              variant: isExpired ? BadgeVariant.error : BadgeVariant.warning,
            ),
          ),
        ).animate(delay: (i * 40).ms).fadeIn(duration: 300.ms).slideY(begin: 0.08, end: 0);
      },
    );
  }
}

/// Dot kecil berdenyut pelan — dipakai sebagai cue "butuh perhatian"
/// di tab Stok Tipis / Kadaluarsa. Bukan dekorasi: fungsinya menarik
/// mata kasir ke tab yang ada masalahnya, konsisten dengan prinsip
/// "animasi mobile = membangun kepercayaan diri aksi", bukan estetika semata.
class _PulsingDot extends StatelessWidget {
  final Color color;
  const _PulsingDot({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
          duration: 700.ms,
          begin: const Offset(1, 1),
          end: const Offset(1.4, 1.4),
          curve: Curves.easeInOut,
        );
  }
}