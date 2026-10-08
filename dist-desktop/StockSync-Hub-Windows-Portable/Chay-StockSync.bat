@echo off
chcp 65001 >nul
title StockSync Hub - Máy Chủ Kho & Đồng Bộ Điện Thoại
cls
echo ==============================================================
echo       STOCKS YNC HUB - HỆ THỐNG QUẢN LÝ KHO XÁC LINH KIỆN      
echo ==============================================================
echo.
echo  Dang khoi dong may chu ket noi Wi-Fi...
echo  Trinh duyet se tu dong mo trang: http://localhost:3000
echo.
echo  De tat ung dung, hay dong cua so Command Prompt nay.
echo ==============================================================
echo.
start "" "%~dp0StockSync-Hub.exe"
pause
