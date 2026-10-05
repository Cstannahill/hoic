
fetch('http://127.0.0.1:3000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'email=test%40example.com&password=testpassword123'
}).then(r => console.log(r.status));

