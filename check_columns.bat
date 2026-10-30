@echo off
set MYSQL_CMD=mysql -u root
echo Checking MySQL columns for siaptk database...
%MYSQL_CMD% siaptk -e "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'siaptk' ORDER BY TABLE_NAME, COLUMN_NAME;"
pause