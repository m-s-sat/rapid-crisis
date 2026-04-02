import type { MediaCapture } from "../types/sensor.types.js";

const PLACEHOLDER_PHOTO = Buffer.from("SIMULATED_JPEG_PHOTO_DATA").toString("base64");
const PLACEHOLDER_VIDEO = Buffer.from("SIMULATED_MP4_VIDEO_DATA").toString("base64");
const PLACEHOLDER_AUDIO = Buffer.from("SIMULATED_WAV_AUDIO_DATA").toString("base64");

export function capturePhoto(): string {
    return PLACEHOLDER_PHOTO;
}

export function captureVideo(): string {
    return PLACEHOLDER_VIDEO;
}

export function captureAudio(): string {
    return PLACEHOLDER_AUDIO;
}

export function captureAllMedia(): MediaCapture {
    return {
        photo: capturePhoto(),
        video: captureVideo(),
        audio: captureAudio(),
    };
}
