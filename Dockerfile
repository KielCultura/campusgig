FROM php:8.2-apache

# Install PHP extensions needed for MySQL and sockets
RUN docker-php-ext-install pdo pdo_mysql mysqli sockets

# Enable Apache mod_rewrite for .htaccess
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy all project files
COPY . .

# Install PHP dependencies (Ratchet etc.)
RUN composer install --no-dev --optimize-autoloader

# Fix permissions
RUN chown -R www-data:www-data /var/www/html

# Allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

EXPOSE 80
