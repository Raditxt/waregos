import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static Dio? _instance;

  static Dio get instance {
    _instance ??= _createDio();
    return _instance!;
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
    ));

    // Request interceptor — attach JWT token
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
          // Handle 401 — clear token & trigger re-login
          if (error.response?.statusCode == 401) {
            await SecureStorage.clearAll();
          }
          return handler.next(error);
        },
      ),
    );

    return dio;
  }

  // Helper methods
  static Future<Response> get(String path, {Map<String, dynamic>? params}) {
    return instance.get(path, queryParameters: params);
  }

  static Future<Response> post(String path, {dynamic data}) {
    return instance.post(path, data: data);
  }

  static Future<Response> patch(String path, {dynamic data}) {
    return instance.patch(path, data: data);
  }
}