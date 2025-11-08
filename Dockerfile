# Dockerfile

# Menggunakan image resmi PHP-Apache
FROM php:8.1-apache
# ... (kode lainnya) ...

# Menginstal ekstensi PHP yang dibutuhkan (misalnya, MySQLi, PDO MySQL)
RUN docker-php-ext-install pdo_mysql mysqli

# Mengatur working directory di dalam container
WORKDIR /var/www/html

# Meng-copy semua file proyek kamu ke dalam container
COPY . /var/www/html

# >> PERBAIKAN: Tambahkan konfigurasi Apache baru
# Hapus default Virtual Host Apache
RUN rm /etc/apache2/sites-enabled/000-default.conf
# Copy konfigurasi vhost yang sudah diubah (dari folder docker-config)
COPY docker-config/vhost.conf /etc/apache2/sites-available/000-default.conf
# Aktifkan site baru
RUN a2ensite 000-default.conf
# << AKHIR PERBAIKAN

# Expose port 80 (standar HTTP)
EXPOSE 80