import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:path_provider/path_provider.dart';
import 'services/upgrade_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const StockSyncMobileApp());
}

class InventoryItem {
  final String id;
  String trangThai;
  final String cotSP;
  final String scCode;
  final String warehouseName;
  final String soRO;
  final String bhDv; // 'IW' | 'OOW'
  final String maLK;
  final String productName;
  final String model;
  final String type; // 'LCD' | 'MAIN' | 'OTHERS'
  final int slg;
  int daQuet;
  final String remark;
  String? lastScannedAt;

  InventoryItem({
    required this.id,
    required this.trangThai,
    required this.cotSP,
    required this.scCode,
    required this.warehouseName,
    required this.soRO,
    required this.bhDv,
    required this.maLK,
    required this.productName,
    required this.model,
    required this.type,
    required this.slg,
    required this.daQuet,
    required this.remark,
    this.lastScannedAt,
  });

  bool get isScanned => daQuet > 0;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trangThai': trangThai,
      'cotSP': cotSP,
      'scCode': scCode,
      'warehouseName': warehouseName,
      'soRO': soRO,
      'bhDv': bhDv,
      'maLK': maLK,
      'productName': productName,
      'model': model,
      'type': type,
      'slg': slg,
      'daQuet': daQuet,
      'remark': remark,
      'lastScannedAt': lastScannedAt,
    };
  }

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['id']?.toString() ?? '',
      trangThai: json['trangThai']?.toString() ?? 'Chưa Scan',
      cotSP: json['cotSP']?.toString() ?? '',
      scCode: json['scCode']?.toString() ?? '',
      warehouseName: json['warehouseName']?.toString() ?? '',
      soRO: json['soRO']?.toString() ?? '',
      bhDv: json['bhDv']?.toString() ?? 'OOW',
      maLK: json['maLK']?.toString() ?? '',
      productName: json['productName']?.toString() ?? '',
      model: json['model']?.toString() ?? '',
      type: json['type']?.toString() ?? 'OTHERS',
      slg: (json['slg'] as num?)?.toInt() ?? 1,
      daQuet: (json['daQuet'] as num?)?.toInt() ?? 0,
      remark: json['remark']?.toString() ?? '',
      lastScannedAt: json['lastScannedAt']?.toString(),
    );
  }
}

class StockSyncMobileApp extends StatelessWidget {
  const StockSyncMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockSync Hub Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          surface: Colors.white,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Color(0xFF1E293B),
          foregroundColor: Colors.white,
          systemOverlayStyle: SystemUiOverlayStyle.light,
        ),
      ),
      home: const MainSyncShell(),
    );
  }
}

class MainSyncShell extends StatefulWidget {
  const MainSyncShell({super.key});

  @override
  State<MainSyncShell> createState() => _MainSyncShellState();
}

class _MainSyncShellState extends State<MainSyncShell> with SingleTickerProviderStateMixin {
  int _selectedTabIndex = 0;

  // WebSocket Sync State
  WebSocketChannel? _channel;
  // Shared App URL accessible from any mobile device without internal auth
  String _serverUrl = "wss://ais-pre-raxzxcsor7d6q2kcn7kvxc-98361429439.asia-southeast1.run.app/ws";
  bool _isConnected = false;
  Timer? _reconnectTimer;
  bool _isReconnecting = false;
  bool _isLoadingData = false;

  // Inventory Data
  List<InventoryItem> _items = [];
  List<Map<String, dynamic>> _scanHistory = [];
  String _lastScannedCode = '';
  Map<String, dynamic>? _lastScanResult;

  // Scanner Controller
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  bool _isTorchOn = false;

