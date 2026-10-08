/**
 * SoundFeedback - Mute / Silent feedback for warehouse scanning
 * (Đã xóa toàn bộ âm thanh loa bip bip theo yêu cầu người dùng)
 */

class SoundFeedback {
  private soundEnabled: boolean = false;

  constructor() {
    this.soundEnabled = false;
  }

  public setSoundEnabled(_enabled: boolean) {
    this.soundEnabled = false;
  }

  public isSoundEnabled(): boolean {
    return false;
  }

  /**
   * Đã tắt âm thanh quét thành công
   */
  public playSuccess() {
    // Silent - no beep
  }

  /**
   * Đã tắt âm thanh cảnh báo trùng phiếu
   */
  public playWarning() {
    // Silent - no beep
  }

  /**
   * Đã tắt âm thanh buzzer lỗi
   */
  public playError() {
    // Silent - no beep
  }

  /**
   * Đã tắt âm thanh hoàn thành 100%
   */
  public playCompletion() {
    // Silent - no beep
  }
}

export const soundManager = new SoundFeedback();

