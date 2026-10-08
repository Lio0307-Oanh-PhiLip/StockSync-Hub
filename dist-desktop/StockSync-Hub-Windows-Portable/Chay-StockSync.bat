@echo off
chcp 65001 >nul
title StockSync Hub - Máy Chủ Kho & Đồng Bộ Điện Thoại (v1.2.9)
cls
echo ==============================================================
echo       STOCKS YNC HUB - HỆ THỐNG QUẢN LÝ KHO XÁC LINH KIỆN      
echo ==============================================================
echo.
echo  [1] Dang khoi dong may chu ket noi Wi-Fi...
echo  [2] Trinh duyet se tu dong mo trang: http://localhost:3000
echo.
echo  Luu y: Vui long giu cua so nay mo trong suot qua trinh quet kho!
echo  De tat ung dung, hay bam to hop phim Ctrl+C hoac dong cua so nay.
echo ==============================================================
echo.
"%~dp0StockSync-Hub.exe"
if %errorlevel% neq 0 (
  echo.
  echo  ==============================================================
  echo  Co loi xay ra trong khi chay. Ma loi: %errorlevel%
  echo  ==============================================================
  pause
)
