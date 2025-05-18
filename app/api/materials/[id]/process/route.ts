import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const materialId = params.id
  
  if (!materialId) {
    return NextResponse.json({ error: "Material ID is required" }, { status: 400 })
  }

  try {
    // Check if material exists
    const { data: material, error: fetchError } = await supabaseAdmin
      .from("materials")
      .select("id, lesson_id")
      .eq("id", materialId)
      .single()

    if (fetchError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 })
    }

    // Update status to pending to trigger reprocessing
    const { error: updateError } = await supabaseAdmin
      .from("materials")
      .update({
        processing_status: "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", materialId)

    if (updateError) {
      console.error("Error updating material status:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Trigger the processing endpoint
    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host")
    
    if (!host) {
      return NextResponse.json({ 
        success: true, 
        message: "Status updated but processing not triggered (missing host header)" 
      })
    }
    
    const baseUrl = `${protocol}://${host}`
    const processingResponse = await fetch(`${baseUrl}/api/materials/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId })
    })
    
    if (!processingResponse.ok) {
      const errorText = await processingResponse.text()
      console.error("Processing request failed:", errorText)
      return NextResponse.json({ 
        success: true, 
        message: "Status updated but processing failed to start",
        error: errorText
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Material processing started" 
    })
  } catch (err: any) {
    console.error("Unhandled error processing material:", err)
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 })
  }
} 