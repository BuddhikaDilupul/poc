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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setCapturedImage(null);
      setOcrResult('');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS (except on localhost)');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      videoRef.current.srcObject = stream;
      
      await new Promise((resolve, reject) => {
        videoRef.current.onloadedmetadata = resolve;
        videoRef.current.onerror = reject;
        
        const timeoutId = setTimeout(() => {
          reject(new Error('Video stream timed out'));
        }, 5000);
        
        videoRef.current.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });

      await videoRef.current.play();
      setIsScanning(true);
      
    } catch (err) {
      let errorMessage = 'Error accessing camera: ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      console.error('Camera start error:', err);
      setIsScanning(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
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
    if (!videoRef.current || !videoRef.current.videoWidth) {
      setError('Camera not ready. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);

      await new Promise(resolve => setTimeout(resolve, 1000));
      const simulatedReading = Math.floor(Math.random() * 100000);
      
      setOcrResult(simulatedReading.toString());
      
      const newReading = {
        id: Date.now(),
        reading: simulatedReading,
        timestamp: new Date().toLocaleString(),
        imageSrc: imageData
      };
      
      setReadings(prevReadings => [newReading, ...prevReadings]);
      
    } catch (err) {
      setError('Failed to capture and process image: ' + (err.message || 'Unknown error'));
      console.error('Capture error:', err);
    } finally {
      setIsProcessing(false);
      stopCamera();
    }
  };

  const deleteReading = (id) => {
    setReadings(prevReadings => prevReadings.filter(reading => reading.id !== id));
  };

  const exportReadings = () => {
    try {
      const csv = ['Timestamp,Reading'];
      readings.forEach(r => {
        csv.push(`${r.timestamp},${r.reading}`);
      });
      
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `odometer-readings-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export readings: ' + (err.message || 'Unknown error'));
      console.error('Export error:', err);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title h4 mb-0">Odometer Scanner</h2>
          <p className="text-muted small mb-0">
            Align odometer numbers within the blue guide and capture
          </p>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <AlertCircle className="me-2" size={20} />
              <div>{error}</div>
            </div>
          )}

          <div className="position-relative bg-light rounded overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {isScanning ? (
              <>
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-100 h-100 object-fit-cover"
                />
                <div className="position-absolute top-0 start-0 w-100 h-100">
                  <div className="position-absolute" style={{ 
                    left: '25%', 
                    right: '25%', 
                    top: '33%', 
                    bottom: '33%', 
                    border: '2px solid #0d6efd' 
                  }}>
                    <div className="position-absolute w-100 h-100" style={{
                      borderTop: '2px solid #0d6efd',
                      borderBottom: '2px solid #0d6efd',
                      opacity: 0.5
                    }} />
                  </div>
                </div>
              </>
            ) : capturedImage ? (
              <img 
                src={capturedImage} 
                alt="Captured odometer"
                className="w-100 h-100 object-fit-cover"
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <p className="text-muted">Camera preview will appear here</p>
              </div>
            )}
          </div>

          {ocrResult && (
            <div className="text-center p-4 bg-light rounded mt-3">
              <h3 className="fw-bold h5">Detected Reading:</h3>
              <p className="h3 text-primary">{ocrResult}</p>
            </div>
          )}

          <div className="d-flex justify-content-center gap-2 mt-3">
            {!isScanning ? (
              <button
                onClick={startCamera}
                className="btn btn-primary d-flex align-items-center gap-2"
                disabled={isProcessing}
              >
                <Camera size={20} />
                Start Scanning
              </button>
            ) : (
              <>
                <button
                  onClick={captureAndProcess}
                  className="btn btn-success d-flex align-items-center gap-2"
                  disabled={isProcessing}
                >
                  <Camera size={20} />
                  {isProcessing ? 'Processing...' : 'Capture & Read'}
                </button>
                <button
                  onClick={stopCamera}
                  className="btn btn-danger d-flex align-items-center gap-2"
                  disabled={isProcessing}
                >
                  Stop
                </button>
              </>
            )}
          </div>

          {readings.length > 0 && (
            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h5 mb-0">Reading History</h3>
                <button
                  onClick={exportReadings}
                  className="btn btn-success btn-sm d-flex align-items-center gap-2"
                >
                  <Save size={16} />
                  Export CSV
                </button>
              </div>
              <div className="row g-3">
                {readings.map((reading) => (
                  <div key={reading.id} className="col-md-6">
                    <div className="card">
                      <img 
                        src={reading.imageSrc} 
                        alt={`Scan from ${reading.timestamp}`}
                        className="card-img-top"
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      <div className="card-body d-flex justify-content-between align-items-center">
                        <div>
                          <p className="fw-bold mb-0">{reading.reading} km</p>
                          <p className="text-muted small mb-0">{reading.timestamp}</p>
                        </div>
                        <button
                          onClick={() => deleteReading(reading.id)}
                          className="btn btn-link text-danger p-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OdometerOCRSystem;