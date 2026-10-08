@echo off
chcp 65001 >nul
title Cài Đặt StockSync Hub - Máy Tính PC (Windows 10 / 11)
cls
echo ==============================================================
echo       STOCKS YNC HUB - TRÌNH CÀI ĐẶT TỰ ĐỘNG MÁY CHỦ PC        
echo ==============================================================
echo.
echo  [1/3] Đang tạo thư mục cài đặt tại %%LOCALAPPDATA%\StockSyncHub...
set "TARGET_DIR=%LOCALAPPDATA%\StockSyncHub"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo  [2/3] Đang sao chép các tệp thực thi vào hệ thống...
copy /Y "%~dp0StockSync-Hub.exe" "%TARGET_DIR%\StockSync-Hub.exe" >nul
copy /Y "%~dp0Chay-StockSync.bat" "%TARGET_DIR%\Chay-StockSync.bat" >nul 2>&1

echo  [3/3] Đang tạo Shortcut biểu tượng trên màn hình Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'StockSync Hub.lnk')); $s.TargetPath = '%TARGET_DIR%\StockSync-Hub.exe'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Save()"

echo.
echo ==============================================================
echo  ✔ CÀI ĐẶT THÀNH CÔNG!
echo  ✔ Biểu tượng 'StockSync Hub' đã xuất hiện trên màn hình Desktop.
echo ==============================================================
echo.
echo  Đang khởi động ứng dụng ngay bây giờ...
start "" "%TARGET_DIR%\StockSync-Hub.exe"
timeout /t 3 >nul
exit
