import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, Trash2, AlertCircle } from 'lucide-react';

const OdometerOCRSystem = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check for camera support on component mount
  useEffect(() => {
    checkCameraSupport();
  }, []);

  const checkCameraSupport = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS (except on localhost)');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }
    } catch (err) {
      setError(`Camera initialization error: ${err.message}`);
      console.error('Camera support check failed:', err);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            resolve();
          };
        });
        
        await videoRef.current.play();
        setIsScanning(true);
      } else {
        throw new Error('Video element not initialized');
      }
    } catch (err) {
      setError(`Error accessing camera: ${err.message}`);
      console.error('Camera start error:', err);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const captureAndProcess = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const simulatedReading = Math.floor(Math.random() * 100000);
      setOcrResult(simulatedReading.toString());

      const newReading = {
        id: Date.now(),
        reading: simulatedReading,
        timestamp: new Date().toLocaleString(),
        imageSrc: imageData
      };

      setReadings([newReading, ...readings]);
    } catch (err) {
      setError('Error processing image - please try again');
      console.error("Processing Error:", err);
    }

    setIsProcessing(false);
    stopCamera();
  };

  const deleteReading = (id) => {
    setReadings(readings.filter(reading => reading.id !== id));
  };

  const exportReadings = () => {
    const csv = readings
      .map(r => `${r.timestamp},${r.reading}`)
      .join('\n');
    const blob = new Blob([`Timestamp,Reading\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odometer-readings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container my-5">
      <div className="card mx-auto" style={{ maxWidth: '800px' }}>
        <div className="card-header">
          <h2 className="h4">Odometer Scanner</h2>
          <p className="text-muted">Align odometer numbers within the blue guide and capture</p>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <AlertCircle className="me-2" size={20} />
              <div>{error}</div>
            </div>
          )}

          <div className="position-relative" style={{ aspectRatio: '16/9' }}>
            {isScanning ? (
              <>
                <video ref={videoRef} autoPlay muted className="w-100 h-100 object-cover" />
                <div className="position-absolute top-0 start-25 end-25 bottom-0 border border-primary opacity-50" />
              </>
            ) : capturedImage ? (
              <img src={capturedImage} alt="Captured" className="w-100 h-100 object-cover" />
            ) : (
              <div className="d-flex align-items-center justify-content-center w-100 h-100 text-muted">
                Camera preview will appear here
              </div>
            )}
          </div>

          {ocrResult && (
            <div className="my-4 text-center">
              <h5>Detected Reading:</h5>
              <p className="display-4 text-primary">{ocrResult}</p>
            </div>
          )}

          <div className="d-flex justify-content-center gap-4">
            {!isScanning ? (
              <button
                onClick={startCamera}
                className="btn btn-primary"
                disabled={isProcessing}
              >
                <Camera size={20} /> Start Scanning
              </button>
            ) : (
              <>
                <button
                  onClick={captureAndProcess}
                  className="btn btn-success"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Capture & Read'}
                </button>
                <button
                  onClick={stopCamera}
                  className="btn btn-danger"
                  disabled={isProcessing}
                >
                  Stop
                </button>
              </>
            )}
          </div>

          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5>Reading History</h5>
              {readings.length > 0 && (
                <button
                  onClick={exportReadings}
                  className="btn btn-success btn-sm"
                >
                  <Save size={16} /> Export CSV
                </button>
              )}
            </div>
            <div className="row row-cols-1 row-cols-md-2 g-4">
              {readings.map((reading) => (
                <div key={reading.id} className="col">
                  <div className="card">
                    <img
                      src={reading.imageSrc}
                      alt={`Scan from ${reading.timestamp}`}
                      className="card-img-top"
                    />
                    <div className="card-body">
                      <h5 className="card-title">{reading.reading} km</h5>
                      <p className="card-text text-muted">{reading.timestamp}</p>
                      <button
                        onClick={() => deleteReading(reading.id)}
                        className="btn btn-outline-danger btn-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OdometerOCRSystem;
