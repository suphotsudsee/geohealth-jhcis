import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { PAGINATION_DEFAULTS } from '@/lib/constants'
import type { ApiResponse, Pagination } from '@/types/api'
import { z } from 'zod'

export const runtime = 'nodejs'

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  displayName: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'DISTRICT', 'HOSPITAL', 'FFC', 'VIEWER']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  villageCode: z.string().optional().or(z.literal('')),
  districtCode: z.string().optional().or(z.literal('')),
  provinceCode: z.string().optional().or(z.literal('')),
})

function isAdmin(request: NextRequest): boolean {
  const role = request.headers.get('x-user-role')
  return role === 'ADMIN'
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const isActive = searchParams.get('isActive')
    const role = searchParams.get('role')

    const where: Record<string, unknown> = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }
    if (role) {
      where.role = role
    }

    const skip = (page - 1) * limit

    const [total, users] = await Promise.all([
      prisma.user.count({ where: where as any }),
      prisma.user.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          role: true,
          villageCode: true,
          districtCode: true,
          provinceCode: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    const pagination: Pagination = { total, page, limit, totalPages: Math.ceil(total / limit) }

    return NextResponse.json({ success: true, data: users, pagination })
  } catch (error) {
    console.error('GET /api/v1/admin/users error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user data',
          details: parsed.error.flatten().fieldErrors,
        },
      }
      return NextResponse.json(response, { status: 400 })
    }

    const { username, password, displayName, role, email, phone, villageCode, districtCode, provinceCode } = parsed.data

    // Check duplicate username
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Username already exists' } },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName,
        role,
        email: email || null,
        phone: phone || null,
        villageCode: villageCode || null,
        districtCode: districtCode || null,
        provinceCode: provinceCode || null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        role: true,
        villageCode: true,
        districtCode: true,
        provinceCode: true,
        isActive: true,
        createdAt: true,
      },
    })

    const response: ApiResponse = {
      success: true,
      data: user,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/v1/admin/users error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } },
      { status: 500 }
    )
  }
}
