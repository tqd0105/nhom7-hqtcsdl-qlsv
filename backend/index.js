const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
// POST - Đăng ký user
const bcrypt = require('bcrypt');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Tạo connection pool với PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Kiểm tra kết nối database
pool.connect((err, client, release) => {
  if (err) {
    console.error('Lỗi kết nối database:', err.stack);
  } else {
    console.log('Kết nối database thành công');
    release();
  }
});

app.use(cors());
app.use(express.json());

// API test kết nối
app.get("/api/xinchao", (req, res) => {
  res.json({ message: "Xin chào từ Express backend" });
});


// 1. Lấy danh sách người dùng (Chỉ dành cho Admin)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT userid, username, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Xóa người dùng
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE userid = $1', [id]);
        res.json({ success: true, message: 'Xóa tài khoản thành công' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET - Lấy danh sách tất cả sinh viên
app.get("/api/sinhvien", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        sv.masv, 
        sv.hoten, 
        sv.ngaysinh, 
        sv.gioitinh, 
        sv.malop,
        l.tenlop, 
        l.khoa,
        DATE_PART('year', AGE(sv.ngaysinh)) AS tuoi
       FROM sinhvien sv
       LEFT JOIN lop l ON sv.malop = l.malop
       ORDER BY sv.masv`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn database:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy danh sách sinh viên" 
    });
  }
});

// POST - Thêm sinh viên mới (sử dụng stored procedure)
app.post("/api/themsinhvien", async (req, res) => {
  const { masv, hoten, ngaysinh, gioitinh, malop } = req.body;

  if (!masv || !hoten || !ngaysinh || !gioitinh || !malop) {
    return res.status(400).json({ 
      success: false,
      error: "Thiếu thông tin bắt buộc. Cần có: masv, hoten, ngaysinh, gioitinh, malop" 
    });
  }

  try {
    await pool.query(
      "CALL them_sinhvien($1, $2, $3, $4, $5)",
      [masv, hoten, ngaysinh, gioitinh, malop]
    );
    
    res.status(201).json({ 
      success: true,
      message: `Thêm sinh viên ${masv} thành công`,
      data: { masv, hoten }
    });
  } catch (error) {
    console.error("Lỗi thêm sinh viên:", error);
    
    if (error.message.includes("phải đủ 16 tuổi")) {
      return res.status(400).json({ 
        success: false,
        error: "Sinh viên phải đủ 16 tuổi trở lên" 
      });
    }
    if (error.message.includes("không tồn tại")) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: "Mã sinh viên đã tồn tại" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Không thể thêm sinh viên" 
    });
  }
});

// PUT - Cập nhật thông tin sinh viên (sử dụng stored procedure)
app.put("/api/capnhatsinhvien/:masv", async (req, res) => {
  const { masv } = req.params;
  const { hoten, ngaysinh, gioitinh, malop } = req.body;

  try {
    await pool.query(
      "CALL capnhat_sinhvien($1, $2, $3, $4, $5)",
      [masv, hoten || null, ngaysinh || null, gioitinh || null, malop || null]
    );
    
    res.json({ 
      success: true,
      message: `Cập nhật sinh viên ${masv} thành công`,
      data: { masv }
    });
  } catch (error) {
    console.error("Lỗi cập nhật sinh viên:", error);
    
    if (error.message.includes("không tồn tại")) {
      return res.status(404).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Không thể cập nhật sinh viên" 
    });
  }
});

// PUT - Cập nhật thông tin lớp học
app.put("/api/capnhatlop/:malop", async (req, res) => {
  const { malop: currentMalop } = req.params;
  const { malop, tenlop, khoa } = req.body;

  if (!malop || !tenlop || !khoa) {
    return res.status(400).json({ 
      success: false,
      error: "Thiếu thông tin bắt buộc. Cần có: malop, tenlop, khoa" 
    });
  }

  try {
    // Kiểm tra lớp hiện tại có tồn tại không
    const checkResult = await pool.query(
      "SELECT malop FROM lop WHERE malop = $1",
      [currentMalop]
    );

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Lớp học không tồn tại" 
      });
    }

    // Nếu mã lớp thay đổi, kiểm tra mã mới có trùng không
    if (malop !== currentMalop) {
      const duplicateCheck = await pool.query(
        "SELECT malop FROM lop WHERE malop = $1",
        [malop]
      );

      if (duplicateCheck.rowCount > 0) {
        return res.status(400).json({ 
          success: false,
          error: "Mã lớp mới đã tồn tại" 
        });
      }
    }

    // Nếu mã lớp thay đổi, cập nhật bảng sinh viên trước
    if (malop !== currentMalop) {
      await pool.query(
        "UPDATE sinhvien SET malop = $1 WHERE malop = $2",
        [malop, currentMalop]
      );
    }

    // Sau đó mới cập nhật thông tin lớp
    await pool.query(
      `UPDATE lop 
       SET malop = $1, tenlop = $2, khoa = $3 
       WHERE malop = $4`,
      [malop, tenlop, khoa, currentMalop]
    );
    
    res.json({ 
      success: true,
      message: `Cập nhật lớp ${malop} thành công`,
      data: { malop, tenlop, khoa }
    });
  } catch (error) {
    console.error("Lỗi cập nhật lớp:", error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: "Mã lớp đã tồn tại" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Không thể cập nhật lớp học" 
    });
  }
});

// DELETE - Xóa sinh viên (sử dụng stored procedure)
app.delete("/api/xoasinhvien/:masv", async (req, res) => {
  const { masv } = req.params;

  try {
    await pool.query(
      "CALL xoa_sinhvien($1)",
      [masv]
    );
    
    res.json({ 
      success: true,
      message: `Xóa sinh viên ${masv} thành công`
    });
  } catch (error) {
    console.error("Lỗi xóa sinh viên:", error);
    
    if (error.message.includes("không tồn tại")) {
      return res.status(404).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Không thể xóa sinh viên" 
    });
  }
});

// POST - Nhập điểm cho sinh viên (sử dụng stored procedure)
app.post("/api/nhapdiem", async (req, res) => {
  const { masv, mamon, hocky, namhoc, diemqt, diemthi } = req.body;

  if (!masv || !mamon || !hocky || !namhoc || diemqt === undefined || diemthi === undefined) {
    return res.status(400).json({ 
      success: false,
      error: "Thiếu thông tin bắt buộc. Cần có: masv, mamon, hocky, namhoc, diemqt, diemthi" 
    });
  }

  if (diemqt < 0 || diemqt > 10 || diemthi < 0 || diemthi > 10) {
    return res.status(400).json({ 
      success: false,
      error: "Điểm phải nằm trong khoảng 0 - 10" 
    });
  }

  try {
    await pool.query(
      "CALL nhap_diem($1, $2, $3, $4, $5, $6)",
      [masv, mamon, hocky, namhoc, parseFloat(diemqt), parseFloat(diemthi)]
    );
    
    res.status(201).json({ 
      success: true,
      message: `Nhập điểm cho sinh viên ${masv} môn ${mamon} thành công`,
      data: { masv, mamon, diemqt, diemthi }
    });
  } catch (error) {
    console.error("Lỗi nhập điểm:", error);
    
    if (error.message.includes("chưa đăng ký")) {
      return res.status(400).json({ 
        success: false,
        error: "Sinh viên chưa đăng ký môn học này" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message || "Không thể nhập điểm" 
    });
  }
});

// GET - Tính điểm trung bình của sinh viên (function)
app.get("/api/sinhvien/:masv/diemtrungbinh", async (req, res) => {
  const { masv } = req.params;
  
  try {
    const result = await pool.query(
      "SELECT tinh_diem_trung_binh($1) as diem_trung_binh",
      [masv]
    );
    
    res.json({
      success: true,
      data: {
        masv: masv,
        diem_trung_binh: result.rows[0].diem_trung_binh
      }
    });
  } catch (error) {
    console.error("Lỗi tính điểm:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể tính điểm trung bình" 
    });
  }
});

// GET - Kiểm tra điểm hợp lệ (function)
app.get("/api/kiemtra/diem/:score", async (req, res) => {
  const { score } = req.params;
  
  try {
    const result = await pool.query(
      "SELECT check_diem($1) as hop_le",
      [parseFloat(score)]
    );
    
    res.json({
      success: true,
      data: {
        diem: parseFloat(score),
        hop_le: result.rows[0].hop_le
      }
    });
  } catch (error) {
    console.error("Lỗi kiểm tra điểm:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể kiểm tra điểm" 
    });
  }
});

// GET - Kiểm tra tuổi hợp lệ (function)
app.get("/api/kiemtra/tuoi", async (req, res) => {
  const { ngaysinh } = req.query;
  
  if (!ngaysinh) {
    return res.status(400).json({ 
      success: false,
      error: "Thiếu tham số ngaysinh (format: YYYY-MM-DD)" 
    });
  }
  
  try {
    const result = await pool.query(
      "SELECT check_tuoi($1) as du_tuoi",
      [ngaysinh]
    );
    
    res.json({
      success: true,
      data: {
        ngaysinh: ngaysinh,
        du_tuoi: result.rows[0].du_tuoi
      }
    });
  } catch (error) {
    console.error("Lỗi kiểm tra tuổi:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể kiểm tra tuổi" 
    });
  }
});

// GET - View v_tuoi_sinhvien
app.get("/api/xem/tuoisinhvien", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_tuoi_sinhvien ORDER BY masv`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn view:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy dữ liệu tuổi sinh viên" 
    });
  }
});

