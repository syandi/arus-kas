import { app } from './src/lib/server/api/index.js';

async function test() {
  const headers = new Headers();
  headers.append('cookie', 'csrf_token=1234');
  headers.append('x-csrf-token', '1234');
  headers.append('content-type', 'application/json');
  
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({username: 'admin', password: 'admin123'})
  });

  const res = await app.handle(req);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

test().catch(console.error);
