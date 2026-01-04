import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2'; 

function App() {
  // --- TÀI KHOẢN ADMIN MẶC ĐỊNH ---
  const [accounts, setAccounts] = useState([
    { user: 'admin', pass: 'admin1234', isAdmin: true, data: { classes: [], students: [] } }
  ]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClass, setSelectedClass] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  // --- FORM STATES ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authForm, setAuthForm] = useState({ user: '', pass: '' });
  const [authError, setAuthError] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [formData, setFormData] = useState({ masv: '', hoten: '', ngaysinh: '', gioitinh: 'Nam', malop: '' });
  const [gradeClassFilter, setGradeClassFilter] = useState(''); 
  const [gradeData, setGradeData] = useState({ masv: '', diemqt: '', diemthi: '' });
  const [editingStudent, setEditingStudent] = useState(null);
  const [originalMasv, setOriginalMasv] = useState(null);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      setClasses(currentUser.data.classes);
      setStudents(currentUser.data.students);
    } else {
      setClasses([]);
      setStudents([]);
    }
  }, [isLoggedIn, currentUser]); 

  useEffect(() => {
    if (isLoggedIn && currentUser && !currentUser.isAdmin) {
      setAccounts(prev => prev.map(acc => 
        acc.user === currentUser.user ? { ...acc, data: { classes, students } } : acc
      ));
    }
  }, [classes, students, isLoggedIn, currentUser]);

  const searchResults = students.filter(s => 
    searchTerm && (
      s.hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.masv.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const displayedClasses = classes.filter(cls => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const isClassNameMatch = cls.toLowerCase().includes(searchLower);
    const hasMatchingStudent = students.some(s => 
      s.malop === cls && 
      (s.hoten.toLowerCase().includes(searchLower) || s.masv.toLowerCase().includes(searchLower))
    );
    return isClassNameMatch || hasMatchingStudent;
  });

  const handleDeleteClass = (e, className) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Xác nhận xóa?',
      text: `Bạn có chắc chắn muốn xóa lớp "${className}" và toàn bộ sinh viên trong lớp này?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedClasses = classes.filter(c => c !== className);
        const updatedStudents = students.filter(s => s.malop !== className);
        setClasses(updatedClasses);
        setStudents(updatedStudents);
        Swal.fire('Đã xóa!', 'Lớp học đã được loại bỏ.', 'success');
      }
    });
  };

  const handleDeleteStudent = (masv, hoten) => {
    Swal.fire({
      title: 'Xóa sinh viên?',
      text: `Bạn có chắc chắn muốn xóa sinh viên ${hoten} (MSSV: ${masv})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Xác nhận'
    }).then((result) => {
      if (result.isConfirmed) {
        setStudents(students.filter(s => s.masv !== masv));
        Swal.fire('Thành công', 'Dữ liệu sinh viên đã được xóa.', 'success');
      }
    });
  };

  const handleDeleteAccount = (username) => {
    if (username === 'admin') {
      Swal.fire('Lỗi', 'Không thể xóa tài khoản Admin hệ thống!', 'error');
      return;
    }
    Swal.fire({
      title: 'Xóa người dùng?',
      text: `Bạn có chắc chắn muốn xóa tài khoản "${username}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Xóa ngay'
    }).then((result) => {
      if (result.isConfirmed) {
        setAccounts(accounts.filter(acc => acc.user !== username));
        Swal.fire('Đã xóa', 'Tài khoản đã được gỡ khỏi hệ thống.', 'success');
      }
    });
  };

  const calculateFinalGrade = (qt, thi) => {
    const q = parseFloat(qt) || 0;
    const t = parseFloat(thi) || 0;
    return ((q + t) / 2).toFixed(2);
  };

  const handleQuickEditGrade = (e) => {
    e.preventDefault();
    const updated = students.map(s => 
      s.masv === originalMasv 
      ? { ...editingStudent, diemtong: calculateFinalGrade(editingStudent.diemqt, editingStudent.diemthi) } 
      : s
    );
    setStudents(updated);
    setEditingStudent(null);
    setOriginalMasv(null);
    Swal.fire({ icon: 'success', title: 'Đã cập nhật', text: 'Thông tin sinh viên đã được thay đổi thành công!', timer: 1500, showConfirmButton: false });
  };

  const handleAuth = (e) => {
    e.preventDefault();
    setAuthError('');
    const { user, pass } = authForm;

    if (isRegisterMode) {
      if (/^\d/.test(user)) { setAuthError("Tên đăng nhập không được bắt đầu bằng số!"); return; }
      if (/\s/.test(user)) { setAuthError("Tên đăng nhập không được chứa khoảng trắng!"); return; }
      if (pass.length < 8) { setAuthError("Mật khẩu phải có nhất 8 ký tự!"); return; }
      
      if (accounts.find(a => a.user === user)) {
        setAuthError("Tài khoản đã tồn tại!");
      } else {
        const newAcc = { user, pass, isAdmin: false, data: { classes: [], students: [] } };
        setAccounts([...accounts, newAcc]);
        setCurrentUser(newAcc);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        Swal.fire({ icon: 'success', title: 'Chào mừng!', text: `Đăng ký thành công tài khoản ${user}`, timer: 2000, showConfirmButton: false });
      }
    } else {
      const acc = accounts.find(a => a.user === user && a.pass === pass);
      if (acc) {
        setCurrentUser(acc);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Đăng nhập thành công',
          text: `Chào mừng ${acc.isAdmin ? 'Quản trị viên' : 'Giảng viên'}: ${acc.user}`,
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        setAuthError("Sai thông tin hoặc mật khẩu không đúng!");
      }
    }
  };

  const sortStudents = (list) => {
    return [...list].sort((a, b) => {
      const nameA = a.hoten.split(" ").pop();
      const nameB = b.hoten.split(" ").pop();
      return nameA.localeCompare(nameB, 'vi');
    });
  };

  // --- CẬP NHẬT: NHẬP SINH VIÊN VÀ KIỂM TRA CỘT BẮT BUỘC ---
  const handleImportStudentsExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      if (data.length === 0) return;

      // Lấy danh sách các cột thực tế có trong file
      const headers = Object.keys(data[0]);
      
      // Kiểm tra sự tồn tại của các cột (chấp nhận một số biến thể tên cột)
      const missingColumns = [];
      if (!headers.some(h => h === 'MSSV')) missingColumns.push('MSSV');
      if (!headers.some(h => h === 'Họ và tên' || h === 'Họ Tên')) missingColumns.push('Họ và tên');
      if (!headers.some(h => h === 'Ngày tháng năm sinh' || h === 'Ngày sinh')) missingColumns.push('Ngày sinh');
      if (!headers.some(h => h === 'Giới tính')) missingColumns.push('Giới tính');
      if (!headers.some(h => h === 'Lớp' || h === 'Lớp Học Phần')) missingColumns.push('Lớp');

      if (missingColumns.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Thiếu cột dữ liệu',
          html: `File Excel của bạn thiếu các cột bắt buộc sau: <br><b class="text-danger">${missingColumns.join(', ')}</b>`,
        });
        e.target.value = null;
        return;
      }

      const missingClassesInSystem = [];
      data.forEach(item => {
        const lopImport = item['Lớp'] || item['Lớp Học Phần'];
        if (lopImport && !classes.includes(lopImport) && !missingClassesInSystem.includes(lopImport)) {
          missingClassesInSystem.push(lopImport);
        }
      });

      if (missingClassesInSystem.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Lớp học không tồn tại',
          html: `Vui lòng tạo các lớp sau trước khi thêm sinh viên: <br><b class="text-danger">${missingClassesInSystem.join(', ')}</b>`,
        });
        e.target.value = null;
        return;
      }

      const importedStudents = data.map((item) => {
        const lopImport = item['Lớp'] || item['Lớp Học Phần'];
        return {
          masv: String(item['MSSV'] || ''), 
          hoten: item['Họ và tên'] || item['Họ Tên'] || '',
          ngaysinh: item['Ngày tháng năm sinh'] || item['Ngày sinh'] || '', 
          gioitinh: item['Giới tính'] || 'Nam',
          malop: lopImport, 
          diemqt: item['Điểm quá trình'] || 0, 
          diemthi: item['Điểm kết thúc'] || item['Điểm thi'] || 0, 
          diemtong: calculateFinalGrade(item['Điểm quá trình'] || 0, item['Điểm kết thúc'] || item['Điểm thi'] || 0)
        };
      });

      setStudents(sortStudents([...importedStudents, ...students]));
      Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã nhập danh sách sinh viên từ Excel!', timer: 2000 });
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const handleImportGradesExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (classes.length === 0 || students.length === 0) {
        Swal.fire({ icon: 'error', title: 'Thông báo', text: 'Hệ thống cần có lớp và sinh viên trước khi nhập điểm!' });
        e.target.value = null;
        return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      let updateCount = 0;
      const updated = students.map(s => {
        const row = data.find(r => 
          String(r['MSSV']).trim() === String(s.masv).trim() && 
          String(r['Lớp'] || r['Lớp Học Phần']).trim() === String(s.malop).trim()
        );

        if (row) {
          const q = row['Điểm quá trình'] !== undefined ? row['Điểm quá trình'] : s.diemqt;
          const t = row['Điểm kết thúc'] || row['Điểm thi'] || s.diemthi;
          updateCount++;
          return { ...s, diemqt: q, diemthi: t, diemtong: calculateFinalGrade(q, t) };
        }
        return s;
      });
      
      if (updateCount === 0) {
        Swal.fire({ icon: 'warning', title: 'Chú ý', text: 'Không tìm thấy dữ liệu trùng khớp giữa File và Hệ thống (kiểm tra cột MSSV và Lớp).' });
      } else {
        setStudents(updated);
        Swal.fire({ icon: 'success', title: 'Hoàn tất', text: `Đã cập nhật điểm cho ${updateCount} sinh viên!`, timer: 2000 });
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const LandingView = () => (
    <div className="container-fluid d-flex align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 80px)', marginTop: '-20px' }}>
      <div className="row justify-content-center align-items-center w-100">
        <div className="col-lg-8 text-center animate__animated animate__fadeIn">
          <div className="mb-3">
            <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 fw-bold text-uppercase mb-2">Hệ thống quản lý EDU v2.0</span>
            <h1 className="display-4 fw-bold text-dark mb-2">Quản Lý <span className="text-primary">Học Tập</span> Hiệu Quả</h1>
            <p className="lead text-muted fs-5 mx-auto" style={{ maxWidth: '700px' }}>Nền tảng giúp giảng viên quản lý lớp học phần, theo dõi sinh viên và bảng điểm một cách chuyên nghiệp.</p>
          </div>
          <div className="d-flex justify-content-center gap-3 mb-5">
            <button className="btn btn-primary btn-lg px-4 py-2 fw-bold rounded-pill shadow" onClick={() => { setIsRegisterMode(false); setShowAuthModal(true); }}>
              <i className="fa-solid fa-right-to-bracket me-2"></i>Bắt đầu ngay
            </button>
            <button className="btn btn-outline-dark btn-lg px-4 py-2 fw-bold rounded-pill" onClick={() => { setIsRegisterMode(true); setShowAuthModal(true); }}>
              Đăng ký tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', overflow: isLoggedIn ? 'auto' : 'hidden' }}>
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom fixed-top py-3 shadow-sm">
        <div className="container-fluid px-4">
          <div className="d-flex justify-content-between align-items-center w-100">
            <span className="navbar-brand fw-bold fs-4 text-primary m-0" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
              <i className="fa-solid fa-graduation-cap me-2"></i>EDU-MANAGER {currentUser?.isAdmin && <span className="badge bg-danger ms-2 fs-6">ADMIN</span>}
            </span>
            <div className="d-flex align-items-center gap-2">
              {isLoggedIn ? (
                <>
                  <div className="text-end d-none d-sm-block me-2">
                    <div className="small text-muted">Xin chào,</div>
                    <div className="fw-bold text-dark">{currentUser.user}</div>
                  </div>
                  <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={() => {setIsLoggedIn(false); setCurrentUser(null); setActiveTab('home');}}>
                    Đăng xuất
                  </button>
                </>
              ) : (
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" onClick={() => { setIsRegisterMode(true); setShowAuthModal(true); }}>Đăng ký</button>
                  <button className="btn btn-primary btn-sm rounded-pill px-3 fw-bold shadow-sm" onClick={() => { setIsRegisterMode(false); setShowAuthModal(true); }}>Đăng nhập</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="d-flex" style={{ paddingTop: '80px' }}>
        {isLoggedIn && (
          <div className="bg-white border-end shadow-sm" style={{ width: '280px', position: 'fixed', height: 'calc(100vh - 80px)', zIndex: 100 }}>
            <div className="nav flex-column p-3 gap-2 mt-2">
              <button onClick={() => {setActiveTab('home'); setSelectedClass(null);}} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'home' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-house-chimney me-3"></i>Trang chủ
              </button>
              
              {currentUser.isAdmin && (
                <button onClick={() => setActiveTab('admin_users')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'admin_users' ? 'bg-danger text-white shadow' : 'text-muted'}`}>
                  <i className="fa-solid fa-users-gear me-3"></i>Quản lý người dùng
                </button>
              )}

              <button onClick={() => setActiveTab('add_class')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'add_class' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-folder-plus me-3"></i>Quản lý lớp học
              </button>
              <button onClick={() => setActiveTab('add_student')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'add_student' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-user-plus me-3"></i>Thêm sinh viên
              </button>
              <button onClick={() => setActiveTab('grade')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'grade' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-marker me-3"></i>Nhập điểm số
              </button>
            </div>
          </div>
        )}

        <div className="flex-grow-1" style={{ marginLeft: isLoggedIn ? '280px' : '0', padding: isLoggedIn ? '40px' : '0' }}>
          {!isLoggedIn ? (
            <LandingView />
          ) : (
            <div className="animate__animated animate__fadeIn">
              
              {activeTab === 'admin_users' && currentUser.isAdmin && (
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                  <h4 className="fw-bold mb-4 text-danger"><i className="fa-solid fa-users me-2"></i>Danh sách người dùng hệ thống</h4>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>STT</th>
                          <th>Tên tài khoản</th>
                          <th>Mật khẩu</th>
                          <th>Vai trò</th>
                          <th>Số lớp quản lý</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((acc, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="fw-bold">{acc.user}</td>
                            <td><code>{acc.pass}</code></td>
                            <td>
                              {acc.isAdmin ? 
                                <span className="badge bg-danger">Quản trị viên</span> : 
                                <span className="badge bg-info text-dark">Giảng viên</span>
                              }
                            </td>
                            <td>{acc.data.classes.length} lớp</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-danger rounded-pill" 
                                onClick={() => handleDeleteAccount(acc.user)}
                                disabled={acc.user === 'admin'}
                              >
                                <i className="fa-solid fa-user-slash me-1"></i> Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'home' && (
                <div>
                  <div className="mb-4 d-flex justify-content-between align-items-center">
                    <h4 className="fw-bold text-dark m-0">Bảng điều khiển</h4>
                    <div className="input-group shadow-sm" style={{ maxWidth: '400px' }}>
                      <span className="input-group-text bg-white border-end-0"><i className="fa-solid fa-magnifying-glass text-muted"></i></span>
                      <input type="text" className="form-control border-start-0 ps-0" placeholder="Tìm tên lớp, SV hoặc MSSV..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setSelectedClass(null);}} />
                    </div>
                  </div>

                  {searchTerm ? (
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                      <h5 className="fw-bold mb-3 text-primary">Kết quả tìm kiếm cho: "{searchTerm}"</h5>
                      {searchResults.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-hover text-center align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>MSSV</th><th className="text-start">Họ Tên</th><th>Lớp</th><th>QT</th><th>Thi</th><th>Tổng</th><th>Thao tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {searchResults.map((s, idx) => (
                                <tr key={idx}>
                                  <td>{s.masv}</td><td className="text-start">{s.hoten}</td><td><span className="badge bg-primary-subtle text-primary">{s.malop}</span></td>
                                  <td className="fw-bold">{s.diemqt}</td><td className="fw-bold">{s.diemthi}</td><td className="fw-bold text-danger">{s.diemtong}</td>
                                  <td>
                                    <div className="d-flex gap-2 justify-content-center">
                                      <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => {setEditingStudent({...s}); setOriginalMasv(s.masv);}}><i className="fa-solid fa-pen"></i></button>
                                      <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => handleDeleteStudent(s.masv, s.hoten)}><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-muted py-4 text-center">Không tìm thấy kết quả.</p>}
                    </div>
                  ) : (
                    !selectedClass ? (
                      <div className="row g-4">
                        {displayedClasses.length > 0 ? displayedClasses.map((cls, idx) => (
                          <div className="col-md-4 col-xl-3" key={idx} onClick={() => setSelectedClass(cls)} style={{ cursor: 'pointer' }}>
                            <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white hover-card border-top border-primary border-4 position-relative h-100 transition-all">
                              <button className="btn btn-sm btn-light text-danger position-absolute top-0 end-0 m-2 rounded-circle" onClick={(e) => handleDeleteClass(e, cls)}><i className="fa-solid fa-trash-can"></i></button>
                              <div className="fs-1 text-primary mb-2 mt-2"><i className="fa-solid fa-folder-closed"></i></div>
                              <h5 className="fw-bold m-0 text-truncate px-2">{cls}</h5>
                              <hr className="my-3 opacity-25" />
                              <span className="badge rounded-pill bg-primary-subtle text-primary">{students.filter(s => s.malop === cls).length} Sinh viên</span>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-5 w-100">
                            <h4 className="fw-bold text-dark mt-4">Chưa có dữ liệu lớp học</h4>
                            <button className="btn btn-primary rounded-pill px-5 mt-3 shadow" onClick={() => setActiveTab('add_class')}>Thêm lớp đầu tiên</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white animate__animated animate__fadeInRight">
                        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                          <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => setSelectedClass(null)}><i className="fa-solid fa-arrow-left me-1"></i> Quay lại</button>
                          <h4 className="fw-bold m-0 text-primary">Lớp: {selectedClass}</h4>
                          <span className="badge rounded-pill bg-light text-dark">Sĩ số: {students.filter(s => s.malop === selectedClass).length}</span>
                        </div>
                        {students.filter(s => s.malop === selectedClass).length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-hover text-center align-middle">
                              <thead className="table-light">
                                <tr>
                                  <th>MSSV</th><th className="text-start">Họ Tên</th><th>Ngày sinh</th><th>Giới tính</th><th>QT</th><th>Thi</th><th>Tổng</th><th>Thao tác</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortStudents(students.filter(s => s.malop === selectedClass)).map(s => (
                                  <tr key={s.masv}>
                                    <td>{s.masv}</td><td className="text-start">{s.hoten}</td><td>{s.ngaysinh}</td><td>{s.gioitinh}</td><td className="fw-bold">{s.diemqt}</td><td className="fw-bold">{s.diemthi}</td><td className="fw-bold text-danger">{s.diemtong}</td>
                                    <td>
                                      <div className="d-flex gap-2 justify-content-center">
                                        <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => {setEditingStudent({...s}); setOriginalMasv(s.masv);}} title="Sửa"><i className="fa-solid fa-pen-to-square"></i></button>
                                        <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => handleDeleteStudent(s.masv, s.hoten)} title="Xóa"><i className="fa-solid fa-trash"></i></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-5">
                            <i className="fa-solid fa-user-slash fs-1 text-muted mb-3 d-block"></i>
                            <p className="text-muted">Lớp học này hiện chưa có sinh viên nào.</p>
                            <button className="btn btn-primary btn-sm rounded-pill px-4" onClick={() => setActiveTab('add_student')}>
                              <i className="fa-solid fa-plus me-2"></i>Thêm sinh viên ngay
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {activeTab === 'grade' && (
                <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '600px' }}>
                  <h4 className="fw-bold mb-4 text-center text-primary">Nhập điểm định kỳ</h4>
                  
                  <div className="p-4 mb-4 border-2 border-dashed rounded-4 bg-light text-center border-primary">
                    <label className="fw-bold text-primary d-block mb-2">Tải tệp Excel điểm (Yêu cầu có cột: Lớp, MSSV, Điểm QT, Điểm Thi)</label>
                    <input 
                        type="file" 
                        className="form-control" 
                        accept=".xlsx, .xls" 
                        onChange={handleImportGradesExcel}
                        disabled={classes.length === 0} 
                    />
                  </div>

                  <form onSubmit={e => {
                    e.preventDefault();
                    
                    if (classes.length === 0) {
                        Swal.fire({ icon: 'error', title: 'Thông báo', text: 'Bạn cần thêm lớp học phần trước!' });
                        return;
                    }

                    const studentsInClass = students.filter(s => s.malop === gradeClassFilter);
                    if (gradeClassFilter && studentsInClass.length === 0) {
                      Swal.fire({ icon: 'warning', title: 'Thông báo', text: 'Lớp học phần này hiện chưa có sinh viên. Vui lòng thêm sinh viên trước khi nhập điểm!' });
                      return;
                    }

                    if (!gradeData.masv) {
                      Swal.fire('Lỗi', 'Vui lòng chọn một sinh viên cụ thể!', 'error');
                      return;
                    }

                    setStudents(students.map(s => s.masv === gradeData.masv ? {...s, diemqt: gradeData.diemqt, diemthi: gradeData.diemthi, diemtong: calculateFinalGrade(gradeData.diemqt, gradeData.diemthi)} : s));
                    Swal.fire('Thành công', 'Đã lưu điểm sinh viên!', 'success');
                  }}>
                    <div className="mb-3">
                      <label className="small fw-bold">Chọn lớp</label>
                      <select className="form-select" required value={gradeClassFilter} onChange={e => {setGradeClassFilter(e.target.value); setGradeData({...gradeData, masv: ''});}}>
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="small fw-bold">Chọn sinh viên</label>
                      <select 
                        className="form-select" 
                        required 
                        disabled={!gradeClassFilter || students.filter(s => s.malop === gradeClassFilter).length === 0} 
                        value={gradeData.masv} 
                        onChange={e => setGradeData({...gradeData, masv: e.target.value})}
                      >
                         {students.filter(s => s.malop === gradeClassFilter).length === 0 ? (
                            <option value="">{gradeClassFilter ? "(Lớp chưa có sinh viên)" : "(Chọn lớp trước)"}</option>
                          ) : (
                            <>
                              <option value="">-- Chọn sinh viên --</option>
                              {sortStudents(students.filter(s => s.malop === gradeClassFilter)).map(s => (<option key={s.masv} value={s.masv}>{s.hoten} - {s.masv}</option>))}
                            </>
                          )}
                      </select>
                    </div>
                    <div className="row g-3">
                      <div className="col-6"><label className="small fw-bold">Điểm QT</label><input type="number" step="0.1" className="form-control" required value={gradeData.diemqt} onChange={e => setGradeData({...gradeData, diemqt: e.target.value})} /></div>
                      <div className="col-6"><label className="small fw-bold">Điểm Thi</label><input type="number" step="0.1" className="form-control" required value={gradeData.diemthi} onChange={e => setGradeData({...gradeData, diemthi: e.target.value})} /></div>
                    </div>
                    <button className="btn btn-primary w-100 mt-4 py-3 fw-bold rounded-3 shadow" type="submit" disabled={!gradeData.masv}>Cập nhật điểm</button>
                  </form>
                </div>
              )}

              {activeTab === 'add_class' && (
                <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '500px' }}>
                  <h4 className="fw-bold mb-4 text-center text-primary">Quản lý lớp học</h4>
                  <div className="mb-3">
                    <label className="small fw-bold mb-2">Tên lớp học phần mới</label>
                    <input type="text" className="form-control form-control-lg" placeholder="Nhập tên lớp..." value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                  </div>
                  <button className="btn btn-primary w-100 fw-bold py-3 shadow" onClick={() => { if(newClassName){setClasses([...classes, newClassName]); setNewClassName(''); setActiveTab('home'); Swal.fire('Thành công', 'Đã thêm lớp học mới!', 'success');} }}>Thêm học phần</button>
                </div>
              )}

              {activeTab === 'add_student' && (
                <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '800px' }}>
                  <h4 className="fw-bold mb-4 text-center text-primary">Thêm Sinh viên</h4>
                  <div className="p-4 mb-4 border border-dashed rounded-4 bg-light text-center border-primary">
                    <label className="fw-bold text-primary d-block mb-2">Import từ Excel</label>
                    <input type="file" className="form-control" accept=".xlsx, .xls" onChange={handleImportStudentsExcel} />
                  </div>
                  <form onSubmit={e => { 
                    e.preventDefault(); 
                    if (!formData.masv || !formData.hoten || !formData.ngaysinh || !formData.malop) {
                        Swal.fire('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error');
                        return;
                    }
                    setStudents(sortStudents([...students, {...formData, diemqt:0, diemthi:0, diemtong:0}])); 
                    Swal.fire('Thành công', 'Đã thêm sinh viên vào danh sách!', 'success');
                    setFormData({ masv: '', hoten: '', ngaysinh: '', gioitinh: 'Nam', malop: '' });
                  }}>
                    <div className="row g-3">
                      <div className="col-md-6"><label className="small fw-bold">Họ tên *</label><input type="text" className="form-control" required value={formData.hoten} onChange={e => setFormData({...formData, hoten: e.target.value})} /></div>
                      <div className="col-md-6"><label className="small fw-bold">MSSV *</label><input type="text" className="form-control" required value={formData.masv} onChange={e => setFormData({...formData, masv: e.target.value})} /></div>
                      <div className="col-md-6"><label className="small fw-bold">Ngày sinh *</label><input type="date" className="form-control" required value={formData.ngaysinh} onChange={e => setFormData({...formData, ngaysinh: e.target.value})} /></div>
                      <div className="col-md-6"><label className="small fw-bold">Giới tính *</label><select className="form-select" required value={formData.gioitinh} onChange={e => setFormData({...formData, gioitinh: e.target.value})}><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
                      <div className="col-12">
                        <label className="small fw-bold">Phân vào lớp học *</label>
                        <select className="form-select" value={formData.malop} required onChange={e => setFormData({...formData, malop: e.target.value})}>
                          <option value="">-- Chọn lớp học --</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-12 mt-4"><button className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow">Lưu vào danh sách</button></div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editingStudent && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div className="card shadow border-0 p-4 animate__animated animate__zoomIn" style={{ width: '550px', borderRadius: '24px' }}>
            <div className="d-flex justify-content-between mb-4 border-bottom pb-3">
              <h5 className="fw-bold text-primary m-0">Chỉnh sửa thông tin chi tiết</h5>
              <button className="btn-close" onClick={() => {setEditingStudent(null); setOriginalMasv(null);}}></button>
            </div>
            <form onSubmit={handleQuickEditGrade}>
              <div className="row g-3">
                <div className="col-12"><label className="small fw-bold">Họ tên *</label><input type="text" className="form-control py-2" required value={editingStudent.hoten} onChange={e => setEditingStudent({...editingStudent, hoten: e.target.value})} /></div>
                <div className="col-6"><label className="small fw-bold">MSSV *</label><input type="text" className="form-control py-2" required value={editingStudent.masv} onChange={e => setEditingStudent({...editingStudent, masv: e.target.value})} /></div>
                <div className="col-6"><label className="small fw-bold">Lớp *</label>
                  <select className="form-select py-2" required value={editingStudent.malop} onChange={e => setEditingStudent({...editingStudent, malop: e.target.value})}>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="col-6"><label className="small fw-bold">Ngày sinh *</label><input type="date" className="form-control py-2" required value={editingStudent.ngaysinh} onChange={e => setEditingStudent({...editingStudent, ngaysinh: e.target.value})} /></div>
                <div className="col-6"><label className="small fw-bold">Giới tính *</label>
                  <select className="form-select py-2" required value={editingStudent.gioitinh} onChange={e => setEditingStudent({...editingStudent, gioitinh: e.target.value})}><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select>
                </div>
                <div className="col-6"><label className="small fw-bold">Điểm QT</label><input type="number" step="0.1" className="form-control py-2" value={editingStudent.diemqt} onChange={e => setEditingStudent({...editingStudent, diemqt: e.target.value})} /></div>
                <div className="col-6"><label className="small fw-bold">Điểm Thi</label><input type="number" step="0.1" className="form-control py-2" value={editingStudent.diemthi} onChange={e => setEditingStudent({...editingStudent, diemthi: e.target.value})} /></div>
              </div>
              <div className="mt-4 d-flex gap-2 pt-3">
                <button type="button" className="btn btn-light w-100 fw-bold py-2" onClick={() => {setEditingStudent(null); setOriginalMasv(null);}}>Hủy</button>
                <button type="submit" className="btn btn-primary w-100 fw-bold py-2">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, backdropFilter: 'blur(8px)' }}>
          <div className="card shadow border-0 p-5" style={{ width: '450px', borderRadius: '30px' }}>
            <div className="text-center mb-4">
              <div className="bg-primary-subtle d-inline-block p-3 rounded-circle mb-3"><i className="fa-solid fa-lock text-primary fs-3"></i></div>
              <h3 className="fw-bold text-dark">{isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}</h3>
            </div>
            <form onSubmit={handleAuth}>
              {authError && <div className="alert alert-danger border-0 small py-2">{authError}</div>}
              <div className="mb-3">
                <label className="small fw-bold mb-1">Tên tài khoản</label>
                <input type="text" className="form-control form-control-lg border-light bg-light" required value={authForm.user} onChange={e => setAuthForm({...authForm, user: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="small fw-bold mb-1">Mật khẩu (ít nhất 8 ký tự)</label>
                <input type="password" className="form-control form-control-lg border-light bg-light" required value={authForm.pass} onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
              </div>
              <button className="btn btn-primary w-100 py-3 fw-bold rounded-pill shadow-sm mb-3">{isRegisterMode ? 'Đăng ký & Đăng nhập' : 'Đăng nhập ngay'}</button>
            </form>
            <div className="text-center small">
              <span className="text-muted" style={{ cursor: 'pointer' }} onClick={() => {setIsRegisterMode(!isRegisterMode); setAuthError('');}}>
                {isRegisterMode ? "Đã có tài khoản? Quay lại đăng nhập" : "Chưa có tài khoản? Đăng ký ngay"}
              </span>
            </div>
            <button className="btn-close position-absolute top-0 end-0 m-4" onClick={() => setShowAuthModal(false)}></button>
          </div>
        </div>
      )}

      <style>{`
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-card:hover { transform: translateY(-5px); box-shadow: 0 1rem 3rem rgba(0,0,0,.1) !important; }
        .bg-primary-subtle { background-color: #e0e7ff !important; }
        .text-primary { color: #4f46e5 !important; }
        .btn-primary { background-color: #4f46e5; border: none; }
        .btn-primary:hover { background-color: #4338ca; }
        .nav-link:hover { background-color: #f1f5f9; }
        .form-control:focus { outline: none !important; box-shadow: none !important; border-color: #dee2e6 !important; }
      `}</style>

    </div>
  );
}

export default App;
