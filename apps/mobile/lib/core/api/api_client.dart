import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static Dio? _instance;

  // Getter instance Dio (syncronous, tidak memerlukan await)
  static Dio get instance {
    _instance ??= _createDio();
    return _instance!;
  }

  // Reset instance Dio (misal saat logout atau baseUrl berubah)
  static void resetInstance() {
    // Jika ingin menutup koneksi yang masih terbuka, gunakan:
    // _instance?.close(force: true);
    _instance = null;
  }

  // Membuat Dio dengan konfigurasi dasar
  static Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl, // Gunakan konstanta langsung
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) => status != null && status < 500,
      followRedirects: true,
    ));

    // Interceptor untuk menambahkan token dan menangani error 401
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

  // Helper methods (semua method mengembalikan Future<Response>)
  static Future<Response> get(String path,
      {Map<String, dynamic>? params}) async {
    return instance.get(path, queryParameters: params);
  }

  static Future<Response> post(String path, {dynamic data}) async {
    return instance.post(path, data: data);
  }

  static Future<Response> patch(String path, {dynamic data}) async {
    return instance.patch(path, data: data);
  }

  static Future<Response> put(String path, {dynamic data}) async {
    return instance.put(path, data: data);
  }

  static Future<Response> delete(String path, {dynamic data}) async {
    return instance.delete(path, data: data);
  }
}