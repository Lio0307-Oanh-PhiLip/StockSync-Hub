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
      final String currentVersion = packageInfo.version;

      final url = Uri.parse('https://api.github.com/repos/$githubOwner/$githubRepo/releases/latest');
      final response = await http.get(url, headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StockSync-Flutter-App',
      });

      if (response.statusCode != 200) {
        if (!silent) {
          _showSnackBar(context, 'Không thể kiểm tra bản cập nhật (Mã lỗi: ${response.statusCode})');
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
        _showSnackBar(context, 'Bạn đang sử dụng phiên bản mới nhất ($currentVersion)');
      }
    } catch (e) {
      if (!silent) {
        _showSnackBar(context, 'Lỗi kết nối khi kiểm tra cập nhật: $e');
      }
    }
  }

  /// So khớp logic Semantic Versioning (vd: 1.1.4 > 1.1.3)
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

  Future<void> _startDownloadAndInstall() async {
    setState(() {
      isDownloading = true;
      statusText = 'Đang chuẩn bị tải...';
    });

    try {
      // Yêu cầu quyền cài đặt ứng dụng không rõ nguồn gốc (Android 8+)
      if (Platform.isAndroid) {
        final installStatus = await Permission.requestInstallPackages.status;
        if (!installStatus.isGranted) {
          await Permission.requestInstallPackages.request();
        }
      }

      final Directory tempDir = await getTemporaryDirectory();
      final String savePath = '${tempDir.path}/StockSync_v${widget.latestVersion}.apk';

      // Xóa tệp cũ nếu đã tồn tại
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
              statusText = 'Đã tải: ${(progress * 100).toStringAsFixed(1)}%';
            });
          }
        },
      );

      setState(() {
        statusText = 'Tải xong! Đang mở trình cài đặt...';
      });

      // Kích hoạt trình cài đặt gói mặc định của Android
      final result = await OpenFilex.open(
        savePath,
        type: "application/vnd.android.package-archive",
      );

      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      setState(() {
        isDownloading = false;
        statusText = 'Lỗi tải cập nhật: $e';
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
          Text('Cập nhật ứng dụng', style: TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Đã có phiên bản mới: v${widget.latestVersion}'),
          Text('Phiên bản hiện tại: v${widget.currentVersion}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),
          if (isDownloading) ...[
            LinearProgressIndicator(value: progress, minHeight: 8, borderRadius: BorderRadius.circular(4)),
            const SizedBox(height: 8),
            Text(statusText, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ] else
            const Text('Bạn có muốn tải và cài đặt bản cập nhật này ngay bây giờ?'),
        ],
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
            child: const Text('Cập nhật ngay'),
          ),
        ]
      ],
    );
  }
}
