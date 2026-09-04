const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 4174,
  path: '/api/data/public',
  method: 'GET'
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('majors length:', json.payload?.majors?.length);
      console.log('classes length:', json.payload?.classes?.length);
      console.log('students length:', json.payload?.students?.length);
    } catch(e) {
      console.error(e.message);
    }
  });
});
req.on('error', console.error);
req.end();
