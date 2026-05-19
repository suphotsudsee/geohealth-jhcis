import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.cookies.get('accessToken')?.value

    // Try to get refresh token from body
    const body = await request.json().catch(() => ({}))
    const refreshToken = body.refreshToken

    // Delete specific refresh token if provided
    if (refreshToken) {
      await prisma.refreshToken
        .delete({ where: { token: refreshToken } })
        .catch(() => {})
    }

    // If we have access token, try to find user and delete their refresh tokens
    if (token) {
      const jwt = await import('jsonwebtoken')
      const secret = process.env.JWT_SECRET || 'default-secret-change-in-production'
      try {
        const payload = jwt.verify(token, secret) as { userId: string }
        // Clean up all refresh tokens for this user
        await prisma.refreshToken
          .deleteMany({ where: { userId: payload.userId } })
          .catch(() => {})
      } catch {
        // Token invalid or expired — still clear the cookie
      }
    }

    const response = NextResponse.json({
      success: true,
      data: { message: 'ออกจากระบบสำเร็จ' },
    })

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'เกิดข้อผิดพลาดภายในระบบ',
        },
      },
      { status: 500 }
    )
  }
}
