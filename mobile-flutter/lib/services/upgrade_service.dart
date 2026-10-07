import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

class UpgradeService {
  static const String githubOwner = "philiptrinh1990";
  static const String githubRepo = "stocksync-hub";

  /// Kiểm tra phiên bản mới từ GitHub Releases
  static Future<void> checkForUpdate(BuildContext context, {bool silent = false}) async {
    try {
      final PackageInfo packageInfo = await PackageInfo.fromPlatform();
      final String currentVersion = packageInfo.version.isNotEmpty ? packageInfo.version : "1.1.5";

      final url = Uri.parse('https://api.github.com/repos/$githubOwner/$githubRepo/releases/latest');
      final response = await http.get(url, headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StockSync-Flutter-App',
      });

      if (response.statusCode != 200) {
        if (!silent) {
          _showSnackBar(context, 'Không thể kiểm tra bản cập nhật (Mã phản hồi: ${response.statusCode})');
        }
        return;
      }

      final data = json.decode(response.body);
      final String latestTag = (data['tag_name'] as String? ?? '').replaceAll('v', '').trim();
      final List assets = data['assets'] as List? ?? [];

      String? apkDownloadUrl;
      for (var asset in assets) {
        final name = (asset['name'] as String? ?? '').toLowerCase();
        if (name.endsWith('.apk')) {
          apkDownloadUrl = asset['browser_download_url'];
          break;
        }
      }

      if (_isVersionNewer(latestTag, currentVersion) && apkDownloadUrl != null) {
        _showUpdateDialog(context, currentVersion, latestTag, apkDownloadUrl);
      } else if (!silent) {
        _showSnackBar(context, 'Bạn đang sử dụng phiên bản mới nhất (v$currentVersion)');
      }
    } catch (e) {
      if (!silent) {
        _showSnackBar(context, 'Lỗi kết nối khi kiểm tra cập nhật: $e');
      }
    }
  }

  /// So khớp logic Semantic Versioning (vd: 1.1.5 > 1.1.4)
  static bool _isVersionNewer(String latest, String current) {
    try {
      List<int> l = latest.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      List<int> c = current.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      int len = l.length > c.length ? l.length : c.length;

      for (int i = 0; i < len; i++) {
        int lv = i < l.length ? l[i] : 0;
        int cv = i < c.length ? c[i] : 0;
        if (lv > cv) return true;
        if (lv < cv) return false;
      }
    } catch (_) {}
    return false;
  }

  /// Hộp thoại thông báo có bản cập nhật mới
  static void _showUpdateDialog(BuildContext context, String currentVer, String latestVer, String downloadUrl) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext ctx) {
        return _DownloadProgressDialog(
          currentVersion: currentVer,
          latestVersion: latestVer,
          downloadUrl: downloadUrl,
        );
      },
    );
  }

  static void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }
}

class _DownloadProgressDialog extends StatefulWidget {
  final String currentVersion;
  final String latestVersion;
  final String downloadUrl;

  const _DownloadProgressDialog({
    required this.currentVersion,
    required this.latestVersion,
    required this.downloadUrl,
  });

  @override
  State<_DownloadProgressDialog> createState() => _DownloadProgressDialogState();
}

class _DownloadProgressDialogState extends State<_DownloadProgressDialog> {
  bool isDownloading = false;
  double progress = 0.0;
  String statusText = '';
  bool showPlayProtectNotice = false;

  Future<void> _startDownloadAndInstall() async {
    setState(() {
      isDownloading = true;
      statusText = 'Đang chuẩn bị kết nối...';
      showPlayProtectNotice = true;
    });

    try {
      // Yêu cầu quyền cài đặt ứng dụng (Android 8+)
      if (Platform.isAndroid) {
        final installStatus = await Permission.requestInstallPackages.status;
        if (!installStatus.isGranted) {
          await Permission.requestInstallPackages.request();
        }
      }

      final Directory tempDir = await getTemporaryDirectory();
      final String savePath = '${tempDir.path}/StockSync_v${widget.latestVersion}.apk';

      // Xóa file cũ nếu đã tồn tại để tránh xung đột
      final File existingFile = File(savePath);
      if (await existingFile.exists()) {
        await existingFile.delete();
      }

      final Dio dio = Dio();
      await dio.download(
        widget.downloadUrl,
        savePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            setState(() {
              progress = received / total;
              statusText = 'Đang tải: ${(progress * 100).toStringAsFixed(1)}% (${(received / 1048576).toStringAsFixed(1)} MB)';
            });
          }
        },
      );

      setState(() {
        statusText = 'Tải xong! Đang khởi chạy trình cài đặt Android...';
      });

      // Kích hoạt trình cài đặt gói mặc định của Android
      await OpenFilex.open(
        savePath,
        type: "application/vnd.android.package-archive",
      );

      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      setState(() {
        isDownloading = false;
        statusText = 'Lỗi trong quá trình tải: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: const [
          Icon(Icons.system_update_rounded, color: Colors.blueAccent),
          SizedBox(width: 8),
          Text('Cập nhật StockSync', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Đã có bản phát hành: v${widget.latestVersion}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent)),
            Text('Phiên bản trên máy: v${widget.currentVersion}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 12),
            if (isDownloading) ...[
              LinearProgressIndicator(value: progress, minHeight: 8, borderRadius: BorderRadius.circular(4), color: Colors.blueAccent),
              const SizedBox(height: 8),
              Text(statusText, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('🛡️ Lưu ý Google Play Protect:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange)),
                    SizedBox(height: 4),
                    Text('Nếu Android hiện cảnh báo "Bị chặn bởi Play Protect", hãy bấm "Chi tiết khác" -> "Vẫn cài đặt" để tiếp tục.', style: TextStyle(fontSize: 11)),
                  ],
                ),
              )
            ] else ...[
              const Text('Bản cập nhật v1.1.5 đã khắc phục hoàn toàn lỗi cài đặt trên smartphone và tối ưu camera quét QR kho xác.'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('💡 Mẹo: Nếu đang có phiên bản cũ bị lỗi cài đè, bạn có thể gỡ bản cũ trước khi cài bản v1.1.5.', style: TextStyle(fontSize: 11, color: Colors.black87)),
              )
            ],
          ],
        ),
      ),
      actions: [
        if (!isDownloading) ...[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Để sau', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: _startDownloadAndInstall,
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, foregroundColor: Colors.white),
            child: const Text('Tải & Cài đặt ngay'),
          ),
        ]
      ],
    );
  }
}
