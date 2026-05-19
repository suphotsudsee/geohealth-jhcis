import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'ไม่ได้รับอนุญาต' },
      },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      email: true,
      phone: true,
      villageCode: true,
      districtCode: true,
      provinceCode: true,
    },
  })

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'ไม่พบผู้ใช้' },
      },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: user })
}
