import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ============================================================
/// WAREGOS DESIGN SYSTEM — Flutter mirror of apps/web globals.css
/// Primary : Orange (#f97316)
/// Accent  : Amber  (#f59e0b)
/// ============================================================
///
/// Kenapa ada AppSemanticColors terpisah dari ColorScheme?
/// Material 3's ColorScheme hanya punya slot primary/secondary/
/// tertiary/error — tidak ada slot bawaan untuk "success" atau
/// "warning" seperti di globals.css. ThemeExtension adalah cara
/// resmi Flutter untuk menambah token warna kustom yang tetap
/// ikut Theme.of(context) dan otomatis di-lerp saat ganti tema.

@immutable
class AppSemanticColors extends ThemeExtension<AppSemanticColors> {
  final Color success;
  final Color successContainer;
  final Color warning;
  final Color warningContainer;
  final Color info;
  final Color infoContainer;

  const AppSemanticColors({
    required this.success,
    required this.successContainer,
    required this.warning,
    required this.warningContainer,
    required this.info,
    required this.infoContainer,
  });

  static const light = AppSemanticColors(
    success: Color(0xFF22C55E),
    successContainer: Color(0xFFF0FDF4),
    warning: Color(0xFFF59E0B),
    warningContainer: Color(0xFFFFFBEB),
    info: Color(0xFF3B82F6),
    infoContainer: Color(0xFFEFF6FF),
  );

  static const dark = AppSemanticColors(
    success: Color(0xFF4ADE80),
    successContainer: Color(0x1F22C55E),
    warning: Color(0xFFFBBF24),
    warningContainer: Color(0x1FF59E0B),
    info: Color(0xFF60A5FA),
    infoContainer: Color(0x1F3B82F6),
  );

  @override
  AppSemanticColors copyWith({
    Color? success,
    Color? successContainer,
    Color? warning,
    Color? warningContainer,
    Color? info,
    Color? infoContainer,
  }) {
    return AppSemanticColors(
      success: success ?? this.success,
      successContainer: successContainer ?? this.successContainer,
      warning: warning ?? this.warning,
      warningContainer: warningContainer ?? this.warningContainer,
      info: info ?? this.info,
      infoContainer: infoContainer ?? this.infoContainer,
    );
  }

  @override
  AppSemanticColors lerp(ThemeExtension<AppSemanticColors>? other, double t) {
    if (other is! AppSemanticColors) return this;
    return AppSemanticColors(
      success: Color.lerp(success, other.success, t)!,
      successContainer: Color.lerp(successContainer, other.successContainer, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningContainer: Color.lerp(warningContainer, other.warningContainer, t)!,
      info: Color.lerp(info, other.info, t)!,
      infoContainer: Color.lerp(infoContainer, other.infoContainer, t)!,
    );
  }
}

class AppTheme {
  AppTheme._();

  // === Brand tokens — samain dengan apps/web/globals.css ===
  static const primary = Color(0xFFF97316); // orange-500
  static const primaryLight = Color(0xFFFFF7ED); // orange-50
  static const accent = Color(0xFFF59E0B); // amber-500

  static ThemeData get light {
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: primary,
      onPrimary: Colors.white,
      primaryContainer: primaryLight,
      onPrimaryContainer: Color(0xFF9A3412), // orange-800
      secondary: accent,
      onSecondary: Colors.white,
      secondaryContainer: Color(0xFFFFFBEB), // amber-50
      onSecondaryContainer: Color(0xFF92400E), // amber-800
      tertiary: accent,
      onTertiary: Colors.white,
      error: Color(0xFFEF4444),
      onError: Colors.white,
      errorContainer: Color(0xFFFEF2F2),
      onErrorContainer: Color(0xFF991B1B),
      surface: Colors.white, // = --card
      onSurface: Color(0xFF1C1917), // neutral-900
      onSurfaceVariant: Color(0xFF78716C), // neutral-500 (muted-foreground)
      surfaceContainerHighest: Color(0xFFF5F5F4), // neutral-100 (muted)
      outline: Color(0xFFE7E5E4), // neutral-200 (border)
      outlineVariant: Color(0xFFE7E5E4),
      shadow: Colors.black,
      scrim: Colors.black,
      inverseSurface: Color(0xFF292524),
      onInverseSurface: Color(0xFFF5F5F4),
      inversePrimary: Color(0xFFFB923C),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: const Color(0xFFFAFAF9), // neutral-50
      textTheme: GoogleFonts.interTextTheme(),
      extensions: const [AppSemanticColors.light],
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF1C1917),
        elevation: 0,
        scrolledUnderElevation: 1,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE7E5E4)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: primaryLight,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.inter(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? primary : const Color(0xFF78716C),
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(color: selected ? primary : const Color(0xFF78716C));
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF78716C),
          side: const BorderSide(color: Color(0xFFE7E5E4)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFFAFAF9),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE7E5E4)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE7E5E4)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData get dark {
    const colorScheme = ColorScheme(
      brightness: Brightness.dark,
      primary: Color(0xFFFB923C), // orange-400 — lebih terang biar kontras di bg gelap
      onPrimary: Color(0xFF1C1917),
      primaryContainer: Color(0x1FF97316),
      onPrimaryContainer: Color(0xFFFDBA74),
      secondary: Color(0xFFFBBF24), // amber-400
      onSecondary: Color(0xFF1C1917),
      secondaryContainer: Color(0x1FF59E0B),
      onSecondaryContainer: Color(0xFFFCD34D),
      tertiary: Color(0xFFFBBF24),
      onTertiary: Color(0xFF1C1917),
      error: Color(0xFFF87171),
      onError: Color(0xFF1C1917),
      errorContainer: Color(0x1FEF4444),
      onErrorContainer: Color(0xFFFCA5A5),
      surface: Color(0xFF292524), // neutral-800 (card)
      onSurface: Color(0xFFFAFAF9), // neutral-50
      onSurfaceVariant: Color(0xFFA8A29E), // neutral-400 (muted-foreground)
      surfaceContainerHighest: Color(0xFF292524),
      outline: Color(0xFF44403C), // neutral-700 (border)
      outlineVariant: Color(0xFF44403C),
      shadow: Colors.black,
      scrim: Colors.black,
      inverseSurface: Color(0xFFF5F5F4),
      onInverseSurface: Color(0xFF292524),
      inversePrimary: AppTheme.primary,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: const Color(0xFF1C1917), // neutral-900
      textTheme: GoogleFonts.interTextTheme(ThemeData(brightness: Brightness.dark).textTheme),
      extensions: const [AppSemanticColors.dark],
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1C1917),
        foregroundColor: Color(0xFFFAFAF9),
        elevation: 0,
        scrolledUnderElevation: 1,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF292524),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF44403C)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF1C1917),
        indicatorColor: const Color(0x1FF97316),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.inter(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? const Color(0xFFFB923C) : const Color(0xFFA8A29E),
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(color: selected ? const Color(0xFFFB923C) : const Color(0xFFA8A29E));
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFFB923C),
          foregroundColor: const Color(0xFF1C1917),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFFA8A29E),
          side: const BorderSide(color: Color(0xFF44403C)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF292524),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF44403C)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF44403C)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: Color(0xFFFB923C), width: 1.5),
        ),
      ),
    );
  }
}