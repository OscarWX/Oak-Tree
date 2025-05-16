import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from("students").select("*")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ students: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
