# 🚀 CẨM NANG TRIỂN KHAI DỰ ÁN SIC_FACERECOGNITION LÊN VPS VỚI GITHUB ACTIONS CI/CD

Tài liệu hướng dẫn chi tiết quy trình triển khai tự động ứng dụng điểm danh sinh trắc học **SIC FaceRecognition** lên máy chủ VPS Linux (Ubuntu 22.04/24.04 LTS) bằng **Docker Compose** và **GitHub Actions CI/CD**.

---

## 📌 1. TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

Hệ thống được đóng gói thành 3 microservices qua `docker-compose.yml`:
- 🗄️ **Database Service (`sic_facerecognition_db`)**: PostgreSQL 16 + PGVector Extension.
- 🛠️ **Backend API Service (`sic_facerecognition_backend`)**: FastAPI Python 3.10 + Core AI ArcFace / InsightFace.
- 📱 **Frontend Web UI Service (`sic_facerecognition_frontend`)**: React App + Nginx Reverse Proxy.

---

## 🔑 2. HƯỚNG DẪN TẠO VÀ CẤU HÌNH SSH KEY CHO VPS

Để GitHub Actions kết nối an toàn vào VPS của bạn mà không cần nhập mật khẩu:

### Bước 2.1: Tạo cặp SSH Key trên máy tính cá nhân
Chạy lệnh sau trong Terminal:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key -N ""
```
> Lệnh sẽ tạo 2 file:
> - `~/.ssh/vps_deploy_key` *(Private Key)*
> - `~/.ssh/vps_deploy_key.pub` *(Public Key)*

### Bước 2.2: Đưa Public Key lên máy chủ VPS
```bash
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub root@<IP_VPS_CỦA_BẠN>
```
*(Hoặc dán nội dung file `vps_deploy_key.pub` vào cuối file `~/.ssh/authorized_keys` trên VPS).*

### Bước 2.3: Lấy Private Key
In nội dung khóa bí mật ra màn hình:
```bash
cat ~/.ssh/vps_deploy_key
```
Copy toàn bộ nội dung từ `-----BEGIN OPENSSH PRIVATE KEY-----` tới `-----END OPENSSH PRIVATE KEY-----`.

---

## ⚙️ 3. CẤU HÌNH GITHUB SECRETS

Truy cập repository trên GitHub ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ Bấm **New repository secret**:

| Tên Secret | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| **`VPS_HOST`** | IP máy chủ VPS hoặc Domain | `103.179.x.x` |
| **`VPS_USERNAME`** | Tên tài khoản SSH trên VPS | `root` hoặc `ubuntu` |
| **`VPS_SSH_KEY`** | Toàn bộ nội dung Private Key (từ Bước 2.3) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| **`VPS_PORT`** | Cổng kết nối SSH | `22` |
| **`VPS_TARGET_DIR`** | Đường dẫn lưu mã nguồn trên VPS | `/var/www/SIC_FaceRecognition` |

---

## 🛠️ 4. CHUẨN BỊ LẦN ĐẦU TRÊN VPS

Trên máy chủ VPS, thực hiện cài đặt Docker và clone mã nguồn lần đầu:

### Bước 4.1: Cài đặt Docker & Docker Compose Plugin
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### Bước 4.2: Clone Repository về VPS
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/lvquyen15506/SIC_FaceRecognition.git
cd SIC_FaceRecognition
```

### Bước 4.3: Chạy ứng dụng lần đầu
```bash
docker compose up -d --build
```

---

## 🔒 5. CẤU HÌNH DOMAIN VÀ CHỨNG CHỈ SSL/HTTPS (BẮT BUỘC CHO WEBCAM)

> [!IMPORTANT]
> Trình duyệt Chrome/Safari/Firefox **bắt buộc trang web phải có HTTPS (`https://`)** thì mới cấp quyền bật Webcam lấy mẫu 3D / điểm danh khuôn mặt.

Cài đặt Nginx và Certbot cấp SSL miễn phí Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 6. QUY TRÌNH DEPLOY TỰ ĐỘNG CHẠY KHI GỊT PUSH

Mỗi khi bạn đẩy mã nguồn mới lên nhánh `main`:
```bash
git add .
git commit -m "feat: your new feature"
git push origin main
```
1. **GitHub Actions** tự động chạy Job `Build & Verify Code Syntax`.
2. Sau khi build thành công, Job `Deploy to Remote VPS` sẽ kết nối SSH vào VPS và tự động thực thi:
   ```bash
   git pull origin main
   docker compose up -d --build
   docker image prune -f
   ```
3. Trang web trên VPS được cập nhật bản mới nhất chỉ trong vài giây!
