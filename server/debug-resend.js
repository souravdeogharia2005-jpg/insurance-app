const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend('re_9nH8y6NC_CqoUk91szB2t6tPY1zF3FyVe');

async function testEmail() {
    console.log('🧪 Testing Resend API...');
    try {
        const data = await resend.emails.send({
            from: 'AegisAI <onboarding@resend.dev>',
            to: 'porschegt651@gmail.com',
            subject: 'Debug Test',
            html: '<strong>Test email from AegisAI Debug Script</strong>'
        });
        console.log('✅ API call successful!');
        console.log('Response Profile:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ API call failed:', error);
    }
}

testEmail();
