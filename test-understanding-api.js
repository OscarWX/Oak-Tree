// Simple test script to verify the student understanding API
const testAPI = async () => {
  try {
    // Test with a sample lesson ID
    const lessonId = "test-lesson-id"
    const response = await fetch(`http://localhost:3000/api/student-understanding?lessonId=${lessonId}`)
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    console.log('API Response:', JSON.stringify(data, null, 2))
    
    // Verify the structure
    if (data.students && Array.isArray(data.students)) {
      console.log('✅ Students array found')
    } else {
      console.log('❌ Students array missing')
    }
    
    if (typeof data.classAverage === 'number') {
      console.log('✅ Class average found:', data.classAverage)
    } else {
      console.log('❌ Class average missing')
    }
    
    if (data.commonMisunderstandings && Array.isArray(data.commonMisunderstandings)) {
      console.log('✅ Common misunderstandings array found')
    } else {
      console.log('❌ Common misunderstandings array missing')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testAPI() 