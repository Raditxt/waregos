import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_model.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/storage/secure_storage.dart';

// Auth state
class AuthState {
  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null && user != null;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  // Hydrate dari secure storage saat app start
  Future<void> hydrate() async {
    final token = await SecureStorage.getToken();
    final userJson = await SecureStorage.getUser();

    if (token != null && userJson != null) {
      try {
        final user = UserModel.fromJson(
          jsonDecode(userJson) as Map<String, dynamic>
        );
        state = state.copyWith(user: user, token: token);
      } catch (_) {
        await SecureStorage.clearAll();
      }
    }
  }

  Future<void> login(String username, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.post(
        ApiConstants.login,
        data: {'username': username, 'password': password},
      );

      final data = res.data['data'] as Map<String, dynamic>;
      final auth = AuthResponse.fromJson(data);

      await SecureStorage.saveToken(auth.accessToken);
      await SecureStorage.saveUser(jsonEncode(auth.user.toJson()));

      state = state.copyWith(
        user: auth.user,
        token: auth.accessToken,
        isLoading: false,
      );
    } catch (e) {
      String message = 'Login gagal';
      if (e is Exception) {
        message = 'Username atau password salah';
      }
      state = state.copyWith(isLoading: false, error: message);
    }
  }

  // === UPDATE DI SINI ===
  Future<void> logout() async {
    await SecureStorage.clearAll();
    ApiClient.resetInstance(); // Reset instance Dio untuk membersihkan state client
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});