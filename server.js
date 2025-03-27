const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

const dbConfig = {
  user: 'sa', // Thay bằng username SQL Server của bạn
  password: '123456', // Thay bằng password SQL Server của bạn
  server: 'hoangdev21', // Ví dụ: 'localhost' hoặc IP server
  database: 'ThongTinUser', // Tên database của bạn
  options: {
    encrypt: true, // Nếu dùng Azure, để true; nếu không, để false
    trustServerCertificate: true // Cho local development
  }
};

// Kết nối tới SQL Server
async function connectToDatabase() {
  try {
    await sql.connect(dbConfig);
    console.log('Connected to SQL Server');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

connectToDatabase();

// API đăng ký
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Vui lòng nhập đầy đủ thông tin!' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Mã hóa mật khẩu
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    // Kiểm tra xem username đã tồn tại chưa
    const checkUser = await request
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE Username = @username');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Tên đăng nhập đã tồn tại!' });
    }

    // Thêm user mới
    await request
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .query('INSERT INTO Users (Username, Password) VALUES (@username, @password)');

    res.json({ status: 'success', message: 'Đăng ký thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Lỗi server!' });
  }
});

// API đăng nhập
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Vui lòng nhập đầy đủ thông tin!' });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    const result = await request
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE Username = @username');

    if (result.recordset.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tên đăng nhập không tồn tại!' });
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(password, user.Password);

    if (!isPasswordValid) {
      return res.status(400).json({ status: 'error', message: 'Mật khẩu không đúng!' });
    }

    res.json({ status: 'success', message: 'Đăng nhập thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Lỗi server!' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});