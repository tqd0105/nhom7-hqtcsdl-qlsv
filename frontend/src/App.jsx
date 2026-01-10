import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClass, setSelectedClass] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  // --- FORM STATES ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authForm, setAuthForm] = useState({ user: '', pass: '' });
  const [authError, setAuthError] = useState('');
  const [newClassName, setNewClassName] = useState({ malop: '', tenlop: '', khoa: '' });
  const [formData, setFormData] = useState({ masv: '', hoten: '', ngaysinh: '', gioitinh: 'Nam', malop: '' });
  const [gradeClassFilter, setGradeClassFilter] = useState(''); 
  const [gradeData, setGradeData] = useState({ masv: '', mamon: 'CSDL', hocky: 1, namhoc: '2024-2025', diemqt: '', diemthi: '' });
  const [editingStudent, setEditingStudent] = useState(null);
  const [originalMasv, setOriginalMasv] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [originalMalop, setOriginalMalop] = useState(null);

  // Khôi phục trạng thái đăng nhập từ localStorage khi component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Lỗi khi đọc thông tin đăng nhập:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/api/users`);
    const result = await response.json();
    
    // Sửa ở đây: Backend trả về result.data chứ không phải result.users
    if (result.success) {
      setAllUsers(result.data); 
    }
  } catch (error) {
    console.error("Lỗi fetch users:", error);
  }
};

  // Fetch dữ liệu sinh viên kèm điểm
  const fetchStudentsWithGrades = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sinhvien-diem`);
      const result = await response.json();
      
      if (result.success) {
        console.log("Dữ liệu sinh viên kèm điểm:", result.data);
        const formattedStudents = result.data.map(s => ({
          ...s,
          ngaysinh: s.ngaysinh ? new Date(s.ngaysinh).toISOString().split('T')[0] : '',
          diemqt: s.diemqt || 0,
          diemthi: s.diemthi || 0,
          diemtong: s.diemtong || null
        }));
        setStudents(formattedStudents);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Lỗi fetch sinh viên kèm điểm:", error);
      return false;
    }
  };
  // Fetch dữ liệu từ backend
  const fetchData = async () => {
    try {
      // Thử fetch sinh viên kèm điểm trước
      const hasGradeData = await fetchStudentsWithGrades();
      
      // Nếu không có API sinh viên kèm điểm, fetch riêng từng bảng
      if (!hasGradeData) {
        const [resSv, resLop] = await Promise.all([
          fetch(`${API_URL}/api/sinhvien`),
          fetch(`${API_URL}/api/lop`)
        ]);
        
        const dataSv = await resSv.json();
        const dataLop = await resLop.json();
        
        console.log("Dữ liệu sinh viên từ backend:", dataSv.data);
        
        if (dataSv.success) {
          let formattedStudents = dataSv.data.map(s => ({
            ...s,
            ngaysinh: s.ngaysinh ? new Date(s.ngaysinh).toISOString().split('T')[0] : '',
            diemqt: 0,
            diemthi: 0,
            diemtong: null
          }));
          
          // Fetch điểm cho từng sinh viên
          console.log("Đang fetch điểm cho từng sinh viên...");
          for (let i = 0; i < formattedStudents.length; i++) {
            try {
              const resDiem = await fetch(`${API_URL}/api/diem/${formattedStudents[i].masv}`);
              const dataDiem = await resDiem.json();
              
              if (dataDiem.success && dataDiem.data && dataDiem.data.length > 0) {
                // Lấy điểm mới nhất (có thể có nhiều môn)
                const latestGrade = dataDiem.data[0]; // Hoặc tính trung bình nhiều môn
                formattedStudents[i] = {
                  ...formattedStudents[i],
                  diemqt: latestGrade.diemqt || 0,
                  diemthi: latestGrade.diemthi || 0,
                  diemtong: latestGrade.diemtong || null
                };
                console.log(`Đã lấy điểm cho ${formattedStudents[i].masv}:`, latestGrade);
              } else {
                console.log(`Không có điểm cho sinh viên ${formattedStudents[i].masv}`);
              }
            } catch (diemError) {
              console.log(`Lỗi fetch điểm cho ${formattedStudents[i].masv}:`, diemError);
            }
          }
          
          console.log("Danh sách sinh viên sau khi merge điểm:", formattedStudents);
          setStudents(formattedStudents);
        }
        
        if (dataLop.success) {
          setClasses(dataLop.data);
        }
      } else {
        // Vẫn cần fetch dữ liệu lớp nếu đã có dữ liệu sinh viên kèm điểm
        const resLop = await fetch(`${API_URL}/api/lop`);
        const dataLop = await resLop.json();
        if (dataLop.success) {
          setClasses(dataLop.data);
        }
      }
    } catch (error) {
      console.error("Lỗi fetch data:", error);
    }
  };

useEffect(() => {
  const loadInitialData = async () => {
    if (isLoggedIn) {
      // 1. Luôn lấy dữ liệu sinh viên và lớp khi đã đăng nhập
      await fetchData();

      // 2. Nếu là Admin thì lấy thêm danh sách người dùng
      if (currentUser?.isAdmin) {
        await fetchUsers();
      }
    } else {
      // 3. Khi logout thì dọn dẹp toàn bộ dữ liệu
      setClasses([]);
      setStudents([]);
      setAllUsers([]);
    }
  };

  loadInitialData();
}, [isLoggedIn, currentUser?.isAdmin]); // Lắng nghe cả trạng thái login và quyền admin

  const searchResults = students.filter(s => 
    searchTerm && (
      s.hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.masv.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const displayedClasses = classes.filter(cls => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const isClassNameMatch = cls.malop?.toLowerCase().includes(searchLower) || 
                             cls.tenlop?.toLowerCase().includes(searchLower) ||
                             cls.khoa?.toLowerCase().includes(searchLower);
    const hasMatchingStudent = students.some(s => 
      s.malop === cls.malop && 
      (s.hoten.toLowerCase().includes(searchLower) || s.masv.toLowerCase().includes(searchLower))
    );
    return isClassNameMatch || hasMatchingStudent;
  });

  const handleDeleteClass = async (e, className) => {
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
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Backend hiện tại chưa có API xóa lớp, thông báo cho người dùng
        Swal.fire('Thông báo', 'Tính năng xóa lớp hiện chưa được backend hỗ trợ.', 'info');
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
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${API_URL}/api/xoasinhvien/${masv}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (data.success) {
            setStudents(students.filter(s => s.masv !== masv));
            Swal.fire('Thành công', 'Dữ liệu sinh viên đã được xóa.', 'success');
          } else {
            Swal.fire('Lỗi', data.error || 'Không thể xóa sinh viên', 'error');
          }
        } catch (error) {
          Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
        }
      }
    });
  };

  const calculateFinalGrade = (qt, thi) => {
    const q = parseFloat(qt) || 0;
    const t = parseFloat(thi) || 0;
    return ((q + t) / 2).toFixed(2);
  };

  const handleQuickEditGrade = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/capnhatsinhvien/${originalMasv}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoten: editingStudent.hoten,
          ngaysinh: editingStudent.ngaysinh,
          gioitinh: editingStudent.gioitinh,
          malop: editingStudent.malop
        })
      });
      const data = await response.json();
      if (data.success) {
        // Sau khi cập nhật thông tin cơ bản, cập nhật điểm nếu có
        if (editingStudent.diemqt !== undefined || editingStudent.diemthi !== undefined) {
          await fetch(`${API_URL}/api/nhapdiem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              masv: originalMasv,
              mamon: 'CSDL', // Mặc định môn Cơ sở dữ liệu
              hocky: 1,
              namhoc: '2024-2025',
              diemqt: editingStudent.diemqt,
              diemthi: editingStudent.diemthi
            })
          });
        }
        fetchData();
        setEditingStudent(null);
        setOriginalMasv(null);
        Swal.fire({ icon: 'success', title: 'Đã cập nhật', text: 'Thông tin sinh viên đã được thay đổi thành công!', timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire('Lỗi', data.error || 'Không thể cập nhật', 'error');
      }
    } catch (error) {
      Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/capnhatlop/${originalMalop}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          malop: editingClass.malop,
          tenlop: editingClass.tenlop,
          khoa: editingClass.khoa
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
        setEditingClass(null);
        setOriginalMalop(null);
        Swal.fire({ icon: 'success', title: 'Đã cập nhật', text: 'Thông tin lớp học đã được thay đổi thành công!', timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire('Lỗi', data.error || 'Không thể cập nhật lớp', 'error');
      }
    } catch (error) {
      Swal.fire('Thông báo', 'Tính năng cập nhật lớp hiện chưa được backend hỗ trợ.', 'info');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { user, pass } = authForm;

    if (isRegisterMode) {
      if (/^\d/.test(user)) { setAuthError("Tên đăng nhập không được bắt đầu bằng số!"); return; }
      if (/\s/.test(user)) { setAuthError("Tên đăng nhập không được chứa khoảng trắng!"); return; }
      if (pass.length < 8) { setAuthError("Mật khẩu phải có nhất 8 ký tự!"); return; }
      
      try {
        const response = await fetch(`${API_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass, role: 'user' })
        });
        const data = await response.json();
        if (data.success) {
          const loginRes = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
          });
          const loginData = await loginRes.json();
          if (loginData.success) {
            const userData = { user: loginData.data.username, isAdmin: loginData.data.role === 'admin' };
            setCurrentUser(userData);
            setIsLoggedIn(true);
            setShowAuthModal(false);
            // Lưu thông tin đăng nhập vào localStorage
            localStorage.setItem('currentUser', JSON.stringify(userData));
            Swal.fire({ icon: 'success', title: 'Chào mừng!', text: `Đăng ký thành công tài khoản ${user}`, timer: 2000, showConfirmButton: false });
          }
        } else {
          setAuthError(data.error || "Đăng ký thất bại");
        }
      } catch (error) {
        setAuthError("Lỗi kết nối server");
      }
    } else {
      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass })
        });
        const data = await response.json();
        if (data.success) {
          const userData = { user: data.data.username, isAdmin: data.data.role === 'admin' };
          setCurrentUser(userData);
          setIsLoggedIn(true);
          setShowAuthModal(false);
          // Lưu thông tin đăng nhập vào localStorage
          localStorage.setItem('currentUser', JSON.stringify(userData));
          Swal.fire({
            icon: 'success',
            title: 'Đăng nhập thành công',
            text: `Chào mừng ${data.data.role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}: ${data.data.username}`,
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          setAuthError(data.error || "Sai thông tin hoặc mật khẩu không đúng!");
        }
      } catch (error) {
        setAuthError("Lỗi kết nối server");
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

  const handleImportStudentsExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      if (data.length === 0) return;

      let successCount = 0;
      let failCount = 0;

      for (const item of data) {
        try {
          const response = await fetch(`${API_URL}/api/themsinhvien`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              masv: String(item['MSSV'] || item.masv || ''),
              hoten: item['Họ và tên'] || item['Họ Tên'] || item.hoten || '',
              ngaysinh: item['Ngày tháng năm sinh'] || item['Ngày sinh'] || item.ngaysinh || '',
              gioitinh: item['Giới tính'] || item.gioitinh || 'Nam',
              malop: item['Lớp'] || item['Lớp Học Phần'] || item.malop
            })
          });
          if (response.ok) successCount++;
          else failCount++;
        } catch (error) {
          failCount++;
        }
      }
      fetchData();
      Swal.fire('Hoàn tất', `Đã nhập thành công ${successCount} sinh viên. Thất bại: ${failCount}`, 'info');
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const handleImportGradesExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      let updateCount = 0;
      for (const row of data) {
        const masv = String(row['MSSV'] || row.masv || '').trim();
        if (masv) {
          try {
            const q = row['Điểm quá trình'] !== undefined ? row['Điểm quá trình'] : row.diemqt;
            const t = row['Điểm kết thúc'] || row['Điểm thi'] || row.diemthi;
            await fetch(`${API_URL}/api/nhapdiem`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                masv: masv,
                mamon: 'CSDL', // Mặc định môn Cơ sở dữ liệu
                hocky: 1,
                namhoc: '2024-2025',
                diemqt: q,
                diemthi: t
              })
            });
            updateCount++;
          } catch (error) {}
        }
      }
      
      fetchData();
      Swal.fire({ icon: 'success', title: 'Hoàn tất', text: `Đã cập nhật điểm cho ${updateCount} sinh viên!`, timer: 2000 });
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
                  <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={() => {
                    // Xóa thông tin đăng nhập khỏi localStorage
                    localStorage.removeItem('currentUser');
                    setIsLoggedIn(false); 
                    setCurrentUser(null); 
                    setActiveTab('home');
                  }}>
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
              
              <button onClick={() => setActiveTab('add_class')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'add_class' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-folder-plus me-3"></i>Thêm lớp học
              </button>
              <button onClick={() => setActiveTab('add_student')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'add_student' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-user-plus me-3"></i>Thêm sinh viên
              </button>
              <button onClick={() => setActiveTab('grades')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'grades' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                <i className="fa-solid fa-file-signature me-3"></i>Quản lý điểm
              </button>
              {currentUser?.isAdmin && (
                <button onClick={() => setActiveTab('user_management')} className={`nav-link border-0 text-start rounded-3 p-3 transition-all ${activeTab === 'user_management' ? 'bg-primary text-white shadow' : 'text-muted'}`}>
                  <i className="fa-solid fa-users-gear me-3"></i>Quản lý người dùng
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-grow-1" style={{ marginLeft: isLoggedIn ? '280px' : '0' }}>
          {!isLoggedIn ? <LandingView /> : (
            <div className="p-4">
              {activeTab === 'home' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold m-0 text-dark">{selectedClass ? `Lớp: ${selectedClass}` : 'Tất cả lớp học'}</h4>
                    <div className="input-group" style={{ width: '300px' }}>
                      <span className="input-group-text bg-white border-end-0 rounded-start-pill ps-3"><i className="fa-solid fa-magnifying-glass text-muted"></i></span>
                      <input type="text" className="form-control border-start-0 rounded-end-pill py-2" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                  </div>

                  {selectedClass ? (
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                      <div className="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-center">
                        <button className="btn btn-light btn-sm rounded-pill px-3" onClick={() => setSelectedClass(null)}><i className="fa-solid fa-arrow-left me-2"></i>Quay lại</button>
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">Sĩ số: {students.filter(s => s.malop === selectedClass).length}</span>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="bg-light">
                            <tr>
                              <th className="ps-4 py-3 border-0 small fw-bold text-muted">MSSV</th>
                              <th className="py-3 border-0 small fw-bold text-muted">HỌ TÊN</th>
                              <th className="py-3 border-0 small fw-bold text-muted">NGÀY SINH</th>
                              <th className="py-3 border-0 small fw-bold text-muted text-center">GIỚI TÍNH</th>
                              <th className="py-3 border-0 small fw-bold text-muted text-center">ĐIỂM TỔNG</th>
                              <th className="pe-4 py-3 border-0 small fw-bold text-muted text-end">THAO TÁC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortStudents(students.filter(s => s.malop === selectedClass)).map(s => (
                              <tr key={s.masv}>
                                <td className="ps-4 fw-bold text-primary">{s.masv}</td>
                                <td>{s.hoten}</td>
                                <td>{s.ngaysinh}</td>
                                <td className="text-center"><span className={`badge rounded-pill ${s.gioitinh === 'Nam' ? 'bg-info-subtle text-info' : 'bg-danger-subtle text-danger'}`}>{s.gioitinh}</span></td>
                                <td className="text-center">
                                  {s.diemtong ? (
                                    <span className={`fw-bold ${
                                      parseFloat(s.diemtong) >= 8.5 ? 'text-success' :
                                      parseFloat(s.diemtong) >= 6.5 ? 'text-primary' :
                                      parseFloat(s.diemtong) >= 5.0 ? 'text-warning' : 'text-danger'
                                    }`}>
                                      {parseFloat(s.diemtong).toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-muted small">Chưa có</span>
                                  )}
                                </td>
                                <td className="pe-4 text-end">
                                  <button className="btn btn-light btn-sm rounded-circle me-2" onClick={() => {setEditingStudent({...s}); setOriginalMasv(s.masv);}}><i className="fa-solid fa-pen-to-square text-primary"></i></button>
                                  <button className="btn btn-light btn-sm rounded-circle" onClick={() => handleDeleteStudent(s.masv, s.hoten)}><i className="fa-solid fa-trash text-danger"></i></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="row g-4">
                      {displayedClasses.map(cls => (
                        <div key={cls.malop} className="col-md-6 col-xl-4">
                          <div className="card border-0 shadow-sm rounded-4 p-4 hover-card transition-all cursor-pointer" onClick={() => setSelectedClass(cls.malop)}>
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="bg-primary-subtle p-3 rounded-4"><i className="fa-solid fa-users-rectangle text-primary fs-4"></i></div>
                              <div className="d-flex gap-1">
                                <button className="btn btn-light btn-sm rounded-circle" onClick={(e) => { e.stopPropagation(); setEditingClass({...cls}); setOriginalMalop(cls.malop); }}><i className="fa-solid fa-pen-to-square text-primary"></i></button>
                                <button className="btn btn-light btn-sm rounded-circle" onClick={(e) => handleDeleteClass(e, cls.malop)}><i className="fa-solid fa-xmark text-muted"></i></button>
                              </div>
                            </div>
                            <h5 className="fw-bold text-dark mb-1">{cls.malop}</h5>
                            <h6 className="text-primary fw-bold mb-1">{cls.tenlop}</h6>
                            <p className="text-muted small mb-3">Khoa: {cls.khoa}</p>
                            <div className="d-flex align-items-center gap-2">
                              <div className="avatar-group d-flex">
                                {[1].map(i => <div key={i} className="rounded-circle border border-2 border-white bg-light d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px', marginLeft: i > 1 ? '-10px' : '0' }}><i className="fa-solid fa-user text-muted" style={{ fontSize: '10px' }}></i></div>)}
                              </div>
                              <span className="small text-muted fw-bold">+{students.filter(s => s.malop === cls.malop).length} sinh viên</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="col-md-6 col-xl-4">
                        <div className="card border-2 border-dashed border-primary-subtle rounded-4 p-4 h-100 d-flex flex-column align-items-center justify-content-center text-center cursor-pointer hover-card transition-all" onClick={() => setActiveTab('add_class')}>
                          <div className="bg-primary-subtle p-3 rounded-circle mb-3"><i className="fa-solid fa-plus text-primary"></i></div>
                          <h6 className="fw-bold text-primary mb-0">Thêm lớp mới</h6>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'add_class' && (
                <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '600px' }}>
                  <div className="text-center mb-4">
                    <div className="bg-primary-subtle d-inline-block p-4 rounded-circle mb-3"><i className="fa-solid fa-folder-plus text-primary fs-2"></i></div>
                    <h4 className="fw-bold text-dark">Thêm lớp học</h4>
                    <p className="text-muted">Tạo lớp để quản lý danh sách sinh viên (VD: CNTT01, KTPM01)</p>
                    {/* <div className="alert alert-info border-0 rounded-3 small text-start mb-3">
                      <i className="fa-solid fa-lightbulb me-2"></i>
                      <strong>Lưu ý:</strong> Lớp hành chính khác với môn học. Sinh viên sẽ thuộc về 1 lớp hành chính nhưng có thể học nhiều môn khác nhau.
                    </div> */}
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newClassName.malop || !newClassName.tenlop || !newClassName.khoa) {
                      Swal.fire('Lỗi', 'Vui lòng điền đầy đủ thông tin!', 'error');
                      return;
                    }
                    try {
                      const response = await fetch(`${API_URL}/api/themlop`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newClassName)
                      });
                      const data = await response.json();
                      if (data.success) {
                        await fetchData();
                        Swal.fire('Thành công', 'Đã tạo lớp học phần mới!', 'success');
                        setNewClassName({ malop: '', tenlop: '', khoa: '' });
                        setActiveTab('home');
                      } else {
                        Swal.fire('Lỗi', data.error || 'Không thể tạo lớp', 'error');
                      }
                    } catch (error) {
                      Swal.fire('Thông báo', 'Tính năng thêm lớp hiện chưa được backend hỗ trợ.', 'info');
                    }
                  }}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="small fw-bold mb-2">Mã lớp hành chính *</label>
                        <input 
                          type="text" 
                          className="form-control form-control-lg bg-light border-0" 
                          placeholder="VD: CNTT01, KTPM01, QTKD01..." 
                          value={newClassName.malop || ''} 
                          onChange={e => setNewClassName({...newClassName, malop: e.target.value})} 
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="small fw-bold mb-2">Tên lớp hành chính *</label>
                        <input 
                          type="text" 
                          className="form-control form-control-lg bg-light border-0" 
                          placeholder="VD: Công nghệ thông tin 01, Kỹ thuật phần mềm 01..." 
                          value={newClassName.tenlop || ''} 
                          onChange={e => setNewClassName({...newClassName, tenlop: e.target.value})} 
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="small fw-bold mb-2">Khoa quản lý *</label>
                        <input 
                          type="text" 
                          className="form-control form-control-lg bg-light border-0" 
                          placeholder="VD: Công nghệ thông tin, Kỹ thuật phần mềm..." 
                          value={newClassName.khoa || ''} 
                          onChange={e => setNewClassName({...newClassName, khoa: e.target.value})} 
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-100 fw-bold py-3 shadow mt-4">Thêm lớp học</button>
                  </form>
                </div>
              )}

              {activeTab === 'add_student' && (
                <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '800px' }}>
                  <h4 className="fw-bold mb-4 text-center text-primary">Thêm Sinh viên vào Lớp</h4>
                  {/* <div className="alert alert-info border-0 rounded-3 small mb-4">
                    <i className="fa-solid fa-info-circle me-2"></i>
                    <strong>Hướng dẫn:</strong> Sinh viên sẽ được thêm vào lớp hành chính. Việc đăng ký môn học và nhập điểm sẽ thực hiện sau.
                  </div> */}
                  <div className="p-4 mb-4 border border-dashed rounded-4 bg-light text-center border-primary">
                    <label className="fw-bold text-primary d-block mb-2">Import từ Excel</label>
                    <input type="file" className="form-control" accept=".xlsx, .xls" onChange={handleImportStudentsExcel} />
                  </div>
                  <form onSubmit={async (e) => { 
                    e.preventDefault(); 
                    if (!formData.masv || !formData.hoten || !formData.ngaysinh || !formData.malop) {
                        Swal.fire('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error');
                        return;
                    }
                    try {
                      const response = await fetch(`${API_URL}/api/themsinhvien`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                      });
                      const data = await response.json();
                      if (data.success) {
                        fetchData();
                        Swal.fire('Thành công', 'Đã thêm sinh viên vào danh sách!', 'success');
                        setFormData({ masv: '', hoten: '', ngaysinh: '', gioitinh: 'Nam', malop: '' });
                      } else {
                        Swal.fire('Lỗi', data.error || 'Không thể thêm sinh viên', 'error');
                      }
                    } catch (error) {
                      Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
                    }
                  }}>
                    <div className="row g-3">
                      <div className="col-md-6"><label className="small fw-bold">Họ tên *</label><input type="text" className="form-control" required value={formData.hoten} onChange={e => setFormData({...formData, hoten: e.target.value})} /></div>
                      <div className="col-md-6"><label className="small fw-bold">MSSV *</label><input type="text" className="form-control" required value={formData.masv} onChange={e => setFormData({...formData, masv: e.target.value})} /></div>
                      <div className="col-md-6"><label className="small fw-bold">Ngày sinh *</label><input type="date" className="form-control" required value={formData.ngaysinh} onChange={e => setFormData({...formData, ngaysinh: e.target.value})} /></div>
                      <div className="col-md-6"><label className="small fw-bold">Giới tính *</label><select className="form-select" required value={formData.gioitinh} onChange={e => setFormData({...formData, gioitinh: e.target.value})}><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
                      <div className="col-12">
                        <label className="small fw-bold">Phân vào lớp  *</label>
                        <select className="form-select" value={formData.malop} required onChange={e => setFormData({...formData, malop: e.target.value})}>
                          <option value="">-- Chọn lớp  --</option>
                          {classes.map(c => (
                            <option key={c.malop} value={c.malop}>{c.malop} - {c.tenlop}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 mt-4"><button className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow">Lưu vào danh sách</button></div>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'grades' && (
                <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '800px' }}>
                  <h4 className="fw-bold mb-4 text-center text-primary">Quản lý Điểm Môn Học</h4>
                  {/* <div className="alert alert-warning border-0 rounded-3 small mb-4">
                    <i className="fa-solid fa-exclamation-triangle me-2"></i>
                    <strong>Lưu ý:</strong> Chức năng này để nhập điểm cho từng môn học cụ thể. Trước tiên cần chọn lớp hành chính, sau đó chọn môn học và sinh viên.
                  </div> */}
                  <div className="p-4 mb-4 border border-dashed rounded-4 bg-light text-center border-primary">
                    <label className="fw-bold text-primary d-block mb-2">Import điểm từ Excel</label>
                    <input type="file" className="form-control" accept=".xlsx, .xls" onChange={handleImportGradesExcel} disabled={classes.length === 0} />
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!gradeData.masv) {
                      Swal.fire('Lỗi', 'Vui lòng chọn một sinh viên cụ thể!', 'error');
                      return;
                    }
                    try {
                      const response = await fetch(`${API_URL}/api/nhapdiem`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          masv: gradeData.masv,
                          mamon: gradeData.mamon,
                          hocky: gradeData.hocky,
                          namhoc: gradeData.namhoc,
                          diemqt: gradeData.diemqt,
                          diemthi: gradeData.diemthi
                        })
                      });
                      const data = await response.json();
                      if (data.success) {
                        fetchData();
                        Swal.fire('Thành công', 'Đã lưu điểm sinh viên!', 'success');
                        setGradeData({ masv: '', mamon: 'CSDL', hocky: 1, namhoc: '2024-2025', diemqt: '', diemthi: '' });
                      } else {
                        Swal.fire('Lỗi', data.error || 'Không thể lưu điểm', 'error');
                      }
                    } catch (error) {
                      Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
                    }
                  }}>
                    <div className="mb-3">
                      <label className="small fw-bold">Chọn lớp </label>
                      <select className="form-select" required value={gradeClassFilter} onChange={e => {setGradeClassFilter(e.target.value); setGradeData({...gradeData, masv: ''});}}>
                        <option value="">-- Chọn lớp  --</option>
                        {classes.map(c => (
                          <option key={c.malop} value={c.malop}>{c.malop} - {c.tenlop}</option>
                        ))}
                      </select>
                    </div>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="small fw-bold">Môn học</label>
                        <select className="form-select" value={gradeData.mamon} onChange={e => setGradeData({...gradeData, mamon: e.target.value})}>
                          <option value="CSDL">Cơ sở dữ liệu</option>
                          <option value="LTW">Lập trình web</option>
                          <option value="CTDL">Cấu trúc dữ liệu</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="small fw-bold">Học kỳ</label>
                        <select className="form-select" value={gradeData.hocky} onChange={e => setGradeData({...gradeData, hocky: parseInt(e.target.value)})}>
                          <option value={1}>Học kỳ 1</option>
                          <option value={2}>Học kỳ 2</option>
                          <option value={3}>Học kỳ hè</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="small fw-bold">Năm học</label>
                      <select className="form-select" value={gradeData.namhoc} onChange={e => setGradeData({...gradeData, namhoc: e.target.value})}>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2023-2024">2023-2024</option>
                        <option value="2022-2023">2022-2023</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="small fw-bold">Chọn sinh viên</label>
                      <select className="form-select" required disabled={!gradeClassFilter || students.filter(s => s.malop === gradeClassFilter).length === 0} value={gradeData.masv} onChange={e => setGradeData({...gradeData, masv: e.target.value})}>
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
                      <div className="col-6"><label className="small fw-bold">Điểm quá trình</label><input type="number" step="0.1" className="form-control" required value={gradeData.diemqt} onChange={e => setGradeData({...gradeData, diemqt: e.target.value})} /></div>
                      <div className="col-6"><label className="small fw-bold">Điểm thi kết thúc</label><input type="number" step="0.1" className="form-control" required value={gradeData.diemthi} onChange={e => setGradeData({...gradeData, diemthi: e.target.value})} /></div>
                    </div>
                    <button className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow mt-4">Cập nhật điểm</button>
                  </form>
                </div>
              )}
{activeTab === 'user_management' && currentUser?.isAdmin && (
  <div className="animate__animated animate__fadeIn">
    {/* Tiêu đề trang */}
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4 className="fw-bold m-0 text-dark">Hệ thống Tài khoản</h4>
      <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 fw-bold">
        Tổng số: {allUsers.length} tài khoản
      </span>
    </div>

    {/* Bảng dữ liệu */}
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="bg-light">
            <tr>
              <th className="ps-4 py-3 border-0 small fw-bold text-muted">TÊN TÀI KHOẢN</th>
              <th className="py-3 border-0 small fw-bold text-muted text-center">VAI TRÒ</th>
              <th className="py-3 border-0 small fw-bold text-muted text-center">NGÀY TẠO</th>
              <th className="pe-4 py-3 border-0 small fw-bold text-muted text-end">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.length > 0 ? (
              allUsers.map((u) => (
                <tr key={u.userid}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary-subtle rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                        <i className="fa-solid fa-user text-primary small"></i>
                      </div>
                      <span className="fw-bold text-dark">{u.username}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`badge rounded-pill px-3 ${u.role === 'admin' ? 'bg-danger-subtle text-danger' : 'bg-info-subtle text-info'}`}>
                      {u.role === 'admin' ? 'Administrator' : 'Giảng viên'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="small text-muted fw-medium">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '---'}
                    </span>
                  </td>
                  <td className="pe-4 text-end">
                    <button 
                      className="btn btn-light btn-sm text-danger rounded-circle p-2 border-0"
                      disabled={u.username === currentUser.user}
                      title="Xóa người dùng"
                      onClick={() => {
                        Swal.fire({
                          title: 'Xác nhận xóa?',
                          text: `Bạn có chắc muốn xóa tài khoản ${u.username}?`,
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#4f46e5',
                          confirmButtonText: 'Xóa ngay',
                          cancelButtonText: 'Hủy'
                        }).then(async (result) => {
                          if (result.isConfirmed) {
                            try {
                              const response = await fetch(`${API_URL}/api/users/${u.userid}`, { method: 'DELETE' });
                              const resData = await response.json();
                              if (resData.success) {
                                Swal.fire('Thành công', 'Đã xóa người dùng!', 'success');
                                fetchUsers(); // Tải lại danh sách
                              }
                            } catch (err) {
                              Swal.fire('Lỗi', 'Không thể kết nối Server', 'error');
                            }
                          }
                        });
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-5 text-muted">
                  Không có dữ liệu người dùng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editingStudent && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="card shadow-lg border-0 p-4" style={{ width: '500px', borderRadius: '20px' }}>
            <h5 className="fw-bold mb-4">Chỉnh sửa thông tin sinh viên</h5>
            <form onSubmit={handleQuickEditGrade}>
              <div className="row g-3">
                <div className="col-12"><label className="small fw-bold">Họ tên *</label><input type="text" className="form-control py-2" required value={editingStudent.hoten} onChange={e => setEditingStudent({...editingStudent, hoten: e.target.value})} /></div>
                <div className="col-6"><label className="small fw-bold">MSSV *</label><input type="text" className="form-control py-2" required disabled value={editingStudent.masv} /></div>
                <div className="col-6"><label className="small fw-bold">Lớp *</label>
                  <select className="form-select py-2" required value={editingStudent.malop} onChange={e => setEditingStudent({...editingStudent, malop: e.target.value})}>
                    {classes.map(c => <option key={c.malop} value={c.malop}>{c.malop}</option>)}
                  </select>
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

      {editingClass && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1051 }}>
          <div className="card shadow-lg border-0 p-4" style={{ width: '500px', borderRadius: '20px' }}>
            <h5 className="fw-bold mb-4">Chỉnh sửa thông tin lớp học</h5>
            <form onSubmit={handleEditClass}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="small fw-bold">Mã lớp *</label>
                  <input 
                    type="text" 
                    className="form-control py-2" 
                    required 
                    value={editingClass.malop} 
                    onChange={e => setEditingClass({...editingClass, malop: e.target.value})} 
                  />
                </div>
                <div className="col-12">
                  <label className="small fw-bold">Tên lớp *</label>
                  <input 
                    type="text" 
                    className="form-control py-2" 
                    required 
                    value={editingClass.tenlop} 
                    onChange={e => setEditingClass({...editingClass, tenlop: e.target.value})} 
                  />
                </div>
                <div className="col-12">
                  <label className="small fw-bold">Khoa *</label>
                  <input 
                    type="text" 
                    className="form-control py-2" 
                    required 
                    value={editingClass.khoa} 
                    onChange={e => setEditingClass({...editingClass, khoa: e.target.value})} 
                  />
                </div>
              </div>
              <div className="mt-4 d-flex gap-2 pt-3">
                <button type="button" className="btn btn-light w-100 fw-bold py-2" onClick={() => {setEditingClass(null); setOriginalMalop(null);}}>Hủy</button>
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
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
}

export default App;