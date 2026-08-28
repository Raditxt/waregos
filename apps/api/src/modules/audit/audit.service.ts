import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CHANGE_PASSWORD'
  | 'RESET_PASSWORD'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'CREATE_TRANSACTION'
  | 'CANCEL_TRANSACTION'
  | 'CREATE_PURCHASE'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'ADJUST_STOCK'

export interface LogActivityParams {
  userId: string
  action: ActivityAction
  entityType?: string
  entityId?: string
  details?: Prisma.InputJsonValue
  ipAddress?: string
}

export class ActivityService {
  constructor(private prisma: PrismaClient) {}

  async log(params: LogActivityParams) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: params.details,
          ipAddress: params.ipAddress,
        }
      })
    } catch (err) {
      // Log error tapi jangan crash app utama
      console.error('Failed to write activity log:', err)
    }
  }

  async findAll(params: {
    page?: number
    limit?: number
    userId?: string
    action?: string
    dateFrom?: string
    dateTo?: string
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, params.limit ?? 30)
    const skip = (page - 1) * limit

    const where: any = {}

    if (params.userId) where.userId = params.userId
    if (params.action) where.action = params.action
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {}
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom)
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo + 'T23:59:59Z')
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, username: true, role: true } }
        }
      }),
      this.prisma.activityLog.count({ where })
    ])

    return {
      data: data.map((log: typeof data[0]) => ({
        id: log.id,
        userId: log.userId,
        userName: log.user.name,
        username: log.user.username,
        role: log.user.role,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}