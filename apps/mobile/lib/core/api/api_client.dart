import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static Dio? _instance;

  /// Diisi oleh AuthNotifier. Dipanggil saat server menjawab 401 untuk request
  /// selain login (token dicabut, akun dinonaktifkan, password diganti, atau kedaluwarsa).
  static void Function()? onUnauthorized;

  static Dio get instance {
    _instance ??= _createDio();
    return _instance!;
  }

  static void resetInstance() {
    _instance = null;
  }

  static Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Status < 500 TIDAK dilempar sebagai error. Pemanggil wajib memeriksa
      // hasilnya lewat isSuccess() / serverMessage().
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
        // 401 tiba sebagai respons biasa, jadi harus ditangani di sini, bukan di onError
        onResponse: (response, handler) {
          final isLogin = response.requestOptions.path.endsWith(ApiConstants.login);
          if (response.statusCode == 401 && !isLogin) {
            onUnauthorized?.call();
          }
          return handler.next(response);
        },
      ),
    );

    return dio;
  }

  /// true untuk status 2xx
  static bool isSuccess(Response res) {
    final code = res.statusCode ?? 0;
    return code >= 200 && code < 300;
  }

  /// Pesan dari server (mis. "Stok ... tidak cukup"), atau null kalau tidak ada
  static String? serverMessage(Response res) {
    final data = res.data;
    if (data is Map && data['message'] is String) return data['message'] as String;
    return null;
  }

  /// Pesan untuk ditampilkan dari error apa pun: gangguan jaringan, atau pesan server bila ada.
  static String describeError(Object e, {required String fallback}) {
    if (e is DioException) {
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.connectionError:
          return 'Tidak bisa terhubung ke server. Periksa WiFi dan pastikan server menyala.';
        default:
          final r = e.response;
          return (r != null ? serverMessage(r) : null) ?? fallback;
      }
    }
    return fallback;
  }

  static Future<Response> get(String path, {Map<String, dynamic>? params}) async {
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