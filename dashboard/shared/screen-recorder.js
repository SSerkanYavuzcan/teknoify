const MIME_TYPE_CANDIDATES = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=h264,aac",
    "video/mp4"
];
const MAX_DURATION_SECONDS = 300;
const WARNING_SECONDS = 270;
const MAX_RECORDING_BYTES = 150 * 1024 * 1024;

export function selectBestRecordingMimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") return "";
    return MIME_TYPE_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function createScreenRecorderController(options = {}) {
    return new ScreenRecorderController(options);
}

class ScreenRecorderController {
    constructor({ onStateChange = () => {}, onRecordingReady = () => {}, onError = () => {}, onNotice = () => {} } = {}) {
        this.callbacks = { onStateChange, onRecordingReady, onError, onNotice };
        this.state = "idle";
        this.displayStream = null;
        this.microphoneStream = null;
        this.recordingStream = null;
        this.audioContext = null;
        this.recorder = null;
        this.chunks = [];
        this.countdownTimer = null;
        this.timerInterval = null;
        this.countdownValue = 0;
        this.durationSeconds = 0;
        this.finalMimeType = "";
        this.stopPromise = null;
        this.cancelRequested = false;
        this.maxNoticeShown = false;
    }

    static isSupported() {
        return Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder);
    }

    getState() { return this.state; }
    isBusy() { return ["requesting", "countdown", "recording", "paused", "stopping"].includes(this.state); }

    setState(state, extra = {}) {
        this.state = state;
        this.callbacks.onStateChange({ state, countdown: this.countdownValue, durationSeconds: this.durationSeconds, ...extra });
    }

    openSetup() {
        if (this.isBusy()) return false;
        this.setState("setup");
        return true;
    }

    async start({ includeMicrophone = true } = {}) {
        if (!["setup", "idle", "error"].includes(this.state)) return;
        this.cancelRequested = false;
        this.maxNoticeShown = false;
        this.chunks = [];
        this.durationSeconds = 0;
        this.setState("requesting");
        try {
            this.displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            if (includeMicrophone) {
                try {
                    this.microphoneStream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                    });
                } catch (error) {
                    this.cleanupMedia();
                    this.setState("setup");
                    this.callbacks.onError("Mikrofon izni verilmedi. Yalnızca Ekran seçeneğiyle devam edebilirsiniz.", error);
                    return;
                }
            }
            this.recordingStream = await this.createRecordingStream();
            const videoTrack = this.displayStream.getVideoTracks()[0];
            if (videoTrack) videoTrack.addEventListener("ended", () => this.stop("native"), { once: true });
            this.startCountdown();
        } catch (error) {
            this.cleanupMedia();
            this.setState("setup");
            this.callbacks.onError(this.mapCaptureError(error), error);
        }
    }

    async createRecordingStream() {
        const tracks = [];
        const displayVideo = this.displayStream.getVideoTracks()[0];
        if (displayVideo) tracks.push(displayVideo);
        const audioTracks = [
            ...this.displayStream.getAudioTracks(),
            ...(this.microphoneStream ? this.microphoneStream.getAudioTracks() : [])
        ];
        if (audioTracks.length > 1) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            const destination = this.audioContext.createMediaStreamDestination();
            audioTracks.forEach((track) => this.audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination));
            tracks.push(...destination.stream.getAudioTracks());
        } else if (audioTracks.length === 1) {
            tracks.push(audioTracks[0]);
        }
        return new MediaStream(tracks);
    }

    startCountdown() {
        this.countdownValue = 3;
        this.setState("countdown");
        this.countdownTimer = window.setInterval(() => {
            this.countdownValue -= 1;
            if (this.countdownValue > 0) {
                this.setState("countdown");
                return;
            }
            window.clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            this.beginRecording();
        }, 1000);
    }

    beginRecording() {
        if (this.cancelRequested) return;
        try {
            const selectedMimeType = selectBestRecordingMimeType();
            this.recorder = selectedMimeType ? new MediaRecorder(this.recordingStream, { mimeType: selectedMimeType }) : new MediaRecorder(this.recordingStream);
            this.finalMimeType = this.recorder.mimeType || selectedMimeType || "video/webm";
        } catch (error) {
            this.cleanupMedia();
            this.setState("setup");
            this.callbacks.onError("Bu tarayıcı seçilen kayıt biçimini başlatamadı.", error);
            return;
        }
        this.recorder.ondataavailable = (event) => { if (event.data && event.data.size > 0) this.chunks.push(event.data); };
        this.recorder.onstop = () => this.finalizeRecording();
        this.recorder.start(1000);
        this.setState("recording");
        this.startTimer();
    }

    startTimer() {
        this.clearTimer();
        this.timerInterval = window.setInterval(() => {
            if (this.state !== "recording") return;
            this.durationSeconds += 1;
            if (this.durationSeconds === WARNING_SECONDS && !this.maxNoticeShown) {
                this.maxNoticeShown = true;
                this.callbacks.onNotice("Kaydın bitmesine 30 saniye kaldı.");
            }
            this.callbacks.onStateChange({ state: this.state, durationSeconds: this.durationSeconds });
            if (this.durationSeconds >= MAX_DURATION_SECONDS) {
                this.callbacks.onNotice("Maksimum 5 dakikalık kayıt süresine ulaşıldı.");
                this.stop("max-duration");
            }
        }, 1000);
    }

    pause() { if (this.state === "recording" && this.recorder?.state === "recording") { this.recorder.pause(); this.setState("paused"); } }
    resume() { if (this.state === "paused" && this.recorder?.state === "paused") { this.recorder.resume(); this.setState("recording"); } }

    stop() {
        if (this.stopPromise) return this.stopPromise;
        if (!["recording", "paused", "countdown", "stopping"].includes(this.state)) return Promise.resolve();
        this.setState("stopping");
        if (this.countdownTimer) {
            window.clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            this.cleanupMedia();
            this.setState("setup");
            return Promise.resolve();
        }
        this.stopPromise = new Promise((resolve) => {
            const finish = () => { this.stopPromise = null; resolve(); };
            if (this.recorder && this.recorder.state !== "inactive") {
                const original = this.recorder.onstop;
                this.recorder.onstop = (event) => { if (original) original.call(this.recorder, event); finish(); };
                this.recorder.stop();
            } else { this.finalizeRecording(); finish(); }
        });
        return this.stopPromise;
    }

    cancel() {
        this.cancelRequested = true;
        this.chunks = [];
        if (this.countdownTimer) window.clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        if (this.recorder && this.recorder.state !== "inactive") {
            this.recorder.onstop = null;
            this.recorder.stop();
        }
        this.cleanupMedia();
        this.setState("setup");
    }

    finalizeRecording() {
        this.clearTimer();
        const chunks = this.cancelRequested ? [] : this.chunks.slice();
        this.chunks = [];
        this.cleanupMedia();
        if (!chunks.length) { this.setState("setup"); return; }
        const blob = new Blob(chunks, { type: this.finalMimeType || "video/webm" });
        if (blob.size > MAX_RECORDING_BYTES) {
            this.setState("setup");
            this.callbacks.onError("Ekran kaydı 150 MB sınırını aşıyor. Daha kısa bir kayıt oluşturun.");
            return;
        }
        const mimeType = blob.type || this.finalMimeType || "video/webm";
        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `teknoify-ekran-kaydi-${this.timestamp()}.${extension}`, { type: mimeType, lastModified: Date.now() });
        this.setState("preview", { file, mimeType, durationSeconds: this.durationSeconds });
        this.callbacks.onRecordingReady({ file, blob, durationSeconds: this.durationSeconds, mimeType });
    }

    cleanupMedia() {
        [this.displayStream, this.microphoneStream, this.recordingStream].forEach((stream) => stream?.getTracks().forEach((track) => { if (track.readyState !== "ended") track.stop(); }));
        this.displayStream = null; this.microphoneStream = null; this.recordingStream = null; this.recorder = null;
        if (this.audioContext && this.audioContext.state !== "closed") this.audioContext.close().catch(() => {});
        this.audioContext = null;
        this.clearTimer();
    }

    clearTimer() { if (this.timerInterval) window.clearInterval(this.timerInterval); this.timerInterval = null; }
    destroy() { this.cancelRequested = true; if (this.countdownTimer) window.clearInterval(this.countdownTimer); this.cleanupMedia(); this.chunks = []; this.setState("idle"); }
    timestamp() { return new Date().toISOString().slice(0, 19).replace("T", "-").replaceAll(":", "-"); }
    mapCaptureError(error) {
        if (error?.name === "NotAllowedError") return "Ekran paylaşımı başlatılmadı.";
        if (error?.name === "NotFoundError") return "Paylaşılabilecek bir ekran veya pencere bulunamadı.";
        if (error?.name === "NotReadableError") return "Seçilen ekran kaynağı şu anda kullanılamıyor.";
        if (error?.name === "AbortError") return "Ekran kaydı işlemi iptal edildi.";
        return "Ekran kaydı sırasında bir sorun oluştu. Lütfen tekrar deneyin.";
    }
}
