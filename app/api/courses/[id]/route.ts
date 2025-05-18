import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id

    // 1. First, get all lessons for this course
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("course_id", courseId)

    if (lessonsError) {
      console.error("Error fetching lessons for course:", lessonsError)
      return NextResponse.json(
        { error: "Failed to fetch lessons for deletion" },
        { status: 500 }
      )
    }

    const lessonIds = lessons?.map(lesson => lesson.id) || []

    // 2. Find all materials associated with these lessons
    const { data: materials, error: materialsError } = await supabaseAdmin
      .from("materials")
      .select("file_name")
      .in("lesson_id", lessonIds)

    if (materialsError) {
      console.error("Error fetching materials:", materialsError)
      // Continue with deletion anyway
    }

    // 3. Delete all materials from these lessons
    if (lessonIds.length > 0) {
      const { error: deleteMaterialsError } = await supabaseAdmin
        .from("materials")
        .delete()
        .in("lesson_id", lessonIds)

      if (deleteMaterialsError) {
        console.error("Error deleting materials:", deleteMaterialsError)
        // Continue with deletion anyway
      }

      // 4. Delete files from storage
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
            // Continue anyway
          }
        }
      }

      // 5. Delete all lessons from the course
      const { error: deleteLessonsError } = await supabaseAdmin
        .from("lessons")
        .delete()
        .eq("course_id", courseId)

      if (deleteLessonsError) {
        console.error("Error deleting lessons:", deleteLessonsError)
        return NextResponse.json(
          { error: "Failed to delete associated lessons" },
          { status: 500 }
        )
      }
    }

    // 6. Finally, delete the course itself
    const { error: deleteCourseError } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", courseId)

    if (deleteCourseError) {
      console.error("Error deleting course:", deleteCourseError)
      return NextResponse.json(
        { error: "Failed to delete course" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in course deletion:", error)
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
} 