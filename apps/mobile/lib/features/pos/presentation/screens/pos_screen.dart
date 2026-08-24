import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/pos_provider.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();
  final _paidController = TextEditingController();
  final _customerController = TextEditingController();
  String _paymentMethod = 'CASH';
  String? _lastSavedTime;

  final _rupiahFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    _paidController.dispose();
    _customerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pos = ref.watch(posProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        // Last saved marker
        if (_lastSavedTime != null)
          Container(
            width: double.infinity,
            color: Colors.green.shade50,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.check_circle, size: 14, color: Colors.green.shade700),
                const SizedBox(width: 6),
                Text(
                  'Transaksi terakhir tersimpan: $_lastSavedTime',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: Colors.green.shade700,
                  ),
                ),
              ],
            ),
          ),

        Expanded(
          child: Row(
            children: [
              // LEFT — Search + Cart
              Expanded(
                flex: 6,
                child: Column(
                  children: [
                    // Search bar
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: TextField(
                        controller: _searchController,
                        focusNode: _searchFocus,
                        decoration: InputDecoration(
                          hintText: 'Cari produk...',
                          prefixIcon: const Icon(Icons.search_rounded),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchController.clear();
                                    ref.read(posProvider.notifier).clearSearch();
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
                        onChanged: (v) {
                          ref.read(posProvider.notifier).searchProducts(v);
                        },
                      ),
                    ),

                    // Product grid (saat search)
                    if (pos.searchResults.isNotEmpty)
                      Container(
                        height: 200,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 1.3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                          ),
                          itemCount: pos.searchResults.length,
                          itemBuilder: (ctx, i) {
                            final p = pos.searchResults[i];
                            final outOfStock = p.stock <= 0;
                            return GestureDetector(
                              onTap: outOfStock ? null : () {
                                ref.read(posProvider.notifier).addToCart(p);
                                _searchController.clear();
                                ref.read(posProvider.notifier).clearSearch();
                                _searchFocus.requestFocus();
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: outOfStock
                                        ? Colors.grey.shade300
                                        : colorScheme.outlineVariant,
                                  ),
                                  color: outOfStock
                                      ? Colors.grey.shade100
                                      : colorScheme.surface,
                                ),
                                padding: const EdgeInsets.all(8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      p.name,
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: outOfStock ? Colors.grey : null,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _rupiahFormat.format(p.sellPrice),
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: outOfStock
                                                ? Colors.grey
                                                : colorScheme.primary,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(4),
                                            color: outOfStock
                                                ? Colors.red.shade100
                                                : Colors.grey.shade100,
                                          ),
                                          child: Text(
                                            outOfStock
                                                ? 'Habis'
                                                : '${p.stock} ${p.unitSymbol}',
                                            style: GoogleFonts.inter(
                                              fontSize: 10,
                                              color: outOfStock
                                                  ? Colors.red.shade700
                                                  : Colors.grey.shade700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                    // Cart
                    Expanded(
                      child: pos.cart.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.shopping_cart_outlined,
                                    size: 48,
                                    color: colorScheme.outlineVariant,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Keranjang kosong',
                                    style: GoogleFonts.inter(
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                  Text(
                                    'Cari produk di atas',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : Column(
                              children: [
                                // Cart header
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8,
                                  ),
                                  child: Row(
                                    children: [
                                      Text(
                                        'Keranjang (${pos.cart.length})',
                                        style: GoogleFonts.inter(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const Spacer(),
                                      TextButton.icon(
                                        onPressed: () {
                                          ref.read(posProvider.notifier).clearCart();
                                        },
                                        icon: const Icon(Icons.delete_outline, size: 16),
                                        label: const Text('Kosongkan'),
                                        style: TextButton.styleFrom(
                                          foregroundColor: Colors.red,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Cart items
                                Expanded(
                                  child: ListView.builder(
                                    itemCount: pos.cart.length,
                                    itemBuilder: (ctx, i) {
                                      final item = pos.cart[i];
                                      return ListTile(
                                        dense: true,
                                        title: Text(
                                          item.name,
                                          style: GoogleFonts.inter(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        subtitle: Text(
                                          _rupiahFormat.format(item.sellPrice),
                                          style: GoogleFonts.inter(fontSize: 12),
                                        ),
                                        trailing: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            IconButton(
                                              icon: const Icon(Icons.remove_circle_outline),
                                              iconSize: 20,
                                              onPressed: () {
                                                ref.read(posProvider.notifier)
                                                    .updateQty(item.productId, -1);
                                              },
                                            ),
                                            Text(
                                              '${item.quantity}',
                                              style: GoogleFonts.inter(
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.add_circle_outline),
                                              iconSize: 20,
                                              onPressed: () {
                                                ref.read(posProvider.notifier)
                                                    .updateQty(item.productId, 1);
                                              },
                                            ),
                                            Text(
                                              _rupiahFormat.format(
                                                item.sellPrice * item.quantity,
                                              ),
                                              style: GoogleFonts.inter(
                                                fontSize: 13,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.close, size: 16),
                                              onPressed: () {
                                                ref.read(posProvider.notifier)
                                                    .removeFromCart(item.productId);
                                              },
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ],
                ),
              ),

              // Divider
              const VerticalDivider(width: 1),

              // RIGHT — Payment panel
              SizedBox(
                width: 260,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Total
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'Total Belanja',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: colorScheme.onPrimaryContainer,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _rupiahFormat.format(pos.totalAmount),
                              style: GoogleFonts.inter(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onPrimaryContainer,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Payment method
                      Text(
                        'Metode Bayar',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'CASH', label: Text('Tunai')),
                          ButtonSegment(value: 'TRANSFER', label: Text('Transfer')),
                          ButtonSegment(value: 'QRIS', label: Text('QRIS')),
                          ButtonSegment(value: 'DEBT', label: Text('Hutang')),
                        ],
                        selected: {_paymentMethod},
                        onSelectionChanged: (v) {
                          setState(() => _paymentMethod = v.first);
                        },
                        style: ButtonStyle(
                          textStyle: WidgetStateProperty.all(
                            GoogleFonts.inter(fontSize: 11),
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // CASH input
                      if (_paymentMethod == 'CASH') ...[
                        Text(
                          'Uang Diterima',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _paidController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            prefixText: 'Rp ',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10,
                            ),
                          ),
                          onChanged: (v) => setState(() {}),
                        ),
                        const SizedBox(height: 8),
                        // Quick pay buttons
                        if (pos.totalAmount > 0)
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: _quickPay(pos.totalAmount).map((v) {
                              return OutlinedButton(
                                onPressed: () {
                                  _paidController.text = v.toString();
                                  setState(() {});
                                },
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 6,
                                  ),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  _rupiahFormat.format(v),
                                  style: GoogleFonts.inter(fontSize: 11),
                                ),
                              );
                            }).toList(),
                          ),
                        // Kembalian
                        if (_paidController.text.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Builder(builder: (ctx) {
                            final paid = double.tryParse(_paidController.text) ?? 0;
                            final change = paid - pos.totalAmount;
                            return Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                color: change >= 0
                                    ? Colors.green.shade50
                                    : Colors.red.shade50,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Kembalian',
                                    style: GoogleFonts.inter(fontSize: 12),
                                  ),
                                  Text(
                                    _rupiahFormat.format(change > 0 ? change : 0),
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: change >= 0
                                          ? Colors.green.shade700
                                          : Colors.red.shade700,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ],

                      // DEBT customer name
                      if (_paymentMethod == 'DEBT') ...[
                        Text(
                          'Nama Pelanggan',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _customerController,
                          decoration: InputDecoration(
                            hintText: 'Bu Sari, Pak Budi...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            color: Colors.orange.shade50,
                          ),
                          child: Text(
                            'Total ${_rupiahFormat.format(pos.totalAmount)} akan dicatat sebagai hutang',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: Colors.orange.shade800,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],

                      const Spacer(),

                      // Checkout button
                      if (pos.error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            pos.error!,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: Colors.red,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),

                      FilledButton.icon(
                        onPressed: pos.isLoading || pos.cart.isEmpty
                            ? null
                            : () => _checkout(),
                        icon: pos.isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline_rounded),
                        label: Text(
                          'Bayar Sekarang',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<double> _quickPay(double total) {
    final results = <double>{total};
    results.add((total / 5000).ceil() * 5000);
    results.add((total / 10000).ceil() * 10000);
    results.add((total / 50000).ceil() * 50000);
    return results.where((v) => v >= total).toList()..sort();
  }

  Future<void> _checkout() async {
    final paid = double.tryParse(_paidController.text) ?? 0;
    final customer = _customerController.text.trim();

    final success = await ref.read(posProvider.notifier).checkout(
      paymentMethod: _paymentMethod,
      paidAmount: paid,
      customerName: customer,
    );

    if (success && mounted) {
      setState(() {
        _lastSavedTime = DateFormat('HH:mm:ss').format(DateTime.now());
        _paidController.clear();
        _customerController.clear();
        _paymentMethod = 'CASH';
      });

      // Show receipt dialog
      final pos = ref.read(posProvider);
      if (pos.lastReceipt != null) {
        _showReceiptDialog(pos.lastReceipt!);
      }
    }
  }

  void _showReceiptDialog(Map<String, dynamic> receipt) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green.shade600),
            const SizedBox(width: 8),
            Text(
              'Transaksi Berhasil!',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                color: Colors.green.shade600,
                fontSize: 16,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              receipt['invoiceNumber'] ?? '',
              style: GoogleFonts.jetBrainsMono(fontSize: 12),
            ),
            const Divider(),
            ...((receipt['items'] as List?)?.map((item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${item['name']} x${item['quantity']}',
                      style: GoogleFonts.inter(fontSize: 12),
                    ),
                  ),
                  Text(
                    _rupiahFormat.format(item['subtotal']),
                    style: GoogleFonts.inter(fontSize: 12),
                  ),
                ],
              ),
            )) ?? []),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                Text(
                  _rupiahFormat.format(receipt['totalAmount']),
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            if (receipt['paymentMethod'] == 'CASH') ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Kembalian', style: GoogleFonts.inter(
                    color: Colors.green.shade700,
                    fontWeight: FontWeight.w600,
                  )),
                  Text(
                    _rupiahFormat.format(receipt['changeAmount']),
                    style: GoogleFonts.inter(
                      color: Colors.green.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
            if (receipt['paymentMethod'] == 'DEBT') ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Hutang', style: GoogleFonts.inter(
                    color: Colors.orange.shade700,
                    fontWeight: FontWeight.w600,
                  )),
                  Text(
                    receipt['customerName'] ?? '',
                    style: GoogleFonts.inter(
                      color: Colors.orange.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Transaksi Baru'),
          ),
        ],
      ),
    );
  }
}