  // Filter & Search in Inventory Tab
  String _searchQuery = '';
  String _filterWarranty = 'ALL'; // 'ALL', 'OOW', 'IW'
  String _filterStatus = 'ALL'; // 'ALL', 'SCANNED', 'UNSCANNED'
  String _filterType = 'ALL'; // 'ALL', 'LCD', 'MAIN', 'OTHERS'

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _loadSavedServerUrl();
    _startAutoReconnectTimer();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpgradeService.checkForUpdate(context, silent: true);
    });
  }

  @override
  void dispose() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _scannerController.dispose();
    super.dispose();
  }

  // --- Initial Data Loading & Offline Cache ---
  Future<void> _loadInitialData() async {
    setState(() {
      _isLoadingData = true;
    });

    try {
      // 1. Check local file cache first (previous scans)
      final dir = await getApplicationDocumentsDirectory();
      final cacheFile = File('${dir.path}/stocksync_inventory.json');
      if (await cacheFile.exists()) {
        final content = await cacheFile.readAsString();
        final data = json.decode(content);
        if (data is List && data.isNotEmpty) {
          final List<InventoryItem> cached = data.map((j) => InventoryItem.fromJson(j)).toList();
          _populateItems(cached);
          setState(() {
            _isLoadingData = false;
          });
          return;
        }
      }
    } catch (_) {}

    // 2. Load embedded default inventory bundle (312 items matching OPPO Phú Lâm VN001021)
    try {
      final assetContent = await rootBundle.loadString('assets/data/inventory_store.json');
      final data = json.decode(assetContent);
      final List oowRaw = data['oow'] ?? [];
      final List iwRaw = data['iw'] ?? [];
      final List<InventoryItem> bundled = [];
      for (var item in [...oowRaw, ...iwRaw]) {
        bundled.add(InventoryItem.fromJson(item));
      }
      if (bundled.isNotEmpty) {
        _populateItems(bundled);
      }
    } catch (e) {
      debugPrint('[Asset Load Error]: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingData = false;
        });
      }
    }
  }

  void _populateItems(List<InventoryItem> newItems) {
    final List<Map<String, dynamic>> history = [];
    for (var it in newItems.where((i) => i.isScanned)) {
      history.add({
        'code': it.cotSP.isNotEmpty ? it.cotSP : it.soRO,
        'time': it.lastScannedAt ?? '',
        'name': it.productName,
        'ro': it.soRO,
        'lk': it.maLK,
        'bh': it.bhDv,
      });
    }
    setState(() {
      _items = newItems;
      _scanHistory = history;
    });
  }

  Future<void> _saveItemsToCache() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final cacheFile = File('${dir.path}/stocksync_inventory.json');
      final listJson = _items.map((i) => i.toJson()).toList();
      await cacheFile.writeAsString(json.encode(listJson));
    } catch (_) {}
  }

  // --- Persistence & Config ---
  Future<void> _loadSavedServerUrl() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/stocksync_config.json');
      if (await file.exists()) {
        final content = await file.readAsString();
        final data = json.decode(content);
        if (data['serverUrl'] != null && data['serverUrl'].toString().isNotEmpty) {
          final saved = data['serverUrl'].toString();
          // Auto fix legacy internal dev url to public shared url
          if (saved.contains('ais-dev-')) {
            _serverUrl = saved.replaceAll('ais-dev-', 'ais-pre-');
          } else {
            _serverUrl = saved;
          }
        }
      }
    } catch (_) {}

    _syncViaHttp();
    _connectWebSocket();
  }

  Future<void> _saveServerUrl(String newUrl) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/stocksync_config.json');
      await file.writeAsString(json.encode({'serverUrl': newUrl}));
    } catch (_) {}
  }

  void _startAutoReconnectTimer() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!_isConnected && !_isReconnecting) {
        _connectWebSocket();
      }
    });
  }

  // --- HTTP REST Sync (Guaranteed Network Fallback) ---
  String _getHttpBaseUrl() {
    String url = _serverUrl.trim();
    if (url.startsWith('wss://')) {
      url = url.replaceFirst('wss://', 'https://');
    } else if (url.startsWith('ws://')) {
      url = url.replaceFirst('ws://', 'http://');
    }
    if (url.endsWith('/ws')) {
      url = url.substring(0, url.length - 3);
    }
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  Future<void> _syncViaHttp({bool showFeedback = false}) async {
    try {
      final baseUrl = _getHttpBaseUrl();
      final uri = Uri.parse('$baseUrl/api/sync/state');
      final response = await http.get(uri).timeout(const Duration(seconds: 6));
      if (response.statusCode == 200) {
        final data = json.decode(utf8.decode(response.bodyBytes));
        final List oowRaw = data['oow'] ?? [];
        final List iwRaw = data['iw'] ?? [];
        final List<InventoryItem> parsed = [];
        for (var item in [...oowRaw, ...iwRaw]) {
          parsed.add(InventoryItem.fromJson(item));
        }
        if (parsed.isNotEmpty) {
          _populateItems(parsed);
          _saveItemsToCache();
          if (mounted && showFeedback) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('✅ Đã đồng bộ ${parsed.length} linh kiện từ PC Hub'),
                backgroundColor: const Color(0xFF10B981),
                behavior: SnackBarBehavior.floating,
                duration: const Duration(milliseconds: 1500),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('[HTTP Sync Error]: $e');
    }
  }

  Future<void> _sendScanToServer(String code) async {
    // 1. Send via WebSocket (Realtime Push)
    if (_channel != null && _isConnected) {
      try {
        _channel!.sink.add(json.encode({
          'type': 'SCAN_EVENT',
          'barcode': code,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
      } catch (_) {}
    }

    // 2. Send via HTTP POST (Reliable fallback delivery)
    try {
      final baseUrl = _getHttpBaseUrl();
      final uri = Uri.parse('$baseUrl/api/sync/scan');
      http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'scannedCode': code, 'clientId': 'mobile_apk'}),
      ).timeout(const Duration(seconds: 4)).then((res) {
        if (res.statusCode == 200) {
          debugPrint('[HTTP Scan Sync Success]');
        }
      }).catchError((_) {});
    } catch (_) {}
  }

  // --- WebSocket Connection & Real-Time Sync ---
  void _connectWebSocket() {
    if (_isReconnecting) return;
    _isReconnecting = true;

    try {
      try {
        _channel?.sink.close();
      } catch (_) {}
      _channel = WebSocketChannel.connect(Uri.parse(_serverUrl));

      _channel!.stream.listen(
        (message) {
          _isReconnecting = false;
          if (!_isConnected) {
            setState(() {
              _isConnected = true;
            });
            // Request full updated state on fresh connection
            try {
              _channel?.sink.add(json.encode({'type': 'REQUEST_FULL_STATE'}));
            } catch (_) {}
          }
          _handleServerMessage(message);
        },
        onError: (err) {
          _isReconnecting = false;
          if (_isConnected) {
            setState(() {
              _isConnected = false;
            });
          }
          debugPrint('[WebSocket Error]: $err');
        },
        onDone: () {
          _isReconnecting = false;
          if (_isConnected) {
            setState(() {
              _isConnected = false;
            });
          }
        },
      );
    } catch (e) {
      _isReconnecting = false;
      if (_isConnected) {
        setState(() {
          _isConnected = false;
        });
      }
      debugPrint('[WebSocket Connect Exception]: $e');
    }
  }

  void _handleServerMessage(dynamic raw) {
    try {
      final data = json.decode(raw.toString());
      final String type = data['type'] ?? '';
      final payload = data['payload'];

      // Heartbeat ping/pong response
      if (type == 'PING') {
        try {
          _channel?.sink.add(json.encode({'type': 'PONG', 'timestamp': DateTime.now().millisecondsSinceEpoch}));
        } catch (_) {}
        return;
      }

      if (type == 'INIT_STATE' || type == 'SYNC_FULL_STATE') {
        final List oowRaw = payload['oow'] ?? [];
        final List iwRaw = payload['iw'] ?? [];
        final List<InventoryItem> parsed = [];

        for (var item in [...oowRaw, ...iwRaw]) {
          parsed.add(InventoryItem.fromJson(item));
        }

        if (parsed.isNotEmpty) {
          _populateItems(parsed);
          _saveItemsToCache();
        }
      } else if (type == 'SCAN_PERFORMED') {
        final itemMap = payload['item'];
        if (itemMap != null) {
          final String updatedId = itemMap['id'] ?? '';
          final String cotSP = itemMap['cotSP'] ?? '';
          final String soRO = itemMap['soRO'] ?? '';
          final String maLK = itemMap['maLK'] ?? '';
          final String name = itemMap['productName'] ?? '';
          final String time = itemMap['lastScannedAt'] ?? DateTime.now().toString().substring(11, 19);

          setState(() {
            // Update item in local list
            for (var it in _items) {
              if (it.id == updatedId || (cotSP.isNotEmpty && it.cotSP == cotSP)) {
                it.daQuet = (itemMap['daQuet'] as num?)?.toInt() ?? 1;
                it.trangThai = itemMap['trangThai'] ?? 'Khớp, Trả Xác';
                it.lastScannedAt = time;
                break;
              }
            }

            // Update scan history
            final historyCode = cotSP.isNotEmpty ? cotSP : soRO;
            _scanHistory.removeWhere((h) => h['code'] == historyCode);
            _scanHistory.insert(0, {
              'code': historyCode,
              'time': time,
              'name': name,
              'ro': soRO,
              'lk': maLK,
              'bh': itemMap['bhDv'] ?? 'OOW',
            });

            _lastScanResult = {
              'success': true,
              'code': historyCode,
              'name': name,
              'ro': soRO,
              'lk': maLK,
              'time': time,
            };
          });

          _saveItemsToCache();
          HapticFeedback.lightImpact();
        }
      } else if (type == 'SCAN_REMOVED') {
        final String itemId = payload['itemId'] ?? '';
        setState(() {
          for (var it in _items) {
            if (it.id == itemId) {
              it.daQuet = 0;
              it.trangThai = 'Chưa Scan';
              it.lastScannedAt = null;
              break;
            }
          }
          _scanHistory.removeWhere((h) => h['id'] == itemId);
        });
        _saveItemsToCache();
      } else if (type == 'SCANS_CLEARED') {
        setState(() {
          for (var it in _items) {
            it.daQuet = 0;
            it.trangThai = 'Chưa Scan';
            it.lastScannedAt = null;
          }
          _scanHistory.clear();
          _lastScanResult = null;
        });
        _saveItemsToCache();
      } else if (type == 'SCAN_ACK') {
        if (data['success'] == false) {
          setState(() {
            _lastScanResult = {
              'success': false,
              'code': data['barcode'] ?? '',
              'error': data['error'] ?? 'Không tìm thấy trong kho!',
            };
          });
          HapticFeedback.heavyImpact();
        }
      }
    } catch (e) {
      debugPrint('[StockSync Sync Error]: $e');
    }
  }

  // --- Scan Trigger ---
  void _onDetect(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final String? raw = barcode.rawValue?.trim();
      if (raw != null && raw.isNotEmpty && raw != _lastScannedCode) {
        // Smart Check: is this a connection QR code for PC Hub?
        final isUrl = raw.startsWith('http://') ||
                      raw.startsWith('https://') ||
                      raw.startsWith('ws://') ||
                      raw.startsWith('wss://') ||
                      raw.contains('/ws') ||
                      raw.startsWith('stocksync://') ||
                      (raw.contains(':3000') && !raw.contains(' '));
        final isJsonConnection = raw.startsWith('{') && (raw.contains('ws') || raw.contains('url') || raw.contains('server') || raw.contains('stocksync'));

        if (isUrl || isJsonConnection) {
          setState(() {
            _lastScannedCode = raw;
          });
          _handleScannedConnectionUrl(raw);
          break;
        }

        setState(() {
          _lastScannedCode = raw;
        });

        // Search & match item locally immediately
        _performLocalScan(raw);
        // Send scan to PC Server (via WebSocket & HTTP fallback)
        _sendScanToServer(raw);

        break;
      }
    }
  }

  void _performLocalScan(String code) {
    final clean = code.replaceAll(RegExp(r'[\s_\-\.\:\/]'), '').toUpperCase();
    InventoryItem? matched;

    for (var it in _items) {
      final k1 = it.cotSP.replaceAll(RegExp(r'[\s_\-\.\:\/]'), '').toUpperCase();
      final k2 = '${it.soRO}${it.maLK}'.replaceAll(RegExp(r'[\s_\-\.\:\/]'), '').toUpperCase();
      final soROClean = it.soRO.replaceAll(RegExp(r'[\s_\-\.\:\/]'), '').toUpperCase();
      final maLKClean = it.maLK.replaceAll(RegExp(r'[\s_\-\.\:\/]'), '').toUpperCase();

      if (clean == k1 || clean == k2 || clean == soROClean || clean == maLKClean || (k1.contains(clean) && clean.length >= 6)) {
        matched = it;
        break;
      }
    }

    setState(() {
      if (matched != null) {
        matched.daQuet = 1;
        matched.trangThai = 'Khớp, Trả Xác';
        matched.lastScannedAt = DateTime.now().toString().substring(11, 19);

        _scanHistory.removeWhere((h) => h['code'] == code);
        _scanHistory.insert(0, {
          'code': code,
          'time': matched.lastScannedAt,
          'name': matched.productName,
          'ro': matched.soRO,
          'lk': matched.maLK,
          'bh': matched.bhDv,
        });

        _lastScanResult = {
          'success': true,
          'code': code,
          'name': matched.productName,
          'ro': matched.soRO,
          'lk': matched.maLK,
        };
        HapticFeedback.lightImpact();
      } else {
        _lastScanResult = {
          'success': false,
          'code': code,
          'error': 'Mã không khớp linh kiện nào trong kho!',
        };
        HapticFeedback.heavyImpact();
      }
    });

    _saveItemsToCache();
  }

  void _handleScannedConnectionUrl(String raw) {
    String input = raw.trim();

    // 1. Support JSON QR Code format
    if (input.startsWith('{')) {
      try {
        final map = json.decode(input);
        input = (map['ws'] ?? map['url'] ?? map['server'] ?? input).toString().trim();
      } catch (_) {}
    }

    // 2. Remove custom protocol prefix if any (stocksync://)
    if (input.startsWith('stocksync://connect?url=')) {
      input = Uri.decodeComponent(input.substring(25));
    } else if (input.startsWith('stocksync://')) {
      input = input.substring(12);
    }

    // 3. Strip query parameters, hash and trailing slashes
    input = input.split('?')[0].split('#')[0].trim();
    while (input.endsWith('/')) {
      input = input.substring(0, input.length - 1);
    }

    // 4. Normalize to WebSocket URL
    String wsUrl = input;
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replaceFirst('https://', 'wss://');
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replaceFirst('http://', 'ws://');
    } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      wsUrl = 'ws://$wsUrl';
    }

    if (!wsUrl.endsWith('/ws')) {
      wsUrl = '$wsUrl/ws';
    }

    // 5. Force reset reconnection flags and disconnect old channel
    _isReconnecting = false;
    try {
      _channel?.sink.close();
      _channel = null;
    } catch (_) {}

    setState(() {
      _serverUrl = wsUrl;
      _isConnected = false;
    });

    _saveServerUrl(wsUrl);
    _connectWebSocket();
    _syncViaHttp(showFeedback: true);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.qr_code_2_rounded, color: Colors.white, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('✅ Đã nhận mã QR kết nối PC!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(wsUrl, style: const TextStyle(fontSize: 11, color: Colors.white70), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF2563EB),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );
    HapticFeedback.mediumImpact();
  }

  void _updateAndConnectServerUrl(String newUrl) {
    _handleScannedConnectionUrl(newUrl);
  }

  void _manualToggleItemScan(InventoryItem item) {
    final String barcode = item.cotSP.isNotEmpty ? item.cotSP : item.soRO;

    if (item.isScanned) {
      // Remove scan
      if (_channel != null && _isConnected) {
        _channel!.sink.add(json.encode({
          'type': 'REMOVE_SCAN',
          'itemId': item.id,
        }));
      }
      try {
        final baseUrl = _getHttpBaseUrl();
        http.post(
          Uri.parse('$baseUrl/api/sync/remove-scan'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({'itemId': item.id}),
        ).catchError((_) {});
      } catch (_) {}

      setState(() {
        item.daQuet = 0;
        item.trangThai = 'Chưa Scan';
        item.lastScannedAt = null;
        _scanHistory.removeWhere((h) => h['code'] == item.cotSP || h['code'] == item.soRO);
      });
    } else {
      // Perform scan
      _sendScanToServer(barcode);

      setState(() {
        item.daQuet = 1;
        item.trangThai = 'Khớp, Trả Xác';
        item.lastScannedAt = DateTime.now().toString().substring(11, 19);
        _scanHistory.insert(0, {
          'code': barcode,
          'time': item.lastScannedAt,
          'name': item.productName,
          'ro': item.soRO,
          'lk': item.maLK,
          'bh': item.bhDv,
        });
      });
      HapticFeedback.lightImpact();
    }

    _saveItemsToCache();
  }

  void _requestFullStateSync() {
    _syncViaHttp(showFeedback: true);
    if (_channel != null && _isConnected) {
      _channel!.sink.add(json.encode({'type': 'REQUEST_FULL_STATE'}));
    } else {
      _connectWebSocket();
    }
  }

  // --- UI Build ---
  @override
  Widget build(BuildContext context) {
    final int totalCount = _items.length;
    final int scannedCount = _items.where((i) => i.isScanned).length;
    final int remainCount = totalCount - scannedCount;
    final double percent = totalCount > 0 ? (scannedCount / totalCount) * 100 : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.qr_code_scanner, size: 18, color: Colors.white),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('StockSync Scanner v1.2.8', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isConnected ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _isConnected ? 'PC Hub: Đã kết nối 2 chiều' : 'Đang kết nối lại PC...',
                        style: TextStyle(
                          fontSize: 11,
                          color: _isConnected ? const Color(0xFF6EE7B7) : const Color(0xFFFDE68A),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            tooltip: 'Đồng bộ lại',
            onPressed: _requestFullStateSync,
          ),
          if (_selectedTabIndex == 0)
            IconButton(
              icon: Icon(
                _isTorchOn ? Icons.flash_on : Icons.flash_off,
                color: _isTorchOn ? Colors.amber : Colors.white,
              ),
              tooltip: 'Bật/Tắt Đèn Flash',
              onPressed: () async {
                try {
                  await _scannerController.toggleTorch();
                  setState(() {
                    _isTorchOn = !_isTorchOn;
                  });
                } catch (_) {}
              },
            ),
          IconButton(
            icon: const Icon(Icons.system_update_rounded),
            tooltip: 'Cập nhật',
            onPressed: () => UpgradeService.checkForUpdate(context),
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedTabIndex,
        children: [
          _buildScannerTab(scannedCount, totalCount, percent),
          _buildInventoryListTab(totalCount, scannedCount, remainCount, percent),
          _buildConnectionSettingsTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTabIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedTabIndex = index;
          });
        },
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.qr_code_scanner_rounded),
            selectedIcon: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF2563EB)),
            label: 'Quét Camera',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('$scannedCount/$totalCount'),
              isLabelVisible: totalCount > 0,
              backgroundColor: const Color(0xFF2563EB),
              child: const Icon(Icons.inventory_2_outlined),
            ),
            selectedIcon: Badge(
              label: Text('$scannedCount/$totalCount'),
              isLabelVisible: totalCount > 0,
              backgroundColor: const Color(0xFF2563EB),
              child: const Icon(Icons.inventory_2_rounded, color: Color(0xFF2563EB)),
            ),
            label: 'Danh Sách Kho',
          ),
          NavigationDestination(
            icon: Icon(
              Icons.wifi_tethering,
              color: _isConnected ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
            ),
            selectedIcon: const Icon(Icons.wifi_tethering, color: Color(0xFF2563EB)),
            label: 'Kết Nối PC',
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 1: CAMERA SCANNER (QUÉT MÃ VẠCH)
  // ==========================================
  Widget _buildScannerTab(int scanned, int total, double percent) {
    return Column(
      children: [
        // Camera Viewport (60% screen)
        Expanded(
          flex: 6,
          child: Stack(
            fit: StackFit.expand,
            children: [
              MobileScanner(
                controller: _scannerController,
                onDetect: _onDetect,
              ),
              // Viewfinder Focus Frame
              Center(
                child: Container(
                  width: 270,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFF38BDF8), width: 2.5),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0284C7).withOpacity(0.2),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      // Scanning Laser Line
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          height: 2,
                          color: const Color(0xFF38BDF8),
                        ),
                      ),
                      Positioned(
                        bottom: 12,
                        left: 0,
                        right: 0,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.6),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Đưa mã vạch hoặc mã QR vào khung',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Top Floating Stats & Connection Status
              Positioned(
                top: 12,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _isConnected ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                            size: 16,
                            color: _isConnected ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isConnected ? 'Đồng bộ PC 2 chiều' : 'Chưa kết nối PC',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          'Đã quét: $scanned/$total (${percent.toStringAsFixed(0)}%)',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Recent Scan Result Overlay (if any)
              if (_lastScanResult != null)
                Positioned(
                  bottom: 12,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _lastScanResult!['success'] == true ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _lastScanResult!['success'] == true ? Icons.check_circle_rounded : Icons.warning_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _lastScanResult!['success'] == true
                                    ? 'ĐÃ KHỚP: ${_lastScanResult!['name'] ?? _lastScanResult!['code']}'
                                    : 'KHÔNG KHỚP / LỖI',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                _lastScanResult!['success'] == true
                                    ? 'RO: ${_lastScanResult!['ro']} • LK: ${_lastScanResult!['lk']}'
                                    : '${_lastScanResult!['error'] ?? 'Không tìm thấy'} (${_lastScanResult!['code']})',
                                style: const TextStyle(color: Colors.white70, fontSize: 11),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white70, size: 18),
                          onPressed: () {
                            setState(() {
                              _lastScanResult = null;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),

        // Bottom History List (40% screen)
        Expanded(
          flex: 4,
          child: Container(
            color: const Color(0xFFF1F5F9),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Lịch sử vừa quét:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF334155))),
                    Text(
                      '${_scanHistory.length} mã gần nhất',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Expanded(
                  child: _scanHistory.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.qr_code_2_rounded, size: 40, color: Colors.grey.shade400),
                              const SizedBox(height: 6),
                              Text('Chưa có mã nào được quét trong ca này', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          itemCount: _scanHistory.length,
                          itemBuilder: (context, index) {
                            final item = _scanHistory[index];
                            final isIW = item['bh'] == 'IW';
                            return Card(
                              elevation: 0,
                              margin: const EdgeInsets.symmetric(vertical: 3),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: BorderSide(color: Colors.grey.shade200),
                              ),
                              child: ListTile(
                                dense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                leading: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: isIW ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.check,
                                    size: 16,
                                    color: isIW ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                                  ),
                                ),
                                title: Text(
                                  item['name']?.isNotEmpty == true ? item['name'] : item['code'],
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                subtitle: Text(
                                  'RO: ${item['ro'] ?? ''} • LK: ${item['lk'] ?? ''}',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontFamily: 'monospace'),
                                ),
                                trailing: Text(
                                  item['time'] ?? '',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                ),
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
    );
  }

  // ==========================================
  // TAB 2: INVENTORY DATA LIST (DANH SÁCH DỮ LIỆU)
  // ==========================================
  Widget _buildInventoryListTab(int total, int scanned, int remain, double percent) {
    // Filter items based on user selection
    final filtered = _items.where((item) {
      // Warranty filter
      if (_filterWarranty == 'OOW' && item.bhDv != 'OOW') return false;
      if (_filterWarranty == 'IW' && item.bhDv != 'IW') return false;

      // Status filter
      if (_filterStatus == 'SCANNED' && !item.isScanned) return false;
      if (_filterStatus == 'UNSCANNED' && item.isScanned) return false;

      // Type filter
      if (_filterType != 'ALL' && item.type != _filterType) return false;

      // Search query
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchName = item.productName.toLowerCase().contains(q);
        final matchRO = item.soRO.toLowerCase().contains(q);
        final matchLK = item.maLK.toLowerCase().contains(q);
        final matchModel = item.model.toLowerCase().contains(q);
        final matchCot = item.cotSP.toLowerCase().contains(q);
        if (!matchName && !matchRO && !matchLK && !matchModel && !matchCot) return false;
      }

      return true;
    }).toList();

    return Column(
      children: [
        // Top Overview Statistics Card
        Container(
          padding: const EdgeInsets.all(14),
          color: Colors.white,
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatPill('Tổng linh kiện', '$total', const Color(0xFF3B82F6), const Color(0xFFEFF6FF)),
                  _buildStatPill('Đã quét (Khớp)', '$scanned', const Color(0xFF10B981), const Color(0xFFECFDF5)),
                  _buildStatPill('Chưa quét', '$remain', const Color(0xFFF59E0B), const Color(0xFFFFFBEB)),
                  _buildStatPill('Tiến độ', '${percent.toStringAsFixed(1)}%', const Color(0xFF6366F1), const Color(0xFFEEF2FF)),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: total > 0 ? scanned / total : 0.0,
                  minHeight: 6,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                ),
              ),
            ],
          ),
        ),

        // Search Box
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          color: Colors.white,
          child: TextField(
            onChanged: (val) {
              setState(() {
                _searchQuery = val.trim();
              });
            },
            decoration: InputDecoration(
              hintText: 'Tìm theo Số RO, Mã LK, Model, Tên linh kiện...',
              hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF64748B)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        setState(() {
                          _searchQuery = '';
                        });
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),

        // Filter Bar (Warranty & Status)
        Container(
          color: Colors.white,
          padding: const EdgeInsets.only(left: 14, right: 14, bottom: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Warranty Filter
                _buildFilterChip('Tất Cả Loại', _filterWarranty == 'ALL', () => setState(() => _filterWarranty = 'ALL')),
                _buildFilterChip('OOW (Hết BH)', _filterWarranty == 'OOW', () => setState(() => _filterWarranty = 'OOW')),
                _buildFilterChip('IW (Bảo Hành)', _filterWarranty == 'IW', () => setState(() => _filterWarranty = 'IW')),
                const VerticalDivider(width: 16),
                // Status Filter
                _buildFilterChip('Tất Cả Trạng Thái', _filterStatus == 'ALL', () => setState(() => _filterStatus = 'ALL')),
                _buildFilterChip('✅ Đã Quét', _filterStatus == 'SCANNED', () => setState(() => _filterStatus = 'SCANNED')),
                _buildFilterChip('⏳ Chưa Quét', _filterStatus == 'UNSCANNED', () => setState(() => _filterStatus = 'UNSCANNED')),
              ],
            ),
          ),
        ),

        const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

        // Item Counter Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          color: const Color(0xFFF8FAFC),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Hiển thị: ${filtered.length} / $total linh kiện',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
              if (!_isConnected)
                const Text(
                  '⚠️ Ngoại tuyến (Offline)',
                  style: TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.bold),
                ),
            ],
          ),
        ),

        // Inventory Items Scrollable List with Pull-to-Refresh
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off_rounded, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 8),
                      Text('Không tìm thấy linh kiện phù hợp bộ lọc', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: () => _syncViaHttp(showFeedback: true),
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Tải lại từ PC'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => _syncViaHttp(showFeedback: true),
                  color: const Color(0xFF2563EB),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(10),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      return _buildInventoryItemCard(item);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildStatPill(String title, String value, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14)),
          Text(title, style: TextStyle(color: color.withOpacity(0.8), fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
        labelStyle: TextStyle(
          fontSize: 11,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? Colors.white : const Color(0xFF475569),
        ),
        selectedColor: const Color(0xFF2563EB),
        backgroundColor: const Color(0xFFF1F5F9),
        side: BorderSide(color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0)),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      ),
    );
  }

  Widget _buildInventoryItemCard(InventoryItem item) {
    final bool isScanned = item.isScanned;
    final bool isIW = item.bhDv == 'IW';

    return Card(
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isScanned ? const Color(0xFF10B981).withOpacity(0.4) : const Color(0xFFE2E8F0),
          width: isScanned ? 1.5 : 1,
        ),
      ),
      color: isScanned ? const Color(0xFFF0FDF4) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Product Name & Model + Badges
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.productName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Model: ${item.model} • Phân loại: ${item.type}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Warranty Badge (IW/OOW)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isIW ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: isIW ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A),
                    ),
                  ),
                  child: Text(
                    item.bhDv,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isIW ? const Color(0xFF166534) : const Color(0xFF92400E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Middle Row: RO & LK Code in Monospace
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: isScanned ? Colors.white.withOpacity(0.8) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Số RO:', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        Text(
                          item.soRO,
                          style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Mã LK:', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        Text(
                          item.maLK,
                          style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Bottom Row: Status Badge & Quick Action Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Scan Status Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isScanned ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isScanned ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                        size: 14,
                        color: isScanned ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isScanned ? 'Đã quét (1/1) ${item.lastScannedAt ?? ''}' : 'Chưa scan (0/1)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isScanned ? FontWeight.bold : FontWeight.w500,
                          color: isScanned ? const Color(0xFF166534) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),

                // Manual Toggle Button
                TextButton.icon(
                  onPressed: () => _manualToggleItemScan(item),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    visualDensity: VisualDensity.compact,
                    foregroundColor: isScanned ? const Color(0xFFDC2626) : const Color(0xFF2563EB),
                  ),
                  icon: Icon(
                    isScanned ? Icons.undo_rounded : Icons.check_rounded,
                    size: 16,
                  ),
                  label: Text(
                    isScanned ? 'Hủy quét' : 'Quét ngay',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 3: CONNECTION SETTINGS (KẾT NỐI PC HUB)
  // ==========================================
  Widget _buildConnectionSettingsTab() {
    final TextEditingController urlCtrl = TextEditingController(text: _serverUrl);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Connection Status Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: _isConnected
                    ? [const Color(0xFF065F46), const Color(0xFF047857)]
                    : [const Color(0xFF991B1B), const Color(0xFFB91C1C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: (_isConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _isConnected ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isConnected ? 'Kết Nối 2 Chiều: ĐANG BẬT' : 'Chưa Kết Nối Máy Chủ',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isConnected
                            ? 'Mọi lượt quét trên máy này hoặc PC sẽ cập nhật tức thời qua lại.'
                            : 'Đang tự động thử kết nối lại mỗi 3 giây...',
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Server URL Configuration
          const Text('Cấu hình địa chỉ Máy chủ / PC Hub:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B))),
          const SizedBox(height: 6),
          const Text(
            'Nhập địa chỉ Cloud hoặc địa chỉ IP mạng nội bộ của máy tính PC (vd: ws://192.168.1.100:3000/ws):',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 10),

          TextField(
            controller: urlCtrl,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              hintText: 'ws://192.168.x.x:3000/ws hoặc wss://...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              prefixIcon: const Icon(Icons.link, color: Color(0xFF64748B)),
            ),
          ),
          const SizedBox(height: 8),

          // Quick Preset Buttons
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              ActionChip(
                avatar: const Icon(Icons.wifi, size: 14, color: Color(0xFF2563EB)),
                label: const Text('Wi-Fi 192.168.1.x', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                backgroundColor: const Color(0xFFEFF6FF),
                onPressed: () {
                  urlCtrl.text = "ws://192.168.1.100:3000/ws";
                },
              ),
              ActionChip(
                avatar: const Icon(Icons.cloud_outlined, size: 14, color: Color(0xFF059669)),
                label: const Text('Cloud Server', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                backgroundColor: const Color(0xFFECFDF5),
                onPressed: () {
                  const defaultCloud = "wss://ais-pre-raxzxcsor7d6q2kcn7kvxc-98361429439.asia-southeast1.run.app/ws";
                  urlCtrl.text = defaultCloud;
                },
              ),
              ActionChip(
                avatar: const Icon(Icons.computer, size: 14, color: Color(0xFF7C3AED)),
                label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                backgroundColor: const Color(0xFFF5F3FF),
                onPressed: () {
                  urlCtrl.text = "ws://10.0.2.2:3000/ws";
                },
              ),
            ],
          ),
          const SizedBox(height: 10),

          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    final val = urlCtrl.text.trim();
                    if (val.isNotEmpty) {
                      _updateAndConnectServerUrl(val);
                    }
                  },
                  icon: const Icon(Icons.save_rounded, size: 18),
                  label: const Text('Lưu & Kết Nối Lại'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: () {
                  const defaultCloud = "wss://ais-pre-raxzxcsor7d6q2kcn7kvxc-98361429439.asia-southeast1.run.app/ws";
                  urlCtrl.text = defaultCloud;
                  _updateAndConnectServerUrl(defaultCloud);
                },
                icon: const Icon(Icons.restore, size: 18),
                label: const Text('Mặc định'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),

          if (!_isConnected) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                border: Border.all(color: const Color(0xFFFDE68A)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('💡 Hướng Dẫn Kết Nối Với Máy Tính PC:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF92400E))),
                  SizedBox(height: 4),
                  Text('1. Điện thoại và PC cần kết nối chung một mạng Wi-Fi (hoặc phát điểm truy cập Hotspot từ điện thoại).', style: TextStyle(fontSize: 11, color: Color(0xFF78350F))),
                  SizedBox(height: 2),
                  Text('2. Trên PC, mở mục "Cài đặt App" -> Quét mã QR bằng camera app StockSync.', style: TextStyle(fontSize: 11, color: Color(0xFF78350F))),
                  SizedBox(height: 2),
                  Text('3. Hoặc xem IPv4 của PC (bằng lệnh ipconfig trên Windows) và nhập dạng: ws://[IP-PC]:3000/ws.', style: TextStyle(fontSize: 11, color: Color(0xFF78350F))),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // Actions
          const Text('Thao tác nhanh:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B))),
          const SizedBox(height: 10),

          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
            leading: const Icon(Icons.qr_code_scanner, color: Color(0xFF2563EB)),
            title: const Text('Quét mã QR kết nối trên màn hình PC', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text('Bật camera và hướng vào mã QR hiển thị ở mục "Cài đặt App" trên PC', style: TextStyle(fontSize: 11)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () {
              setState(() {
                _selectedTabIndex = 0; // Switch to scanner tab
              });
            },
          ),
          const SizedBox(height: 8),

          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
            leading: const Icon(Icons.refresh_rounded, color: Color(0xFF10B981)),
            title: const Text('Đồng bộ lại toàn bộ dữ liệu (Sync Full State)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text('Tải lại danh sách 312 linh kiện mới nhất từ máy chủ trung tâm', style: TextStyle(fontSize: 11)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: _requestFullStateSync,
          ),
          const SizedBox(height: 8),

          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
            leading: const Icon(Icons.system_update_rounded, color: Color(0xFF6366F1)),
            title: const Text('Kiểm tra bản cập nhật mới (GitHub Releases)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text('Phiên bản hiện tại: v1.2.8 (Build 128)', style: TextStyle(fontSize: 11)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () => UpgradeService.checkForUpdate(context),
          ),
        ],
      ),
    );
  }
}
