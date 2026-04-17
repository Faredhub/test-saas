"use client";

/**
 * Browser-native WebRTC peer connection wrapper.
 * Uses Google's free STUN servers for NAT traversal.
 * Audio/video flows peer-to-peer once the connection is established.
 */
export class PeerConnection {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private screenSender: RTCRtpSender | null = null;

  constructor(config?: RTCConfiguration) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      ...config,
    });
  }

  /** Acquire the local camera/mic stream and add tracks to the connection. */
  async startLocalStream(video: boolean): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video
        ? { width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    });
    for (const track of this.localStream.getTracks()) {
      this.pc.addTrack(track, this.localStream);
    }
    return this.localStream;
  }

  /** Create an SDP offer (caller side). */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /** Create an SDP answer after receiving the remote offer (callee side). */
  async createAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /** Apply the remote SDP description (caller applies answer). */
  async setRemoteDescription(
    desc: RTCSessionDescriptionInit
  ): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  }

  /** Add a trickled ICE candidate from the remote peer. */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /** Register a callback for when the remote media stream arrives. */
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        callback(event.streams[0]);
      }
    };
  }

  /** Register a callback for local ICE candidates to send to the remote peer. */
  onIceCandidate(
    callback: (candidate: RTCIceCandidateInit) => void
  ): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        callback(event.candidate.toJSON());
      }
    };
  }

  /** Register a callback for connection state changes. */
  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.pc.onconnectionstatechange = () => {
      callback(this.pc.connectionState);
    };
  }

  /** Start sharing the screen, replacing the video track. */
  async startScreenShare(): Promise<MediaStream> {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const screenTrack = this.screenStream.getVideoTracks()[0];

    // Replace the camera video track with the screen track
    const sender = this.pc
      .getSenders()
      .find((s) => s.track?.kind === "video");
    if (sender) {
      this.screenSender = sender;
      await sender.replaceTrack(screenTrack);
    }

    // When user stops sharing via browser UI, revert to camera
    screenTrack.onended = () => {
      this.stopScreenShare();
    };

    return this.screenStream;
  }

  /** Stop screen sharing and revert to the camera track. */
  stopScreenShare(): void {
    if (this.screenStream) {
      for (const track of this.screenStream.getTracks()) {
        track.stop();
      }
      this.screenStream = null;
    }

    // Restore camera video track
    if (this.screenSender && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      if (cameraTrack) {
        this.screenSender.replaceTrack(cameraTrack);
      }
      this.screenSender = null;
    }
  }

  /** Mute or unmute the local audio track. */
  toggleAudio(muted: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
  }

  /** Mute or unmute the local video track. */
  toggleVideo(muted: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = !muted;
      }
    }
  }

  /** Get the underlying RTCPeerConnection (for advanced use). */
  getRtcConnection(): RTCPeerConnection {
    return this.pc;
  }

  /** Tear down streams and close the connection. */
  close(): void {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    this.stopScreenShare();
    this.pc.close();
  }
}
