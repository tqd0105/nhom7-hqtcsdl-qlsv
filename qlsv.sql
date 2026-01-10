-- ============================================
-- TABLES
-- ============================================

CREATE TABLE lop (
    malop VARCHAR(10) PRIMARY KEY,
    tenlop VARCHAR(50) NOT NULL,
    khoa VARCHAR(50) NOT NULL
);

CREATE TABLE sinhvien (
    masv VARCHAR(10) PRIMARY KEY,
    hoten VARCHAR(100) NOT NULL,
    ngaysinh DATE NOT NULL,
    gioitinh VARCHAR(10) CHECK (gioitinh IN ('Nam', 'Nữ', 'Khác')),
    malop VARCHAR(10),
    FOREIGN KEY (malop) REFERENCES lop(malop) ON DELETE SET NULL
);

CREATE TABLE monhoc (
    mamon VARCHAR(10) PRIMARY KEY,
    tenmon VARCHAR(100) NOT NULL,
    sotinchi INT CHECK (sotinchi > 0)
);

CREATE TABLE dangki (
    masv VARCHAR(10),
    mamon VARCHAR(10),
    hocky INT CHECK (hocky BETWEEN 1 AND 3),
    namhoc VARCHAR(9),
    PRIMARY KEY (masv, mamon, hocky, namhoc),
    FOREIGN KEY (masv) REFERENCES sinhvien(masv) ON DELETE CASCADE,
    FOREIGN KEY (mamon) REFERENCES monhoc(mamon) ON DELETE CASCADE
);

CREATE TABLE diem (
    masv VARCHAR(10),
    mamon VARCHAR(10),
    hocky INT,
    namhoc VARCHAR(9),
    diemqt FLOAT CHECK (diemqt BETWEEN 0 AND 10),
    diemthi FLOAT CHECK (diemthi BETWEEN 0 AND 10),
    diemtong FLOAT GENERATED ALWAYS AS (diemqt * 0.4 + diemthi * 0.6) STORED,
    PRIMARY KEY (masv, mamon, hocky, namhoc),
    FOREIGN KEY (masv, mamon, hocky, namhoc) 
        REFERENCES dangki(masv, mamon, hocky, namhoc) ON DELETE CASCADE
);

