import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  // Dipakai buat trigger shake animation di tombol saat login gagal.
  // Diganti tiap kali gagal supaya AnimatedBuilder/Key berubah dan animasi
  // di-replay (bukan cuma main sekali di awal).
  int _shakeTrigger = 0;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final colorScheme = Theme.of(context).colorScheme;
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Username dan password wajib diisi'),
          backgroundColor: colorScheme.error,
        ),
      );
      setState(() => _shakeTrigger++);
      return;
    }

    await ref.read(authProvider.notifier).login(username, password);

    final auth = ref.read(authProvider);
    if (auth.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error!),
          backgroundColor: colorScheme.error,
        ),
      );
      setState(() => _shakeTrigger++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo & Title — satu-satunya momen "kehadiran" di app ini,
                  // dilihat tiap kali mulai sesi kerja.
                  Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: colorScheme.primary,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(
                          Icons.storefront_rounded,
                          size: 40,
                          color: colorScheme.onPrimary,
                        ),
                      ).animate().scale(
                            begin: const Offset(0.7, 0.7),
                            end: const Offset(1, 1),
                            duration: 450.ms,
                            curve: Curves.easeOutBack,
                          ).fadeIn(duration: 350.ms),
                      const SizedBox(height: 16),
                      Text(
                        'Waregos',
                        style: GoogleFonts.inter(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ).animate(delay: 150.ms).fadeIn(duration: 350.ms).slideY(begin: 0.15, end: 0),
                      const SizedBox(height: 4),
                      Text(
                        'Sistem Manajemen Toko Kelontong',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ).animate(delay: 200.ms).fadeIn(duration: 350.ms),
                    ],
                  ),

                  const SizedBox(height: 40),

                  // Username field
                  TextField(
                    controller: _usernameController,
                    autocorrect: false,
                    enableSuggestions: false,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      hintText: 'Masukkan username',
                      prefixIcon: const Icon(Icons.person_outline_rounded),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Password field
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _login(),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      hintText: 'Masukkan password',
                      prefixIcon: const Icon(Icons.lock_outline_rounded),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Login button — shake kalau gagal, feedback fisik instan
                  FilledButton(
                    onPressed: auth.isLoading ? null : _login,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: auth.isLoading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colorScheme.onPrimary,
                            ),
                          )
                        : Text(
                            'Masuk',
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                  )
                      .animate(key: ValueKey(_shakeTrigger))
                      .shakeX(hz: 6, amount: _shakeTrigger == 0 ? 0 : 4, duration: 400.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}