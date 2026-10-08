/**
 * GitHub Release Synchronization & Auto-Update Service
 * Tự động kiểm tra bản phát hành mới trên GitHub, lấy link tải trực tiếp từ GitHub CDN (tốc độ cao, không lỗi),
 * và thông báo cập nhật cho người dùng.
 */

export interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
  download_count: number;
  updated_at: string;
}

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  assets: GitHubAsset[];
  
  // Parsed direct download URLs
  apkUrl?: string;
  apkSize?: number;
  windowsExeUrl?: string;
  windowsExeSize?: number;
  linuxAppImageUrl?: string;
  linuxAppImageSize?: number;
  linuxDebUrl?: string;
  linuxDebSize?: number;
  windowsZipUrl?: string;
  
  // Version status
  isNewer: boolean;
  versionNumber: string;
}

export const GITHUB_REPO = 'Lio0307-Oanh-PhiLip/StockSync-Hub';
export const CURRENT_APP_VERSION = '1.3.0'; // Phiên bản v1.3.0 đồng bộ 2 chiều PC & APK

let cachedRelease: ReleaseInfo | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 2 * 60 * 1000; // Cache 2 phút tránh giới hạn GitHub API

/**
 * So sánh 2 phiên bản dạng semver (ví dụ: '1.2.9' > '1.2.8')
 */
export function isVersionNewer(remote: string, current: string): boolean {
  const cleanRemote = remote.replace(/^v/, '').trim();
  const cleanCurrent = current.replace(/^v/, '').trim();

  const rParts = cleanRemote.split('.').map(n => parseInt(n, 10) || 0);
  const cParts = cleanCurrent.split('.').map(n => parseInt(n, 10) || 0);

  const len = Math.max(rParts.length, cParts.length);
  for (let i = 0; i < len; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Lấy thông tin bản phát hành mới nhất từ GitHub API
 */
export async function fetchLatestRelease(force: boolean = false): Promise<ReleaseInfo | null> {
  const now = Date.now();
  if (!force && cachedRelease && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return cachedRelease;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    let data: any = null;
    if (res.ok) {
      data = await res.json();
    } else {
      // Fallback: nếu /releases/latest lỗi (hoặc chưa có tag latest), lấy danh sách releases
      const listRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=1`);
      if (listRes.ok) {
        const list = await listRes.json();
        if (Array.isArray(list) && list.length > 0) {
          data = list[0];
        }
      }
    }

    if (!data) return cachedRelease;

    const rawTag = (data.tag_name || '').trim();
    const cleanTag = rawTag.replace(/^v/, '');
    const assets: GitHubAsset[] = Array.isArray(data.assets) ? data.assets : [];

    // Tìm asset phù hợp theo nền tảng
    const apkAsset = assets.find(a => a.name.toLowerCase().endsWith('.apk'));
    const winExeAsset = assets.find(a => a.name.toLowerCase().endsWith('.exe'));
    const linuxAppImageAsset = assets.find(a => a.name.toLowerCase().endsWith('.appimage'));
    const linuxDebAsset = assets.find(a => a.name.toLowerCase().endsWith('.deb'));
    const winZipAsset = assets.find(a => a.name.toLowerCase().endsWith('.zip'));

    const releaseInfo: ReleaseInfo = {
      tag_name: rawTag || `v${cleanTag}`,
      name: data.name || `StockSync ${rawTag}`,
      published_at: data.published_at || new Date().toISOString(),
      html_url: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
      body: data.body || '',
      assets,
      versionNumber: cleanTag,
      isNewer: isVersionNewer(cleanTag, CURRENT_APP_VERSION),

      // Direct CDN download URLs
      apkUrl: apkAsset?.browser_download_url,
      apkSize: apkAsset?.size,
      windowsExeUrl: winExeAsset?.browser_download_url,
      windowsExeSize: winExeAsset?.size,
      linuxAppImageUrl: linuxAppImageAsset?.browser_download_url,
      linuxAppImageSize: linuxAppImageAsset?.size,
      linuxDebUrl: linuxDebAsset?.browser_download_url,
      linuxDebSize: linuxDebAsset?.size,
      windowsZipUrl: winZipAsset?.browser_download_url
    };

    cachedRelease = releaseInfo;
    lastFetchTime = now;
    return releaseInfo;
  } catch (err) {
    console.warn('[GitHubReleaseService] Lỗi khi kết nối GitHub Releases:', err);
    return cachedRelease;
  }
}
