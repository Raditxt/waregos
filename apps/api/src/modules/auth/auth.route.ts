import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '@waregos/types';
import { AuthService, LoginError } from './auth.service';
import { ActivityService } from '../audit/audit.service';
import { loginSchema, changePasswordSchema } from './auth.schema';
import { ok, validationError, badRequest, notFound } from '../../shared/response';

// Admin: sesi pendek (hak akses besar). Kasir: sesi panjang (tablet di meja kasir).
// Aman karena sesi bisa dicabut seketika lewat tokenVersion.
const tokenLifetime = (role: string) => (role === 'ADMIN' ? '12h' : '7d');

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma);
  const activityService = new ActivityService(app.prisma);

  // POST /api/auth/login — dengan rate limit ketat
  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
        }),
      },
    },
  }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message));
    }

    try {
      const { user, tokenVersion } = await authService.login(result.data);
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
        tv: tokenVersion,
      };
      const accessToken = app.jwt.sign(payload, { expiresIn: tokenLifetime(user.role) });

      await activityService.log({
        userId: user.id,
        action: 'LOGIN',
        details: { username: user.username } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      });

      return reply.code(200).send(ok({ accessToken, user }));
    } catch (err: unknown) {
      // Error tak terduga (mis. database mati) jangan disamarkan jadi "password salah"
      if (!(err instanceof LoginError)) throw err;

      if (err.userId) {
        await activityService.log({
          userId: err.userId,
          action: 'LOGIN_FAILED',
          details: { reason: err.reason } as Prisma.InputJsonValue,
          ipAddress: request.ip,
        });
      }
      return reply.code(401).send(badRequest(err.message, 'INVALID_CREDENTIALS'));
    }
  });

  // GET /api/auth/me
  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const user = await authService.getById(payload.sub);

    if (!user) {
      return reply.code(404).send(notFound('User'));
    }

    return reply.send(ok(user));
  });

  // PATCH /api/auth/change-password
  app.patch('/change-password', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const result = changePasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message));
    }

    try {
      const payload = request.user as JwtPayload;
      const updated = await authService.changePassword(payload.sub, result.data);

      await activityService.log({
        userId: payload.sub,
        action: 'CHANGE_PASSWORD',
        ipAddress: request.ip,
      });

      // Sesi lain sudah tidak berlaku; sesi ini mendapat token baru
      const newPayload: JwtPayload = {
        sub: updated.id,
        username: updated.username,
        role: updated.role,
        tv: updated.tokenVersion,
      };
      const accessToken = app.jwt.sign(newPayload, { expiresIn: tokenLifetime(updated.role) });

      return reply.send(ok({ accessToken }, 'Password berhasil diubah'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengubah password';
      return reply.code(400).send(badRequest(message, 'CHANGE_PASSWORD_FAILED'));
    }
  });
}