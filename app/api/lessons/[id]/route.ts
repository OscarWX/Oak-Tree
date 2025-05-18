import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lessonId = params.id

    // 1. First, get a list of all materials associated with this lesson so we can delete files from storage
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("file_name")
      .eq("lesson_id", lessonId)

    if (materialsError) {
      console.error("Error fetching materials for lesson:", materialsError)
      // Continue with deletion anyway
    }

    // 2. Get all chat sessions for this lesson (we'll need their IDs to delete chat messages)
    const { data: chatSessions, error: chatSessionsError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("lesson_id", lessonId)

    if (chatSessionsError) {
      console.error("Error fetching chat sessions for lesson:", chatSessionsError)
      // Continue with deletion anyway
    }

    const sessionIds = chatSessions?.map(session => session.id) || []

    // 3. Delete all chat messages associated with these sessions
    if (sessionIds.length > 0) {
      const { error: deleteMessagesError } = await supabaseAdmin
        .from("chat_messages")
        .delete()
        .in("session_id", sessionIds)

      if (deleteMessagesError) {
        console.error("Error deleting chat messages:", deleteMessagesError)
        // Continue with deletion anyway
      }
    }

    // 4. Delete all chat sessions for this lesson
    const { error: deleteSessionsError } = await supabaseAdmin
      .from("chat_sessions")
      .delete()
      .eq("lesson_id", lessonId)

    if (deleteSessionsError) {
      console.error("Error deleting chat sessions:", deleteSessionsError)
      // Continue with deletion anyway
    }

    // 5. Delete all materials from the lesson
    const { error: deleteMaterialsError } = await supabaseAdmin
      .from("materials")
      .delete()
      .eq("lesson_id", lessonId)

    if (deleteMaterialsError) {
      console.error("Error deleting materials:", deleteMaterialsError)
      return NextResponse.json(
        { error: "Failed to delete associated materials" },
        { status: 500 }
      )
    }

    // 6. Delete files from storage (if any)
    if (materials && materials.length > 0) {
      const fileNames = materials
        .map(m => m.file_name)
        .filter(name => name) as string[]
      
      if (fileNames.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("materials")
          .remove(fileNames)
        
        if (storageError) {
          console.error("Failed to delete some files from storage:", storageError)
          // Continue anyway since we've deleted the database records
        }
      }
    }

    // 7. Finally, delete the lesson itself
    const { error: deleteLessonError } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("id", lessonId)

    if (deleteLessonError) {
      console.error("Error deleting lesson:", deleteLessonError)
      return NextResponse.json(
        { error: "Failed to delete lesson" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in lesson deletion:", error)
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
} 