// GET - View v_xeploai
app.get("/api/xem/xeploai", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_xeploai ORDER BY diemtong DESC`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn view:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy dữ liệu xếp loại" 
    });
  }
});

// GET - View v_sv_lop
app.get("/api/xem/sinhvientheolop", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_sv_lop ORDER BY malop, masv`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn view:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy dữ liệu sinh viên theo lớp" 
    });
  }
});

// GET - View v_sv_diem
app.get("/api/xem/sinhvienthediem", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_sv_diem ORDER BY masv, hocky, namhoc`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn view:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy dữ liệu sinh viên và điểm" 
    });
  }
});

// GET - View v_diem_trung_binh
app.get("/api/xem/diemtrungbinh", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_diem_trung_binh ORDER BY diem_trung_binh DESC NULLS LAST`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn view:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy dữ liệu điểm trung bình" 
    });
  }
});

// GET - View v_thong_ke_lop
app.get("/api/xem/thongkelop", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_thong_ke_lop ORDER BY malop`
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn view:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy thống kê lớp" 
    });
  }
});

// GET - Lấy danh sách lớp
app.get("/api/lop", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT malop, tenlop, khoa FROM lop ORDER BY malop`
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Lỗi truy vấn database:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy danh sách lớp" 
    });
  }
});

// GET - Lấy danh sách môn học
app.get("/api/monhoc", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mamon, tenmon, sotinchi FROM monhoc ORDER BY mamon`
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Lỗi truy vấn database:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy danh sách môn học" 
    });
  }
});

// POST - Đăng ký môn học
app.post("/api/dangkymon", async (req, res) => {
  const { masv, mamon, hocky, namhoc } = req.body;

  if (!masv || !mamon || !hocky || !namhoc) {
    return res.status(400).json({ 
      success: false,
      error: "Thiếu thông tin bắt buộc: masv, mamon, hocky, namhoc" 
    });
  }

  try {
    await pool.query(
      "CALL dang_ki_mon($1, $2, $3, $4)",
      [masv, mamon, parseInt(hocky), namhoc]
    );
    
    res.status(201).json({ 
      success: true,
      message: `Đăng ký môn ${mamon} cho sinh viên ${masv} thành công`,
      data: { masv, mamon, hocky, namhoc }
    });
  } catch (error) {
    console.error("Lỗi đăng ký môn:", error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Không thể đăng ký môn học" 
    });
  }
});

// POST - Đăng ký user
app.post("/api/register", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Thiếu username hoặc password"
    });
  }

  try {
    // Check trùng username
    const check = await pool.query(
      "SELECT 1 FROM users WHERE username = $1",
      [username]
    );

    if (check.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Username đã tồn tại"
      });
    }

    // HASH password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING userid, username, role`,
      [username, hashedPassword, role || 'user']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({
      success: false,
      error: "Không thể đăng ký user"
    });
  }
});
// POST - Đăng nhập
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Thiếu username hoặc password"
    });
  }

  try {
    const result = await pool.query(
      "SELECT userid, username, password, role FROM users WHERE username = $1",
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: "Sai tài khoản hoặc mật khẩu"
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Sai tài khoản hoặc mật khẩu"
      });
    }

    res.json({
      success: true,
      data: {
        userid: user.userid,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({
      success: false,
      error: "Không thể đăng nhập"
    });
  }
});


// GET - Lấy điểm của sinh viên
app.get("/api/diem/:masv", async (req, res) => {
  const { masv } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        d.masv,
        d.mamon,
        mh.tenmon,
        d.hocky,
        d.namhoc,
        d.diemqt,
        d.diemthi,
        d.diemtong
       FROM diem d
       JOIN monhoc mh ON d.mamon = mh.mamon
       WHERE d.masv = $1
       ORDER BY d.namhoc, d.hocky, d.mamon`,
      [masv]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error("Lỗi truy vấn database:", error);
    res.status(500).json({ 
      success: false,
      error: "Không thể lấy điểm sinh viên" 
    });
  }
});
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express backend" });
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Không tìm thấy API endpoint" 
  });
});

// Middleware xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ 
    success: false,
    error: "Có lỗi xảy ra trên server" 
  });
});


app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

