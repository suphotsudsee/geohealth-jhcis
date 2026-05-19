import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  phone: z.string().optional().or(z.literal('')).optional(),
  role: z.enum(['ADMIN', 'DISTRICT', 'HOSPITAL', 'FFC', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  villageCode: z.string().optional().or(z.literal('')).optional(),
  districtCode: z.string().optional().or(z.literal('')).optional(),
  provinceCode: z.string().optional().or(z.literal('')).optional(),
  password: z.string().min(6).optional(),
})

function isAdmin(request: NextRequest): boolean {
  const role = request.headers.get('x-user-role')
  return role === 'ADMIN'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const user = await prisma.user.findUnique({
      where: { id },
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
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const response: ApiResponse = { success: true, data: user }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

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

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email || null
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone || null
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
    if (parsed.data.villageCode !== undefined) updateData.villageCode = parsed.data.villageCode || null
    if (parsed.data.districtCode !== undefined) updateData.districtCode = parsed.data.districtCode || null
    if (parsed.data.provinceCode !== undefined) updateData.provinceCode = parsed.data.provinceCode || null
    if (parsed.data.password) {
      updateData.passwordHash = await hashPassword(parsed.data.password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    })

    const response: ApiResponse = { success: true, data: user }
    return NextResponse.json(response)
  } catch (error) {
    console.error('PATCH /api/v1/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Soft delete — set isActive = false instead of hard delete
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        username: true,
        displayName: true,
        isActive: true,
      },
    })

    const response: ApiResponse = { success: true, data: user }
    return NextResponse.json(response)
  } catch (error) {
    console.error('DELETE /api/v1/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate user' } },
      { status: 500 }
    )
  }
}
