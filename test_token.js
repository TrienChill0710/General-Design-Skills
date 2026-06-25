import dotenv from 'dotenv';
dotenv.config();

async function testToken() {
  const token = process.env.SLACK_TOKEN;
  console.log('Testing token:', token ? `${token.substring(0, 15)}...` : 'None');
  
  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', res.status);
    console.log('X-OAuth-Scopes:', res.headers.get('x-oauth-scopes'));
    console.log('X-Accepted-OAuth-Scopes:', res.headers.get('x-accepted-oauth-scopes'));
    
    const data = await res.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testToken();
