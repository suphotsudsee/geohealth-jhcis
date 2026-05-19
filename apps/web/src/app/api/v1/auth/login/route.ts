import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { comparePassword, generateTokens } from '@/lib/auth'
import type { LoginResponse, UserResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
          },
        },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          },
        },
        { status: 401 }
      )
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          },
        },
        { status: 401 }
      )
    }

    const { accessToken, refreshToken } = generateTokens(user)

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ip:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
      },
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const userData: UserResponse = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      email: user.email,
      phone: user.phone,
      villageCode: user.villageCode,
      districtCode: user.districtCode,
      provinceCode: user.provinceCode,
    }

    const data: LoginResponse = {
      accessToken,
      refreshToken,
      user: userData,
    }

    const response = NextResponse.json({
      success: true,
      data,
    })

    // Set HTTP-only cookie
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
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
