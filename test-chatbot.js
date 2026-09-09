// Simple test to verify chatbot API
async function testChatbot() {
    try {
        console.log('Testing Krishi Sevak API...');

        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'What is the best time to water wheat crops?',
                sessionId: 'test-' + Date.now()
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.response) {
            console.log('\n✅ CHATBOT WORKING! Response received:');
            console.log(data.response);
        } else if (data.error) {
            console.log('\n❌ ERROR:', data.error);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testChatbot();
