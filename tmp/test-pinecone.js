const { Pinecone } = require('@pinecone-database/pinecone');

async function testPinecone() {
    try {
        const pc = new Pinecone({
            apiKey: "pcsk_37vGku_QnTBrrmN4tLzRJLDqsrmNCN7FaY9utxoDw74f9Uh85APVgQRbQXvEyYdF9rWMi4"
        });
        const index = pc.Index("hcf-chatbot");
        const stats = await index.describeIndexStats();
        console.log('Pinecone Stats:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error('Pinecone Test Failed:', err.message);
    }
}

testPinecone();