CREATE TABLE users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'teacher')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION check_diem(d FLOAT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN d >= 0 AND d <= 10;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION check_tuoi(ns DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN DATE_PART('year', AGE(ns)) >= 16;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION tinh_diem_trung_binh(p_masv VARCHAR)
RETURNS FLOAT AS $$
DECLARE
    dtb FLOAT;
BEGIN
    SELECT AVG(diemtong) INTO dtb
    FROM diem
    WHERE masv = p_masv;
    
    RETURN COALESCE(dtb, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROCEDURES
-- ============================================

CREATE OR REPLACE PROCEDURE them_sinhvien(
    p_masv VARCHAR,
    p_hoten VARCHAR,
    p_ngaysinh DATE,
    p_gioitinh VARCHAR,
    p_malop VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Kiểm tra tuổi
    IF NOT check_tuoi(p_ngaysinh) THEN
        RAISE EXCEPTION 'Sinh viên phải đủ 16 tuổi trở lên';
    END IF;
    
    -- Kiểm tra lớp tồn tại
    IF NOT EXISTS (SELECT 1 FROM lop WHERE malop = p_malop) THEN
        RAISE EXCEPTION 'Mã lớp % không tồn tại', p_malop;
    END IF;

    -- Thêm sinh viên
    INSERT INTO sinhvien (masv, hoten, ngaysinh, gioitinh, malop)
    VALUES (p_masv, p_hoten, p_ngaysinh, p_gioitinh, p_malop);
    
    RAISE NOTICE 'Thêm sinh viên % thành công', p_masv;
END;
$$;

CREATE OR REPLACE PROCEDURE capnhat_sinhvien(
    p_masv VARCHAR,
    p_hoten VARCHAR DEFAULT NULL,
    p_ngaysinh DATE DEFAULT NULL,
    p_gioitinh VARCHAR DEFAULT NULL,
    p_malop VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Kiểm tra sinh viên tồn tại
    IF NOT EXISTS (SELECT 1 FROM sinhvien WHERE masv = p_masv) THEN
        RAISE EXCEPTION 'Sinh viên % không tồn tại', p_masv;
    END IF;
    
    -- Kiểm tra tuổi nếu cập nhật ngày sinh
    IF p_ngaysinh IS NOT NULL AND NOT check_tuoi(p_ngaysinh) THEN
        RAISE EXCEPTION 'Sinh viên phải đủ 16 tuổi trở lên';
    END IF;
    
    -- Kiểm tra lớp tồn tại nếu cập nhật lớp
    IF p_malop IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lop WHERE malop = p_malop) THEN
        RAISE EXCEPTION 'Mã lớp % không tồn tại', p_malop;
    END IF;

    -- Cập nhật các trường không NULL
    UPDATE sinhvien
    SET hoten = COALESCE(p_hoten, hoten),
        ngaysinh = COALESCE(p_ngaysinh, ngaysinh),
        gioitinh = COALESCE(p_gioitinh, gioitinh),
        malop = COALESCE(p_malop, malop)
    WHERE masv = p_masv;
    
    RAISE NOTICE 'Cập nhật sinh viên % thành công', p_masv;
END;
$$;

CREATE OR REPLACE PROCEDURE xoa_sinhvien(p_masv VARCHAR)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Kiểm tra sinh viên tồn tại
    IF NOT EXISTS (SELECT 1 FROM sinhvien WHERE masv = p_masv) THEN
        RAISE EXCEPTION 'Sinh viên % không tồn tại', p_masv;
    END IF;
    
    -- Xóa sinh viên (CASCADE sẽ tự động xóa đăng ký và điểm)
    DELETE FROM sinhvien WHERE masv = p_masv;
    
    RAISE NOTICE 'Xóa sinh viên % thành công', p_masv;
END;
$$;

CREATE OR REPLACE PROCEDURE nhap_diem(
    p_masv VARCHAR,
    p_mamon VARCHAR,
    p_hocky INT,
    p_namhoc VARCHAR,
    p_diemqt FLOAT,
    p_diemthi FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Kiểm tra điểm hợp lệ
    IF NOT check_diem(p_diemqt) OR NOT check_diem(p_diemthi) THEN
        RAISE EXCEPTION 'Điểm phải từ 0 đến 10';
    END IF;
    
    -- Kiểm tra đăng ký tồn tại
    IF NOT EXISTS (
        SELECT 1 FROM dangki 
        WHERE masv = p_masv 
        AND mamon = p_mamon 
        AND hocky = p_hocky 
        AND namhoc = p_namhoc
    ) THEN
        RAISE EXCEPTION 'Sinh viên % chưa đăng ký môn % học kỳ % năm %', 
            p_masv, p_mamon, p_hocky, p_namhoc;
    END IF;

    -- Thêm hoặc cập nhật điểm
    INSERT INTO diem (masv, mamon, hocky, namhoc, diemqt, diemthi)
    VALUES (p_masv, p_mamon, p_hocky, p_namhoc, p_diemqt, p_diemthi)
    ON CONFLICT (masv, mamon, hocky, namhoc) 
    DO UPDATE SET 
        diemqt = EXCLUDED.diemqt,
        diemthi = EXCLUDED.diemthi;
    
    RAISE NOTICE 'Nhập điểm cho sinh viên % môn % thành công', p_masv, p_mamon;
END;
$$;

CREATE OR REPLACE PROCEDURE dang_ki_mon(
    p_masv VARCHAR,
    p_mamon VARCHAR,
    p_hocky INT,
    p_namhoc VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Kiểm tra sinh viên và môn học tồn tại
    IF NOT EXISTS (SELECT 1 FROM sinhvien WHERE masv = p_masv) THEN
        RAISE EXCEPTION 'Sinh viên % không tồn tại', p_masv;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM monhoc WHERE mamon = p_mamon) THEN
        RAISE EXCEPTION 'Môn học % không tồn tại', p_mamon;
    END IF;
    
    -- Đăng ký môn học
    INSERT INTO dangki (masv, mamon, hocky, namhoc)
    VALUES (p_masv, p_mamon, p_hocky, p_namhoc)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Đăng ký môn % cho sinh viên % thành công', p_mamon, p_masv;
END;
$$;

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW v_tuoi_sinhvien AS
SELECT 
    sv.masv,
    sv.hoten,
    sv.ngaysinh,
    DATE_PART('year', AGE(sv.ngaysinh)) AS tuoi,
    sv.gioitinh,
    l.tenlop,
    l.khoa
FROM sinhvien sv
LEFT JOIN lop l ON sv.malop = l.malop;

CREATE OR REPLACE VIEW v_xeploai AS
SELECT
    d.masv,
    sv.hoten,
    d.mamon,
    mh.tenmon,
    d.diemqt,
    d.diemthi,
    d.diemtong,
    CASE
        WHEN d.diemtong >= 8.5 THEN 'Xuất sắc'
        WHEN d.diemtong >= 8.0 THEN 'Giỏi'
        WHEN d.diemtong >= 6.5 THEN 'Khá'
        WHEN d.diemtong >= 5.0 THEN 'Trung bình'
        WHEN d.diemtong >= 4.0 THEN 'Yếu'
        ELSE 'Kém'
    END AS xeploai
FROM diem d
JOIN sinhvien sv ON d.masv = sv.masv
JOIN monhoc mh ON d.mamon = mh.mamon;

CREATE OR REPLACE VIEW v_sv_lop AS
SELECT
    sv.masv,
    sv.hoten,
    sv.ngaysinh,
    sv.gioitinh,
    DATE_PART('year', AGE(sv.ngaysinh)) AS tuoi,
    l.malop,
    l.tenlop,
    l.khoa
FROM sinhvien sv
LEFT JOIN lop l ON sv.malop = l.malop
ORDER BY l.malop, sv.masv;

CREATE OR REPLACE VIEW v_sv_diem AS
SELECT
    sv.masv,
    sv.hoten,
    l.tenlop,
    mh.mamon,
    mh.tenmon,
    mh.sotinchi,
    d.hocky,
    d.namhoc,
    d.diemqt,
    d.diemthi,
    d.diemtong,
    CASE
        WHEN d.diemtong >= 8.5 THEN 'Xuất sắc'
        WHEN d.diemtong >= 8.0 THEN 'Giỏi'
        WHEN d.diemtong >= 6.5 THEN 'Khá'
        WHEN d.diemtong >= 5.0 THEN 'Trung bình'
        WHEN d.diemtong >= 4.0 THEN 'Yếu'
        ELSE 'Kém'
    END AS xeploai
FROM sinhvien sv
JOIN diem d ON sv.masv = d.masv
JOIN monhoc mh ON d.mamon = mh.mamon
LEFT JOIN lop l ON sv.malop = l.malop
ORDER BY sv.masv, d.hocky, d.namhoc;

CREATE OR REPLACE VIEW v_diem_trung_binh AS
SELECT
    sv.masv,
    sv.hoten,
    l.tenlop,
    COUNT(d.mamon) AS so_mon_hoc,
    ROUND(AVG(d.diemtong)::numeric, 2) AS diem_trung_binh,
    CASE
        WHEN AVG(d.diemtong) >= 8.5 THEN 'Xuất sắc'
        WHEN AVG(d.diemtong) >= 8.0 THEN 'Giỏi'
        WHEN AVG(d.diemtong) >= 6.5 THEN 'Khá'
        WHEN AVG(d.diemtong) >= 5.0 THEN 'Trung bình'
        WHEN AVG(d.diemtong) >= 4.0 THEN 'Yếu'
        ELSE 'Kém'
    END AS xeploai_chung
FROM sinhvien sv
LEFT JOIN diem d ON sv.masv = d.masv
LEFT JOIN lop l ON sv.malop = l.malop
GROUP BY sv.masv, sv.hoten, l.tenlop
ORDER BY diem_trung_binh DESC NULLS LAST;

CREATE OR REPLACE VIEW v_thong_ke_lop AS
SELECT
    l.malop,
    l.tenlop,
    l.khoa,
    COUNT(DISTINCT sv.masv) AS so_sinh_vien,
    COUNT(DISTINCT d.mamon) AS so_mon_da_hoc,
    ROUND(AVG(d.diemtong)::numeric, 2) AS diem_trung_binh_lop
FROM lop l
LEFT JOIN sinhvien sv ON l.malop = sv.malop
LEFT JOIN diem d ON sv.masv = d.masv
GROUP BY l.malop, l.tenlop, l.khoa
ORDER BY l.malop;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION trg_log_sinhvien()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Sinh viên % (%) được thêm vào lớp % lúc %', 
        NEW.masv, NEW.hoten, NEW.malop, NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_sv
AFTER INSERT ON sinhvien
FOR EACH ROW
EXECUTE FUNCTION trg_log_sinhvien();

CREATE OR REPLACE FUNCTION trg_kiem_tra_tuoi()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_tuoi(NEW.ngaysinh) THEN
        RAISE EXCEPTION 'Sinh viên phải đủ 16 tuổi trở lên';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_tuoi
BEFORE INSERT OR UPDATE ON sinhvien
FOR EACH ROW
EXECUTE FUNCTION trg_kiem_tra_tuoi();

CREATE OR REPLACE FUNCTION trg_kiem_tra_diem()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_diem(NEW.diemqt) OR NOT check_diem(NEW.diemthi) THEN
        RAISE EXCEPTION 'Điểm phải nằm trong khoảng 0 - 10';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_diem
BEFORE INSERT OR UPDATE ON diem
FOR EACH ROW
EXECUTE FUNCTION trg_kiem_tra_diem();

CREATE OR REPLACE FUNCTION trg_log_diem()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Điểm môn % của sinh viên %: QT=%, Thi=%, Tổng=%', 
        NEW.mamon, NEW.masv, NEW.diemqt, NEW.diemthi, NEW.diemtong;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_diem
AFTER INSERT ON diem
FOR EACH ROW
EXECUTE FUNCTION trg_log_diem();

-- ============================================
-- INDEXES (Tối ưu hiệu suất)
-- ============================================

CREATE INDEX idx_sinhvien_malop ON sinhvien(malop);
CREATE INDEX idx_dangki_masv ON dangki(masv);
CREATE INDEX idx_dangki_mamon ON dangki(mamon);
CREATE INDEX idx_diem_masv ON diem(masv);
CREATE INDEX idx_diem_mamon ON diem(mamon);

-- ============================================
-- SAMPLE DATA (Dữ liệu mẫu để test)
-- ============================================

-- Thêm lớp
INSERT INTO lop VALUES 
('CNTT01', 'Công nghệ thông tin 1', 'Công nghệ thông tin'),
('KTPM01', 'Kỹ thuật phần mềm 1', 'Công nghệ thông tin');

-- Thêm môn học
INSERT INTO monhoc VALUES 
('CSDL', 'Cơ sở dữ liệu', 3),
('LTW', 'Lập trình web', 4),
('CTDL', 'Cấu trúc dữ liệu', 3);

-- Thêm sinh viên qua procedure
CALL them_sinhvien('SV001', 'Nguyễn Minh Khôi', '2005-03-15', 'Nam', 'CNTT01');
CALL them_sinhvien('SV002', 'Trần Quang Dũng', '2005-07-20', 'Nam', 'CNTT01');
CALL them_sinhvien('SV003', 'Lê Nhật Anh', '2004-12-10', 'Nam', 'KTPM01');

-- Đăng ký môn học
CALL dang_ki_mon('SV001', 'CSDL', 1, '2024-2025');
CALL dang_ki_mon('SV001', 'LTW', 1, '2024-2025');
CALL dang_ki_mon('SV002', 'CSDL', 1, '2024-2025');

-- Nhập điểm
CALL nhap_diem('SV001', 'CSDL', 1, '2024-2025', 8.5, 9.0);
CALL nhap_diem('SV001', 'LTW', 1, '2024-2025', 7.0, 8.5);
CALL nhap_diem('SV002', 'CSDL', 1, '2024-2025', 9.0, 9.5);