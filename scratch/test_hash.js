const bcrypt = require('bcryptjs');
const hash = '$2a$10$W19drP7K2IC87a9/Q0YDOOCkcSyAGF4ZPWEoZRj4b9np0DhbTdw0W';
const password = 'elif';

bcrypt.compare(password, hash).then(res => {
    console.log('Match elif:', res);
});
