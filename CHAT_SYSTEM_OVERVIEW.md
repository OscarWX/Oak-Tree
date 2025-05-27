# OakTree Chat System - Complete Rewrite

## Overview
The chat system has been completely rewritten to follow the exact requirements for Chirpy and Sage's roles and conversation flow.

## Character Roles

### Chirpy (Orange Jay)
- **Role**: Bird who doesn't go to class but wants to learn from the student
- **Goal**: Wants the student to teach them the course material
- **Personality**: Friendly, eager to learn, doesn't attend classes
- **Never**: Provides correct answers, acts as teacher, gives hints

### Sage (Wise Owl)
- **Role**: Wise helper who provides hints
- **Appears**: Only when Chirpy says "I don't follow that" or similar
- **Function**: Evaluates misunderstanding levels (1-4) and provides gentle guidance
- **Database**: Records student understanding levels for analytics

## Conversation Flow

### 1. Initialization
- **Chirpy starts**: "Hi! I'm Chirpy, an orange jay. I heard in this lesson about [topic] you learned about [first concept]. Can you teach me about it?"
- **Tone**: Eager learner who doesn't attend class, seeking to be taught specific concepts

### 2. Concept Learning Phase
- **Student explains** → **Chirpy responds**:
  - If explanation is good: "Thanks! That makes sense. I also heard you learned about [next concept]. Can you teach me about that?"
  - If explanation is wrong/confusing: "I don't follow that" or "That doesn't make sense to me"

### 3. Sage Intervention
- **Triggers**: When Chirpy expresses confusion
- **Sage provides**: Gentle hints and guidance
- **Evaluation**: Assigns misunderstanding level (1-4)
- **Database**: Records level for teacher analytics
- **Format**: Message ends with "LEVEL: X" (hidden from display)

### 4. Completion & Open Chat
- **When**: All concepts covered
- **Chirpy**: "Wow, thanks for teaching me! How's everything going with you?"
- **Mode**: Casual, friendly conversation

## Technical Implementation

### State Detection
```typescript
function determineConversationState(previousMessages, keyConcepts) {
  // CONCEPT_LEARNING: Default state, Chirpy learning
  // SAGE_HELP: After Chirpy expresses confusion
  // OPEN_CHAT: All concepts covered
}
```

### Response Generation
- **Modular prompts** for each conversation state
- **Chirpy prompts**: Emphasize confusion and need for teaching
- **Sage prompts**: Provide hints and evaluate understanding
- **Open chat prompts**: Casual conversation

### Response Parsing
```typescript
function parseAiResponse(text) {
  // Sage messages: Remove "LEVEL: X" from display
  // Chirpy messages: Split paragraphs into separate messages
  // Return: Array of {role: "chirpy"|"sage", content: string}
}
```

### Database Integration
- **student_understanding table**: Records misunderstanding levels
- **Automatic upsert**: When Sage evaluates student responses
- **Analytics**: Teachers can track student progress per concept

## Key Improvements

1. **Clear Role Separation**: Chirpy = doesn't go to class but wants to learn, Sage = wise helper
2. **Natural Flow**: Student teaches → Chirpy learns → Sage helps when needed
3. **Proper Initialization**: Chirpy asks to be taught, not as teacher
4. **Response Parsing**: Clean separation of character messages
5. **Database Analytics**: Automatic tracking of understanding levels
6. **State Management**: Clear conversation phases with appropriate responses

## API Endpoints

### `/api/chat/start`
- Creates new session
- Returns Chirpy's initial confused greeting
- Asks about first concept as learner

### `/api/chat/message`
- Processes student responses
- Determines conversation state
- Generates appropriate character responses
- Records misunderstanding levels
- Returns parsed messages for display

## Frontend Integration
- **Separate avatars**: /avatars/chirpy.png, /avatars/sage.png
- **Word-by-word animation**: 40ms intervals for natural feel
- **Message roles**: "chirpy", "sage", "user"
- **LEVEL hiding**: Sage evaluations hidden from student view 