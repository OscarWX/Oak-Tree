import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lessonId = params.id
    console.log("Starting pre-class reading generation for lesson ID:", lessonId)

    // Get the request body (teacher needs)
    const { teacherNeed } = await request.json()
    
    // 1. Get the lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*, courses(*)")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Check if we have a summary and key concepts
    if (!lesson.ai_summary) {
      return NextResponse.json({ 
        error: "Lesson summary not found. Please generate a lesson overview first." 
      }, { status: 400 })
    }

    console.log("Generating pre-class reading with teacher need:", teacherNeed || "None specified")
    
    // Generate the pre-class reading content
    try {
      const { text: preclassContent } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `You are an expert education assistant creating engaging pre-class reading material for students.

Your task is to create an engaging, conversational introduction to the topic that will get students excited to learn about it in class.

# LESSON INFORMATION:
- Course: "${lesson.courses?.title || "the course"}"
- Lesson Topic: "${lesson.topic}"
- Teacher's emphasis: ${teacherNeed || "No specific emphasis provided."}

# LESSON SUMMARY:
${lesson.ai_summary}

# KEY CONCEPTS:
${lesson.key_concepts && lesson.key_concepts.length > 0 
  ? lesson.key_concepts.map((concept: any) => 
      `- ${concept.concept}: ${concept.description || ""}`)
    .join("\n") 
  : "No key concepts specified."}

# INSTRUCTIONS:
1. Create a brief, engaging introduction to this topic (AT MOST THREE SHORT PARAGRAPHS TOTAL)
2. Write in a conversational, friendly tone as if speaking directly to a student
3. Use relatable, real-world examples and analogies to explain complex concepts
4. Start with an interesting hook, question, or scenario that draws students in
5. Include 1-2 thought-provoking questions for students to consider before class
6. IMPORTANT: If the teacher specified areas to emphasize, these MUST be prominently featured
7. Make the content accessible and engaging, not overly academic or dry
8. Help students understand why this topic matters and how it connects to their lives

Your writing should be:
- SHORT: No more than 3 short paragraphs total
- Conversational and friendly, using "you" to speak directly to students
- Engaging, with interesting examples, stories, or scenarios
- Clear and accessible, avoiding unnecessary jargon
- Thought-provoking, encouraging students to think critically

Teacher emphasis should receive special attention - if the teacher has specified certain concepts or aspects to emphasize, make these a central focus of your content.

Create a concise pre-class reading that will make students excited to learn more about this topic in class.`,
      });
      
      console.log("Successfully generated pre-class reading content");

      // Update the lesson with the pre-class reading and teacher need
      const { data: updatedLesson, error: updateError } = await supabaseAdmin
        .from("lessons")
        .update({
          preclass_reading: preclassContent,
          teacher_need: teacherNeed || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", lessonId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating lesson:", updateError);
        return NextResponse.json({ error: "Failed to save pre-class reading: " + updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        lesson: updatedLesson
      });
    } catch (error: any) {
      console.error("Error generating pre-class reading:", error);
      return NextResponse.json({ error: "Failed to generate pre-class reading: " + error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Unhandled error in pre-class reading generation:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
} 