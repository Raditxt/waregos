import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static Dio? _instance;

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(ApiConstants.settingsKey) ??
        ApiConstants.defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(ApiConstants.settingsKey, url);
    resetInstance(); // Reset supaya Dio pakai URL baru
  }

  static void resetInstance() {
    _instance?.close(force: true); // Tutup koneksi yang masih terbuka
    _instance = null;
  }

  static Future<Dio> getInstance() async {
    if (_instance != null) return _instance!;
    final baseUrl = await getBaseUrl();
    _instance = _createDio(baseUrl);
    return _instance!;
  }

  static Dio _createDio(String baseUrl) {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Opsional: agar menangani status kode di luar 2xx sebagai error tetap bisa diproses
      validateStatus: (status) => status != null && status < 500,
      followRedirects: true,
    ));

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await SecureStorage.clearAll();
            resetInstance();
          }
          return handler.next(error);
        },
      ),
    );

    return dio;
  }

  // Helper methods
  static Future<Response> get(String path,
      {Map<String, dynamic>? params}) async {
    final dio = await getInstance();
    return dio.get(path, queryParameters: params);
  }

  static Future<Response> post(String path, {dynamic data}) async {
    final dio = await getInstance();
    return dio.post(path, data: data);
  }

  static Future<Response> patch(String path, {dynamic data}) async {
    final dio = await getInstance();
    return dio.patch(path, data: data);
  }

  static Future<Response> put(String path, {dynamic data}) async {
    final dio = await getInstance();
    return dio.put(path, data: data);
  }

  static Future<Response> delete(String path, {dynamic data}) async {
    final dio = await getInstance();
    return dio.delete(path, data: data);
  }
}