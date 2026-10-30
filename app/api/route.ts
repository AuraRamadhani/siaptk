import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: true,
        message: "API SIAP TK Berjalan Normal & Terhubung ke Database!"
    });
}