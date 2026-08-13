import http from 'http';

const loginReq = http.request({
  hostname: '127.0.0.1',
  port: 4174,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});

loginReq.write(JSON.stringify({
  username: 'test',
  password: '123'
}));
loginReq.end();
