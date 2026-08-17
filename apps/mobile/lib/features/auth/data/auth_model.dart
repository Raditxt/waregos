class UserModel {
  final String id;
  final String name;
  final String username;
  final String role;
  final bool isActive;

  const UserModel({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
    required this.isActive,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      username: json['username'] as String,
      role: json['role'] as String,
      isActive: json['isActive'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'role': role,
      'isActive': isActive,
    };
  }

  bool get isAdmin => role == 'ADMIN';
}

class AuthResponse {
  final String accessToken;
  final UserModel user;

  const AuthResponse({
    required this.accessToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] as String,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}