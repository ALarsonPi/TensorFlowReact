import React, { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

type Prediction = {
    bbox: [number, number, number, number];
    class: string;
    score: number;
};

const CocoSsd: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamStarted, setIsWebcamStarted] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [detectionIntervalId, setDetectionIntervalId] = useState<number | null>(null);
  const [shouldResetIntervalId, setShouldResetIntervalId] = useState<boolean>(false);
  const [shouldDisableButton, setShouldDisableButton] = useState<boolean>(false);
  const [mlModel, setMLModel] = useState<cocoSsd.ObjectDetection>();
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Load the model when the component mounts
    const loadModel = async () => {
      try {
        const loadedModel = await cocoSsd.load();
        setMLModel(loadedModel);
      } catch (err) {
        console.error('Error loading model:', err);
      }
    };

    loadModel();

    return () => {
        setMLModel(undefined);
    };
  }, []);

  useEffect(() => {
    const predictObject = async () => {
        if (mlModel && videoRef.current && videoRef.current.srcObject && videoRef.current.readyState >= 2) { 
            try {
              setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              });
              const maxBoxes = 3;
              const minScoreAccuracy = 0.6;
              const predictions = await mlModel.detect(videoRef.current, maxBoxes, minScoreAccuracy);
              setPredictions(predictions as Prediction[]);
            } catch (err) {
                console.error('Prediction error:', err);
            }
        }  
    };

    if (isWebcamStarted && mlModel) {
      const intervalId = window.setInterval(predictObject, 500);
      setDetectionIntervalId(intervalId);
    }
  }, [isWebcamStarted, mlModel]);

  useEffect(() => {
    if(shouldResetIntervalId && detectionIntervalId !== null) {
        clearInterval(detectionIntervalId);
        setDetectionIntervalId(null);
    }
  }, [shouldResetIntervalId, detectionIntervalId]);
  

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (shouldDisableButton) {
      timeout = setTimeout(() => {
        setShouldDisableButton(false);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [shouldDisableButton]);

  const startWebcam = async () => {
    setShouldResetIntervalId(false);
    try {
      setShouldDisableButton(true);
      setIsWebcamStarted(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setShouldDisableButton(false);
      setIsWebcamStarted(false);
      console.error('Error accessing webcam:', error);
    }
  };

  const stopWebcam = () => {      
    setShouldResetIntervalId(true);
    const video = videoRef.current;
    if (video && video.srcObject instanceof MediaStream) {
      const stream = video.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      video.srcObject = null;
      setIsWebcamStarted(false);
      setPredictions([]);
    }
  };

  return (
  <>
    <div className="buttons">
      <button onClick={isWebcamStarted ? stopWebcam : startWebcam} disabled={shouldDisableButton}>
        {isWebcamStarted ? 'Stop' : 'Start'} Webcam
      </button>
    </div>
    <div className="feed">
      {isWebcamStarted ? <video ref={videoRef} autoPlay muted /> : <div />}
      {predictions.length > 0 && (
        predictions.map((prediction, index) => (
          <React.Fragment key={index}>
            <p
              style={{
                position: 'absolute',
                left: `${(prediction.bbox[0] / videoDimensions.width) * 100}%`,
                top: `${(prediction.bbox[1] / videoDimensions.height) * 100}%`,
                width: `${((prediction.bbox[2] - 100) / videoDimensions.width) * 100}%`,
              }}
            >
              {prediction.class} - with {Math.round(prediction.score * 100)}% confidence.
            </p>
            <div
              className="marker"
              style={{
                position: 'absolute',
                left: `${(prediction.bbox[0] / videoDimensions.width) * 100}%`,
                top: `${(prediction.bbox[1] / videoDimensions.height) * 100}%`,
                width: `${(prediction.bbox[2] / videoDimensions.width) * 100}%`,
                height: `${(prediction.bbox[3] / videoDimensions.height) * 100}%`,
                border: '2px solid red',
              }}
            />
          </React.Fragment>
        ))
      )}
    </div>
    {predictions.length > 0 && (
      <div>
        <h3>Predictions:</h3>
        <ul>
          {predictions.map((prediction, index) => (
            <li key={index}>
              {`${prediction.class} (${(prediction.score * 100).toFixed(2)}%)`}
            </li>
          ))}
        </ul>
      </div>
    )}
  </>
  );
};

export default CocoSsd;
