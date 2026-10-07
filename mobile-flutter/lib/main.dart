import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'services/upgrade_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const StockSyncMobileApp());
}

class StockSyncMobileApp extends StatelessWidget {
  const StockSyncMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockSync Mobile Scanner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
      home: const ScannerHomeScreen(),
    );
  }
}

class ScannerHomeScreen extends StatefulWidget {
  const ScannerHomeScreen({super.key});

  @override
  State<ScannerHomeScreen> createState() => _ScannerHomeScreenState();
}

class _ScannerHomeScreenState extends State<ScannerHomeScreen> {
  final MobileScannerController scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );

  WebSocketChannel? channel;
  String serverUrl = "wss://ais-dev-raxzxcsor7d6q2kcn7kvxc-98361429439.asia-southeast1.run.app/ws";
  bool isConnected = false;
  List<Map<String, dynamic>> scanHistory = [];
  String lastScannedCode = '';

  @override
  void initState() {
    super.initState();
    // Tự động kiểm tra bản cập nhật khi mở app
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpgradeService.checkForUpdate(context, silent: true);
    });
    _initWebSocket();
  }

  void _initWebSocket() {
    try {
      channel = WebSocketChannel.connect(Uri.parse(serverUrl));
      channel!.stream.listen((message) {
        setState(() {
          isConnected = true;
        });
      }, onError: (err) {
        setState(() {
          isConnected = false;
        });
      }, onDone: () {
        setState(() {
          isConnected = false;
        });
      });
    } catch (_) {
      setState(() {
        isConnected = false;
      });
    }
  }

  void _onDetect(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final String? code = barcode.rawValue;
      if (code != null && code.isNotEmpty && code != lastScannedCode) {
        setState(() {
          lastScannedCode = code;
          scanHistory.insert(0, {
            'code': code,
            'time': DateTime.now().toString().substring(11, 19),
          });
        });

        // Gửi mã vạch sang Server qua WebSocket
        if (channel != null && isConnected) {
          channel!.sink.add(json.encode({
            'type': 'SCAN_EVENT',
            'barcode': code,
            'timestamp': DateTime.now().millisecondsSinceEpoch,
          }));
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã quét: $code'),
            duration: const Duration(milliseconds: 900),
            backgroundColor: Colors.green.shade700,
          ),
        );
        break;
      }
    }
  }

  @override
  void dispose() {
    scannerController.dispose();
    channel?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('StockSync Scanner v1.1.4', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.blueAccent,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            tooltip: 'Kiểm tra cập nhật',
            onPressed: () => UpgradeService.checkForUpdate(context),
          ),
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: scannerController.torchState,
              builder: (context, state, child) {
                return Icon(state == TorchState.on ? Icons.flash_on : Icons.flash_off);
              },
            ),
            onPressed: () => scannerController.toggleTorch(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Khung Camera Scanner
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                MobileScanner(
                  controller: scannerController,
                  onDetect: _onDetect,
                ),
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.blueAccent, width: 3),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Danh sách mã vừa quét
          Expanded(
            flex: 2,
            child: Container(
              color: Colors.grey.shade100,
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      const Text('Lịch sử quét:', style: TextStyle(fontWeight: FontWeight.bold)),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isConnected ? Colors.green : Colors.orange,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isConnected ? 'Real-time Hub: Đã kết nối' : 'Real-time: Đang kết nối lại...',
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: scanHistory.isEmpty
                      ? const Center(child: Text('Hướng camera vào mã vạch/QR để bắt đầu quét'))
                      : ListView.builder(
                          itemCount: scanHistory.length,
                          itemBuilder: (context, index) {
                            final item = scanHistory[index];
                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              child: ListTile(
                                dense: true,
                                leading: const Icon(Icons.qr_code_2, color: Colors.blueAccent),
                                title: Text(item['code'], style: const TextStyle(fontWeight: FontWeight.bold)),
                                trailing: Text(item['time'], style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              ),
                            );
                          },
                        ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
