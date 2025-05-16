import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { data, error } = await supabaseAdmin.from("students").select("*").eq("id", id).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ student: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
