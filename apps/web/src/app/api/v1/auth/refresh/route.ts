import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, generateTokens } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'กรุณาระบุ refresh token',
          },
        },
        { status: 400 }
      )
    }

    // Verify token
    const payload = verifyToken(refreshToken)
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token ไม่ถูกต้อง',
          },
        },
        { status: 401 }
      )
    }

    // Check if refresh token exists in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })
    if (!stored || stored.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token หมดอายุ',
          },
        },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })
    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'ผู้ใช้ถูกระงับการใช้งาน',
          },
        },
        { status: 403 }
      )
    }

    // Generate new tokens
    const tokens = generateTokens(user)

    // Delete old refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } })

    // Save new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = NextResponse.json({
      success: true,
      data: tokens,
    })

    response.cookies.set('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Refresh error:', error)
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
