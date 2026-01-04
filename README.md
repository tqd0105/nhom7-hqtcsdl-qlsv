# Hệ thống Quản lý Sinh viên - Nhóm 7

## Giới thiệu
Đây là dự án Hệ thống Quản lý Sinh viên được phát triển bởi Nhóm 7 cho môn Hệ quản trị Cơ sở dữ liệu.

## Cấu trúc dự án
```
nhom7-hqtcsdl-qlsv/
├── backend/         # Server Node.js/Express
├── frontend/        # Client React/Vite
├── .gitignore      # File ignore Git
└── README.md       # Hướng dẫn sử dụng
```

## Công nghệ sử dụng

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **CORS** - Xử lý Cross-Origin Resource Sharing

### Frontend
- **React** - JavaScript library cho UI
- **Vite** - Build tool và dev server
- **ESLint** - Code linting

## Yêu cầu hệ thống
- Node.js (phiên bản 14 trở lên)
- npm hoặc yarn

## Hướng dẫn cài đặt và chạy dự án

### 1. Clone repository
```bash
git clone https://github.com/tqd0105/nhom7-hqtcsdl-qlsv.git
cd nhom7-hqtcsdl-qlsv
```

### 2. Cài đặt dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Chạy dự án

#### Chạy Backend (Terminal 1)
```bash
cd backend
npm start
```
Server sẽ chạy tại: `http://localhost:3000` (hoặc port được cấu hình)

#### Chạy Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Client sẽ chạy tại: `http://localhost:5173`

## Scripts có sẵn

### Backend
- `npm start` - Chạy server production
- `npm test` - Chạy tests

### Frontend
- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run lint` - Chạy ESLint

## Cấu hình

### Environment Variables
Tạo file `.env` trong thư mục `backend` với các biến môi trường cần thiết:
```
PORT=3000
DATABASE_URL=your_database_url
```

## Đóng góp
1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## Thành viên nhóm 7
- Trần Quang Dũng
- Nguyễn Trường Lâm
- Nguyễn Minh Khôi
- Nguyễn Văn Hân
- Lê Quốc Dũng
- Lê Nhật Anh

## License
Dự án này được phát triển cho mục đích học tập.
