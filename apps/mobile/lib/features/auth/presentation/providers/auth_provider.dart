import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_model.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/storage/secure_storage.dart';

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
  AuthNotifier() : super(const AuthState()) {
    // Server menjawab 401 → sesi tidak berlaku lagi → kembali ke layar login
    ApiClient.onUnauthorized = _handleSessionExpired;
  }

  Future<void> _handleSessionExpired() async {
    if (!state.isAuthenticated) return; // sudah logout, abaikan 401 susulan
    await SecureStorage.clearAll();
    ApiClient.resetInstance();
    state = const AuthState(error: 'Sesi berakhir. Silakan login kembali.');
  }

  // Hydrate dari secure storage saat app start
  Future<void> hydrate() async {
    final token = await SecureStorage.getToken();
    final userJson = await SecureStorage.getUser();

    if (token != null && userJson != null) {
      try {
        final user = UserModel.fromJson(
          jsonDecode(userJson) as Map<String, dynamic>,
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
      debugPrint('[Auth] Attempting login to: ${ApiConstants.baseUrl}');

      final res = await ApiClient.post(
        ApiConstants.login,
        data: {'username': username, 'password': password},
      );
      debugPrint('[Auth] Login response: ${res.statusCode}');

      // 400 input tidak valid, 401 kredensial salah, 429 terlalu banyak percobaan
      if (!ApiClient.isSuccess(res)) {
        state = state.copyWith(
          isLoading: false,
          error: ApiClient.serverMessage(res) ?? 'Login gagal. Coba lagi.',
        );
        return;
      }

      final data = res.data['data'] as Map<String, dynamic>;
      final auth = AuthResponse.fromJson(data);

      await SecureStorage.saveToken(auth.accessToken);
      await SecureStorage.saveUser(jsonEncode(auth.user.toJson()));

      state = state.copyWith(
        user: auth.user,
        token: auth.accessToken,
        isLoading: false,
      );
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _networkMessage(e));
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Login gagal. Coba lagi.');
    }
  }

  String _networkMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return 'Tidak bisa terhubung ke server. Periksa WiFi dan pastikan server menyala.';
      default:
        return 'Server sedang bermasalah. Coba lagi dalam beberapa saat.';
    }
  }

  Future<void> logout() async {
    await SecureStorage.clearAll();
    ApiClient.resetInstance();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});