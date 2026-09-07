import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, 
  UploadCloud, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  Car, 
  Route, 
  Clock, 
  Zap, 
  Film, 
  Trash2, 
  Compass, 
  Radio, 
  Check, 
  AlertCircle,
  FileVideo
} from 'lucide-react';
import { api } from '../services/api';
import { Camera } from '../types';

interface VideoFileItem {
  id: string;
  file: File;
  previewUrl: string;
  cameraId: string;
}

interface DetectionResult {
  detection_id: number;
  camera_id: string;
  plate: string;
  confidence: number;
  frame_offset: number;
}

interface TrackingJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  target_plate: string;
  results?: DetectionResult[];
  error?: string;
}

export default function VideoIngestion() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [targetPlate, setTargetPlate] = useState('AP39AB1234');
  const [selectedVideos, setSelectedVideos] = useState<VideoFileItem[]>([]);
  const [defaultCameraId, setDefaultCameraId] = useState('CAM-VIS-001');
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<TrackingJobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<any>(null);

  // Load available camera sensor nodes
  useEffect(() => {
    api.get<Camera[]>('/cameras')
      .then(res => {
        setCameras(res);
        if (res.length > 0) {
          setDefaultCameraId(res[0].id);
        }
      })
      .catch(err => console.error('Failed to load cameras:', err));
  }, []);

  // Poll for background job completion
  useEffect(() => {
    if (!jobId || jobStatus?.status === 'completed' || jobStatus?.status === 'failed') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const statusData = await api.get<TrackingJobResponse>(`/video-tracking/jobs/${jobId}`);
        setJobStatus(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setIsUploading(false);
          clearInterval(pollTimerRef.current);
        }
      } catch (err: any) {
        console.error('Job status check failed:', err);
      }
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobId, jobStatus?.status]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newItems: VideoFileItem[] = files.map((file, idx) => {
      // Pick consecutive cameras or default
      const cam = cameras[idx % (cameras.length || 1)]?.id || defaultCameraId;
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        cameraId: cam
      };
    });

    setSelectedVideos(prev => [...prev, ...newItems]);
    if (!activePreviewUrl && newItems.length > 0) {
      setActivePreviewUrl(newItems[0].previewUrl);
    }
  };

  const handleCameraChange = (id: string, newCamId: string) => {
    setSelectedVideos(prev => prev.map(v => v.id === id ? { ...v, cameraId: newCamId } : v));
  };

  const handleRemoveVideo = (id: string) => {
    setSelectedVideos(prev => {
      const filtered = prev.filter(v => v.id !== id);
      if (activePreviewUrl && prev.find(v => v.id === id)?.previewUrl === activePreviewUrl) {
        setActivePreviewUrl(filtered.length > 0 ? filtered[0].previewUrl : null);
      }
      return filtered;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedVideos.length === 0) {
      setErrorMessage('Please upload or select at least one video file.');
      return;
    }

    try {
      setIsUploading(true);
      setJobStatus(null);
      setJobId(null);

      const formData = new FormData();
      formData.append('target_plate', targetPlate.trim() || 'ALL');

      selectedVideos.forEach(item => {
        formData.append('videos', item.file);
        formData.append('camera_ids', item.cameraId);
      });

      const response = await api.post<any>('/video-tracking/track', formData);
      setJobId(response.job_id);
      setJobStatus({
        job_id: response.job_id,
        status: 'processing',
        target_plate: response.target_plate,
        results: []
      });
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to submit video processing job.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/90 border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
              <Film className="w-5 h-5 text-cyan-600" />
              <span>CCTV Video Ingestion & Trajectory Tracking</span>
            </h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-mono font-bold">
              OPENCV 1-FPS PIPELINE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Feed multi-camera CCTV MP4 clips to run automated Indian ANPR extraction, vehicle matching, and instant trajectory updates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/anpr"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center space-x-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-600" />
            <span>ANPR Snapshots Lab</span>
          </Link>
          <Link
            to="/trajectory"
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/20"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Trajectory Map</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Grid: Upload & Controls on Left, Video Player & Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Form & Uploaded Files */}
        <div className="lg:col-span-6 space-y-5">
          <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-sm">
            
            {/* Target Plate Configuration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
                Target License Plate To Track
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={targetPlate}
                  onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. AP39AB1234 or ALL"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setTargetPlate('AP39AB1234')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold border border-slate-300 transition"
                  title="Load demo target vehicle"
                >
                  Demo Plate
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPlate('ALL')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold border border-slate-300 transition"
                  title="Detect all passing vehicles in video"
                >
                  All Vehicles
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter a specific plate to reconstruct its path, or enter <code className="text-cyan-600 font-bold">ALL</code> to ingest every vehicle read.
              </p>
            </div>

            {/* Drop Zone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
                Select Video Footage (.mp4, .mov, .avi)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-cyan-50/30 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition shadow-sm mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Click to browse or drag and drop video files
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Supports MP4, MOV, AVI, WEBM (multiple files supported for multi-corridor tracking)
                </div>
              </div>
            </div>

            {/* Selected Files List with Camera Assignment */}
            {selectedVideos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    QUEUED VIDEOS ({selectedVideos.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedVideos([])}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedVideos.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div 
                        className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer pr-2"
                        onClick={() => setActivePreviewUrl(item.previewUrl)}
                      >
                        <FileVideo className="w-4 h-4 text-cyan-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 truncate">{item.file.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {(item.file.size / (1024 * 1024)).toFixed(1)} MB • Click to preview
                          </div>
                        </div>
                      </div>

                      {/* Camera Selector for this file */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <select
                          value={item.cameraId}
                          onChange={(e) => handleCameraChange(item.id, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium text-slate-700 focus:ring-1 focus:ring-cyan-500"
                        >
                          {cameras.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.id} ({c.name.split('-')[0].trim()})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remove video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Ingestion Submit Button */}
            <button
              type="submit"
              disabled={isUploading || selectedVideos.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wide transition flex items-center justify-center space-x-2 shadow-md ${
                isUploading || selectedVideos.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-cyan-600/30'
              }`}
            >
              {isUploading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Processing Frames with OpenCV & ANPR...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Start Video Ingestion ({selectedVideos.length} Video{selectedVideos.length !== 1 ? 's' : ''})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: In-Browser Video Player & Live Detections */}
        <div className="lg:col-span-6 space-y-5">
          {/* Video Player */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Play className="w-3.5 h-3.5 text-cyan-600" />
                <span>Footage Preview Monitor</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Edge Ingestion Stream</span>
            </div>

            {activePreviewUrl ? (
              <div className="rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                <video
                  src={activePreviewUrl}
                  controls
                  className="w-full max-h-[300px] object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="h-56 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-2 p-6 text-center">
                <Film className="w-8 h-8 text-slate-600" />
                <span className="text-xs font-mono">No video selected for playback preview</span>
                <span className="text-[11px] text-slate-600">
                  Select or upload an MP4 file on the left to preview it here
                </span>
              </div>
            )}
          </div>

          {/* Real-Time Processing Status & Detected Results */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                <span>Detection & Trajectory Results</span>
              </span>

              {jobStatus && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  jobStatus.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                  jobStatus.status === 'processing' ? 'bg-cyan-100 text-cyan-700 border border-cyan-300 animate-pulse' :
                  jobStatus.status === 'failed' ? 'bg-rose-100 text-rose-700 border border-rose-300' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  Status: {jobStatus.status}
                </span>
              )}
            </div>

            {/* Ingestion in Progress Banner */}
            {jobStatus?.status === 'processing' && (
              <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-cyan-800 font-bold font-mono">
                  <Activity className="w-4 h-4 animate-spin text-cyan-600" />
                  <span>ANALYZING VIDEO FRAMES...</span>
                </div>
                <p className="text-[11px] text-cyan-700 leading-relaxed">
                  FastAPI background worker is sampling frames at 1 FPS, applying OpenCV contrast/denoise, running ANPR character recognition, and cross-referencing watchlists.
                </p>
              </div>
            )}

            {/* Completed Results List */}
            {jobStatus?.status === 'completed' && (
              <div className="space-y-3">
                {jobStatus.results && jobStatus.results.length > 0 ? (
                  <>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <span className="font-bold font-mono">
                        ✓ MATCH FOUND: {jobStatus.results.length} detection(s) registered
                      </span>
                      <Link
                        to={`/trajectory?plate=${jobStatus.results[0].plate}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition inline-flex items-center space-x-1"
                      >
                        <span>View Route on Map</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {jobStatus.results.map((res, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-sm text-cyan-700">
                                {res.plate}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                                {Math.round(res.confidence * 100)}% Conf
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Camera: <b className="text-slate-700">{res.camera_id}</b> • Offset: <b className="text-slate-700">{res.frame_offset}s</b>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/vehicles/${res.plate}`}
                              className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-semibold transition"
                            >
                              Profile
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>No matching plate detected in this video clip</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      The OCR confidence did not meet threshold or the specified plate was not visible in sampled frames. Try setting target plate to <code className="font-bold">ALL</code> to inspect any partial reads.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!jobStatus && (
              <div className="py-8 text-center text-slate-400 text-xs font-mono space-y-1">
                <Clock className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                <div>Awaiting video submission</div>
                <div className="text-[10px] text-slate-400">
                  Upload video footage and click "Start Video Ingestion" to view detections
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
