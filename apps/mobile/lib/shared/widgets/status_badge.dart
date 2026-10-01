import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum BadgeVariant { primary, accent, success, error, warning, info, neutral }

/// Pill badge kecil — versi Flutter dari .badge / .badge-* di globals.css.
/// Warna diambil dari Theme, bukan hardcoded, jadi otomatis ikut light/dark.
class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeVariant variant;
  final IconData? icon;

  const StatusBadge({
    super.key,
    required this.label,
    this.variant = BadgeVariant.neutral,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final semantic = Theme.of(context).extension<AppSemanticColors>()!;

    final (Color fg, Color bg) = switch (variant) {
      BadgeVariant.primary => (colors.primary, colors.primaryContainer),
      BadgeVariant.accent => (colors.secondary, colors.secondaryContainer),
      BadgeVariant.success => (semantic.success, semantic.successContainer),
      BadgeVariant.error => (colors.error, colors.errorContainer),
      BadgeVariant.warning => (semantic.warning, semantic.warningContainer),
      BadgeVariant.info => (semantic.info, semantic.infoContainer),
      BadgeVariant.neutral => (
          colors.onSurfaceVariant,
          colors.surfaceContainerHighest,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}