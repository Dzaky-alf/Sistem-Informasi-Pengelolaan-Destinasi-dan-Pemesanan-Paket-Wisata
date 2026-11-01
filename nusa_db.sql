-- =====================================================================
--  DATABASE : nusa_wisata
--  Sistem Informasi Pengelolaan Destinasi & Pemesanan Paket Wisata
--  Kompatibel: Laragon (MySQL 8 / MariaDB 10.4+) | Import via HeidiSQL / phpMyAdmin
-- =====================================================================

DROP DATABASE IF EXISTS nusa_wisata;
CREATE DATABASE nusa_wisata CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nusa_wisata;

-- ---------------------------------------------------------------------
-- 1. USERS  (akun pengguna & admin; password disimpan sebagai hash bcrypt)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(120)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  phone         VARCHAR(20)   NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. CATEGORIES  (Bahari, Budaya, Alam)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. DESTINATIONS
-- ---------------------------------------------------------------------
CREATE TABLE destinations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  region      VARCHAR(100) NOT NULL,
  category_id TINYINT UNSIGNED NOT NULL,
  rating      DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  visits      INT UNSIGNED NOT NULL DEFAULT 0,
  image_url   VARCHAR(500) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_dest_rating CHECK (rating BETWEEN 0 AND 5),
  CONSTRAINT fk_dest_cat FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_dest_cat (category_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PACKAGES  (destinasi tidak bisa dihapus bila masih punya paket)
-- ---------------------------------------------------------------------
CREATE TABLE packages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  destination_id  INT UNSIGNED NOT NULL,
  name            VARCHAR(120) NOT NULL,
  duration        VARCHAR(20)  NOT NULL COMMENT 'contoh: 3H 2M',
  max_guests      SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  price_per_pax   DECIMAL(12,0) NOT NULL,
  tag             VARCHAR(50)  NULL,
  image_url       VARCHAR(500) NULL COMMENT 'kosong = pakai gambar destinasi',
  description     VARCHAR(255) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_pkg_price CHECK (price_per_pax >= 0),
  CONSTRAINT chk_pkg_max   CHECK (max_guests >= 1),
  CONSTRAINT fk_pkg_dest FOREIGN KEY (destination_id) REFERENCES destinations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_pkg_dest (destination_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. BOOKINGS  (jika paket dihapus, riwayat tetap ada: package_id jadi NULL)
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code    VARCHAR(20) NOT NULL UNIQUE COMMENT 'contoh: NSA-250681',
  user_id         INT UNSIGNED NULL,
  package_id      INT UNSIGNED NULL,
  package_name    VARCHAR(120) NULL COMMENT 'snapshot nama paket saat dipesan',
  customer_name   VARCHAR(100) NOT NULL,
  customer_email  VARCHAR(120) NOT NULL,
  departure_date  DATE NOT NULL,
  guests          SMALLINT UNSIGNED NOT NULL,
  total_price     DECIMAL(14,0) NOT NULL,
  status          ENUM('Menunggu pembayaran','Pembayaran berhasil','Selesai','Dibatalkan')
                  NOT NULL DEFAULT 'Menunggu pembayaran',
  notes           VARCHAR(500) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_book_guests CHECK (guests >= 1),
  CONSTRAINT fk_book_user FOREIGN KEY (user_id)    REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_book_pkg  FOREIGN KEY (package_id) REFERENCES packages(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_book_user (user_id),
  INDEX idx_book_pkg (package_id),
  INDEX idx_book_status (status),
  INDEX idx_book_date (departure_date),
  INDEX idx_book_email (customer_email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. PAYMENTS  (pembayaran simulasi)
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id  INT UNSIGNED NOT NULL,
  method      ENUM('Transfer bank','QRIS','E-wallet') NOT NULL,
  amount      DECIMAL(14,0) NOT NULL,
  paid_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_book FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_pay_book (booking_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. REVIEWS  (hanya untuk pemesanan yang sudah dibayar / selesai)
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     VARCHAR(1000) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rev_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_rev_book FOREIGN KEY (booking_id) REFERENCES bookings(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id)    REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_rev_book (booking_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. FAVORITES  (destinasi favorit per pengguna)
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
  user_id        INT UNSIGNED NOT NULL,
  destination_id INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, destination_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id)        REFERENCES users(id)        ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_fav_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. REVENUE_HISTORY  (data historis grafik "Tren pendapatan", juta Rp)
-- ---------------------------------------------------------------------
CREATE TABLE revenue_history (
  year           SMALLINT UNSIGNED NOT NULL,
  month          TINYINT UNSIGNED  NOT NULL,
  amount_million DECIMAL(10,1) NOT NULL,
  PRIMARY KEY (year, month),
  CONSTRAINT chk_rh_month CHECK (month BETWEEN 1 AND 12)
) ENGINE=InnoDB;


-- =====================================================================
--  DATA AWAL (SEED) — sama dengan data demo di script.js
-- =====================================================================

-- Password demo: user123 / admin123 (bcrypt, kompatibel password_verify() PHP)
INSERT INTO users (name, email, password_hash, role, phone) VALUES
('Dzaky Alfareza', 'dzaki@gmail.com', '$2y$10$HXadeSxnbA2Rvq/yZ9hN2.Q2JBOJCWLYVntO8vuhEzVyVi0ejZHoW', 'user', '081234567890'),
('Admin Nusa',     'admin@nusa.id',   '$2y$10$B5U91kJ0ALXDB8vz0VXNmuRrKLOTw.I.WyxDxsg3GDE0IralQFYDG', 'admin', '081111111111');

INSERT INTO categories (name) VALUES ('Bahari'), ('Budaya'), ('Alam');

INSERT INTO destinations (id, name, region, category_id, rating, visits, image_url, description) VALUES
(1,'Labuan Bajo','Nusa Tenggara Timur',1,4.9,5200,'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=1000&q=80','Pulau eksotis dan laut sebening kristal.'),
(2,'Ubud','Bali',2,4.8,4400,'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80','Seni, sawah hijau, dan suasana yang menenangkan.'),
(3,'Bromo Tengger','Jawa Timur',3,4.8,3300,'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80','Lautan pasir dan matahari terbit di pegunungan.'),
(4,'Raja Ampat','Papua Barat Daya',1,5.0,2400,'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80','Surga bawah laut dengan gugusan pulau hijau.'),
(5,'Yogyakarta','DI Yogyakarta',2,4.7,3000,'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1000&q=80','Warisan budaya, candi, dan kuliner khas.'),
(6,'Danau Toba','Sumatera Utara',3,4.8,2100,'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=80','Danau vulkanik luas dengan pemandangan menawan.');

INSERT INTO packages (id, destination_id, name, duration, max_guests, price_per_pax, tag, image_url, description) VALUES
(1,1,'Sailing Komodo','4H 3M',10,3850000,'Petualangan pilihan',NULL,'Berlayar antar pulau, snorkeling, dan panorama Komodo.'),
(2,2,'Ubud Slow Escape','3H 2M',8,2150000,'Paling diminati',NULL,'Budaya, sawah, kuliner lokal, dan waktu santai di Ubud.'),
(3,3,'Bromo After Dark','2H 1M',12,1250000,'Keberangkatan baru',NULL,'Berburu matahari terbit dan lanskap vulkanik Bromo.'),
(4,4,'Raja Ampat Blue Journey','5H 4M',8,5250000,'Lautan biru',NULL,'Island hopping dan snorkeling bersama pemandu lokal.'),
(5,5,'Yogyakarta Heritage Trail','3H 2M',10,1750000,'Jejak budaya',NULL,'Menyusuri candi, kerajinan, dan kuliner khas Yogyakarta.');

-- Trigger belum dibuat saat seed ini, jadi nilai dimasukkan langsung
INSERT INTO bookings (booking_code, user_id, package_id, package_name, customer_name, customer_email,
                      departure_date, guests, total_price, status, notes)
VALUES ('NSA-250681', 1, 1, 'Sailing Komodo', 'Dzaky Alfareza', 'dzaki@gmail.com',
        DATE_ADD(CURDATE(), INTERVAL 30 DAY), 2, 7700000, 'Pembayaran berhasil', '');

INSERT INTO payments (booking_id, method, amount) VALUES (1, 'Transfer bank', 7700000);

INSERT INTO revenue_history (year, month, amount_million) VALUES
(YEAR(CURDATE()),1,62),(YEAR(CURDATE()),2,75),(YEAR(CURDATE()),3,70),(YEAR(CURDATE()),4,92),
(YEAR(CURDATE()),5,108),(YEAR(CURDATE()),6,128),(YEAR(CURDATE()),7,143);


-- =====================================================================
--  TRIGGER — aturan bisnis langsung di database
-- =====================================================================
DELIMITER $$

-- Validasi kuota tamu, hitung total harga otomatis, isi snapshot nama paket & kode booking
CREATE TRIGGER trg_booking_bi BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  DECLARE v_max   SMALLINT UNSIGNED;
  DECLARE v_price DECIMAL(12,0);
  DECLARE v_name  VARCHAR(120);

  IF NEW.package_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Paket wisata wajib dipilih';
  END IF;

  SELECT max_guests, price_per_pax, name INTO v_max, v_price, v_name
    FROM packages WHERE id = NEW.package_id;

  IF NEW.guests < 1 OR NEW.guests > v_max THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jumlah peserta melebihi kuota paket atau kurang dari 1';
  END IF;

  IF NEW.departure_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tanggal berangkat tidak boleh di masa lalu';
  END IF;

  SET NEW.total_price  = v_price * NEW.guests;
  SET NEW.package_name = v_name;

  IF NEW.booking_code IS NULL OR NEW.booking_code = '' THEN
    SET NEW.booking_code = CONCAT('NSA-', LPAD(FLOOR(RAND()*1000000), 6, '0'));
  END IF;
END$$

-- Ulasan hanya boleh untuk pemesanan yang sudah dibayar / selesai
CREATE TRIGGER trg_review_bi BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(30);
  SELECT status INTO v_status FROM bookings WHERE id = NEW.booking_id;
  IF v_status NOT IN ('Pembayaran berhasil','Selesai') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ulasan hanya bisa ditulis setelah pembayaran berhasil';
  END IF;
END$$

-- =====================================================================
--  STORED PROCEDURE
-- =====================================================================

-- Buat pemesanan baru (total dihitung trigger). Mengembalikan kode booking.
CREATE PROCEDURE sp_create_booking(
  IN p_user_id INT UNSIGNED, IN p_package_id INT UNSIGNED,
  IN p_name VARCHAR(100), IN p_email VARCHAR(120),
  IN p_date DATE, IN p_guests SMALLINT UNSIGNED, IN p_notes VARCHAR(500))
BEGIN
  DECLARE v_code VARCHAR(20);
  SET v_code = CONCAT('NSA-', LPAD(FLOOR(RAND()*1000000), 6, '0'));
  INSERT INTO bookings (booking_code, user_id, package_id, customer_name, customer_email,
                        departure_date, guests, total_price, notes)
  VALUES (v_code, p_user_id, p_package_id, p_name, p_email, p_date, p_guests, 0, p_notes);
  SELECT v_code AS booking_code;
END$$

-- Simulasi pembayaran: catat pembayaran + ubah status
CREATE PROCEDURE sp_pay_booking(IN p_code VARCHAR(20), IN p_method VARCHAR(20))
BEGIN
  DECLARE v_id INT UNSIGNED; DECLARE v_total DECIMAL(14,0); DECLARE v_status VARCHAR(30);
  SELECT id, total_price, status INTO v_id, v_total, v_status
    FROM bookings WHERE booking_code = p_code FOR UPDATE;
  IF v_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kode pemesanan tidak ditemukan';
  ELSEIF v_status <> 'Menunggu pembayaran' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pemesanan ini tidak dalam status menunggu pembayaran';
  END IF;
  INSERT INTO payments (booking_id, method, amount) VALUES (v_id, p_method, v_total);
  UPDATE bookings SET status = 'Pembayaran berhasil' WHERE id = v_id;
END$$

-- Batalkan pemesanan (hanya yang masih menunggu pembayaran)
CREATE PROCEDURE sp_cancel_booking(IN p_code VARCHAR(20))
BEGIN
  UPDATE bookings SET status = 'Dibatalkan'
   WHERE booking_code = p_code AND status = 'Menunggu pembayaran';
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pemesanan tidak ditemukan atau tidak bisa dibatalkan';
  END IF;
END$$

DELIMITER ;

-- =====================================================================
--  VIEW — query siap pakai untuk halaman admin & akun
-- =====================================================================

-- Daftar pemesanan lengkap (tab Pemesanan / Akun Saya / Laporan CSV)
CREATE VIEW v_booking_detail AS
SELECT b.id, b.booking_code, b.user_id, b.customer_name, b.customer_email,
       COALESCE(p.name, b.package_name, 'Paket sudah dihapus') AS package_name,
       d.name AS destination_name, d.region,
       COALESCE(p.image_url, d.image_url) AS image_url,
       p.duration, b.departure_date, b.guests, b.total_price, b.status, b.notes, b.created_at
FROM bookings b
LEFT JOIN packages p     ON p.id = b.package_id
LEFT JOIN destinations d ON d.id = p.destination_id;

-- Daftar destinasi + kategori
CREATE VIEW v_destinations AS
SELECT d.id, d.name, d.region, c.name AS category, d.rating, d.visits, d.image_url, d.description
FROM destinations d JOIN categories c ON c.id = d.category_id;

-- Daftar paket + destinasi (gambar fallback ke gambar destinasi)
CREATE VIEW v_packages AS
SELECT p.id, p.name, p.destination_id, d.name AS destination_name, p.duration, p.max_guests,
       p.price_per_pax, p.tag, COALESCE(NULLIF(p.image_url,''), d.image_url) AS image_url, p.description
FROM packages p JOIN destinations d ON d.id = p.destination_id;

-- Top 5 destinasi: pengunjung + total tamu pemesanan aktif
CREATE VIEW v_top_destinations AS
SELECT d.id, d.name,
       d.visits + COALESCE(SUM(CASE WHEN b.status <> 'Dibatalkan' THEN b.guests END), 0) AS total_visitors
FROM destinations d
LEFT JOIN packages p ON p.destination_id = d.id
LEFT JOIN bookings b ON b.package_id = p.id
GROUP BY d.id, d.name, d.visits
ORDER BY total_visitors DESC
LIMIT 5;

-- Ringkasan pengguna (tab Pengguna admin)
CREATE VIEW v_user_summary AS
SELECT u.id, u.name, u.email, COUNT(b.id) AS total_bookings,
       COALESCE(SUM(CASE WHEN b.status IN ('Pembayaran berhasil','Selesai') THEN b.total_price END), 0) AS total_spent
FROM users u LEFT JOIN bookings b ON b.user_id = u.id
WHERE u.role = 'user'
GROUP BY u.id, u.name, u.email;

-- Statistik dashboard admin
CREATE VIEW v_dashboard_stats AS
SELECT
  (SELECT COALESCE(SUM(total_price),0) FROM bookings
    WHERE status IN ('Pembayaran berhasil','Selesai')
      AND YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())) AS revenue_this_month,
  (SELECT COALESCE(SUM(total_price),0) FROM bookings
    WHERE status IN ('Pembayaran berhasil','Selesai')) AS revenue_confirmed_total,
  (SELECT COUNT(*) FROM bookings) AS total_bookings,
  (SELECT COALESCE(SUM(guests),0) FROM bookings WHERE status <> 'Dibatalkan') AS active_travelers,
  (SELECT COUNT(*) FROM bookings WHERE status = 'Menunggu pembayaran') AS pending_payments;

-- Tren pendapatan bulanan (historis + pemesanan sebenarnya), juta Rp
CREATE VIEW v_monthly_revenue AS
SELECT r.year, r.month,
       r.amount_million + COALESCE((
         SELECT SUM(b.total_price)/1000000 FROM bookings b
          WHERE b.status IN ('Pembayaran berhasil','Selesai')
            AND YEAR(b.created_at)=r.year AND MONTH(b.created_at)=r.month), 0) AS revenue_million
FROM revenue_history r
ORDER BY r.year, r.month;

-- Rating rata-rata ulasan per paket
CREATE VIEW v_review_detail AS
SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer,
       COALESCE(p.name, b.package_name) AS package_name
FROM reviews r
JOIN bookings b ON b.id = r.booking_id
LEFT JOIN packages p ON p.id = b.package_id
LEFT JOIN users u ON u.id = r.user_id;
