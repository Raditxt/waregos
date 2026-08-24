import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/reports_provider.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  final _rupiahFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );
  final _dateFormat = DateFormat('d MMM yyyy', 'id');
  final _timeFormat = DateFormat('HH:mm:ss');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final today = DateTime.now().toIso8601String().substring(0, 10);
      ref.read(reportsProvider.notifier).loadAll(today);
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year - 1),
      lastDate: now,
    );
    if (picked != null) {
      final date = picked.toIso8601String().substring(0, 10);
      ref.read(reportsProvider.notifier).loadAll(date);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportsProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final isLoading = state.isLoadingDaily || state.isLoadingClosing;

    return RefreshIndicator(
      onRefresh: () => ref
          .read(reportsProvider.notifier)
          .loadAll(state.selectedDate),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Laporan Harian',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  // Date picker
                  OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today_rounded, size: 16),
                    label: Text(
                      _dateFormat.format(
                        DateTime.parse(state.selectedDate),
                      ),
                      style: GoogleFonts.inter(fontSize: 13),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                    ),
                  ),
                ],
              ),
            ),
          ),

          if (isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (state.daily == null && !isLoading)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: Colors.red.shade400),
                    const SizedBox(height: 8),
                    Text(
                      'Gagal memuat laporan',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Periksa koneksi ke server',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () => ref
                          .read(reportsProvider.notifier)
                          .loadAll(state.selectedDate),
                      icon: const Icon(Icons.refresh_rounded, size: 16),
                      label: const Text('Coba Lagi'),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            // Summary cards
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              sliver: SliverGrid(
                delegate: SliverChildListDelegate([
                  _summaryCard(
                    'Transaksi',
                    '${state.daily?.totalTransactions ?? 0}',
                    'transaksi',
                    Icons.receipt_long_rounded,
                    Colors.blue,
                    colorScheme,
                  ),
                  _summaryCard(
                    'Omzet',
                    _rupiahFormat.format(state.daily?.totalRevenue ?? 0),
                    'pendapatan',
                    Icons.attach_money_rounded,
                    Colors.green,
                    colorScheme,
                  ),
                  _summaryCard(
                    'Profit',
                    _rupiahFormat.format(state.daily?.totalProfit ?? 0),
                    'keuntungan',
                    Icons.trending_up_rounded,
                    Colors.teal,
                    colorScheme,
                  ),
                  _summaryCard(
                    'Item Terjual',
                    '${state.daily?.totalItemsSold ?? 0}',
                    'item',
                    Icons.inventory_2_rounded,
                    Colors.orange,
                    colorScheme,
                  ),
                ]),
                gridDelegate:
                    const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.6,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // Closing / Cash reconciliation
            if (state.closing != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _buildClosingCard(state.closing!, colorScheme),
                ),
              ),

            // No data state
            if (state.daily?.totalTransactions == 0)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(
                          Icons.bar_chart_outlined,
                          size: 48,
                          color: colorScheme.outlineVariant,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tidak ada transaksi pada tanggal ini',
                          style: GoogleFonts.inter(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ],
      ),
    );
  }

  Widget _summaryCard(
    String title,
    String value,
    String sub,
    IconData icon,
    MaterialColor color,
    ColorScheme colorScheme,
  ) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                Icon(icon, size: 18, color: color),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  sub,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClosingCard(ClosingData closing, ColorScheme colorScheme) {
    final cash = closing.byPaymentMethod['CASH'] as Map<String, dynamic>?;
    final transfer = closing.byPaymentMethod['TRANSFER'] as Map<String, dynamic>?;
    final qris = closing.byPaymentMethod['QRIS'] as Map<String, dynamic>?;
    final debt = closing.byPaymentMethod['DEBT'] as Map<String, dynamic>?;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Breakdown Pembayaran',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
            _paymentRow('💵 Tunai', cash?['total'] ?? 0,
                cash?['count'] ?? 0, colorScheme),
            _paymentRow('🏦 Transfer', transfer?['total'] ?? 0,
                transfer?['count'] ?? 0, colorScheme),
            _paymentRow('📱 QRIS', qris?['total'] ?? 0,
                qris?['count'] ?? 0, colorScheme),
            _paymentRow('📋 Hutang', debt?['total'] ?? 0,
                debt?['count'] ?? 0, colorScheme),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Kas Tunai Diharapkan',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                ),
                Text(
                  _rupiahFormat.format(closing.expectedCash),
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade700,
                  ),
                ),
              ],
            ),
            if (closing.lastTransaction != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Transaksi Terakhir',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          closing.lastTransaction!['invoiceNumber'] as String,
                          style: GoogleFonts.jetBrainsMono(fontSize: 12),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _timeFormat.format(DateTime.parse(
                            closing.lastTransaction!['createdAt'] as String,
                          ).toLocal()),
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        // ========== PERUBAHAN DI SINI ==========
                        Text(
                          _rupiahFormat.format(
                            (closing.lastTransaction!['totalAmount'] as num).toDouble(),
                          ),
                          style: GoogleFonts.inter(fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _paymentRow(
      String label, dynamic total, dynamic count, ColorScheme colorScheme) {
    final totalVal = (total as num).toDouble();
    if (totalVal == 0) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 13)),
          Row(
            children: [
              Text(
                '${count}x',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _rupiahFormat.format(totalVal),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}