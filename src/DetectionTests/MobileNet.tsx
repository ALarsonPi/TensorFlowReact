import React, { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs';
import * as mobileNet from '@tensorflow-models/mobilenet';
import { CameraDirection, OUTWARD_CAMERA_DIRECTION, INWARD_CAMERA_DIRECTION } from '../cameraConstants';
import { FaCamera, FaPlay, FaStop } from 'react-icons/fa';

type Prediction = {
    className: string;
    probability: number;
};

const MobileNet: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamStarted, setIsWebcamStarted] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [detectionIntervalId, setDetectionIntervalId] = useState<number | null>(null);
  const [shouldResetIntervalId, setShouldResetIntervalId] = useState<boolean>(false);
  const [shouldDisableButton, setShouldDisableButton] = useState<boolean>(false);
  const [mlModel, setMLModel] = useState<mobileNet.MobileNet>();
  const [currentCameraDirection, setCurrentCameraDirection] = useState<CameraDirection>(OUTWARD_CAMERA_DIRECTION);

  useEffect(() => {
    // Load the model when the component mounts
    const loadModel = async () => {
      try {
        const modalConfig: mobileNet.ModelConfig = {version: 1, alpha: 1}
        const loadedModel = await mobileNet.load(modalConfig);
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

    const filterAndPadPredictions = (predictions: Prediction[], minProbability: number, desiredCount: number) => {
      const filteredPredictions = predictions.filter(prediction => prediction.probability > minProbability);
      while (filteredPredictions.length < desiredCount) {
        filteredPredictions.push({
          className: 'No Object',
          probability: 0
        });
      }
      return filteredPredictions.slice(0, desiredCount);
    };

    const predictObject = async () => {
        if (mlModel && videoRef.current && videoRef.current.srcObject && videoRef.current.readyState >= 2) { 
            try {
              let predictions = await mlModel.classify(videoRef.current);
              predictions = filterAndPadPredictions(predictions, 0.05, 3);
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

  const switchCameraDirection = async () => {
    const newCameraDirection = (currentCameraDirection === OUTWARD_CAMERA_DIRECTION) ? INWARD_CAMERA_DIRECTION : OUTWARD_CAMERA_DIRECTION;
    setCurrentCameraDirection(newCameraDirection);

    if(isWebcamStarted) {
      await stopWebcam();
      await startWebcam();
    }
  }

  const startWebcam = async () => {
    setShouldResetIntervalId(false);
    try {
      setShouldDisableButton(true);
      setIsWebcamStarted(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

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
        {(!isWebcamStarted) ? <FaPlay/> : <FaStop/>}
        {isWebcamStarted ? 'Stop' : 'Start'} Webcam
      </button>
      <button className="switch-camera-button" onClick={switchCameraDirection}>
        <FaCamera /> {(currentCameraDirection === INWARD_CAMERA_DIRECTION) ? 'Inward Facing' : 'Outward Facing'}
      </button>    
    </div>
    <div className="feed">
      {isWebcamStarted ? <video ref={videoRef} autoPlay muted /> : <div />}
    </div>
    {predictions.length > 0 && (
      <div>
        <h3>Predictions:</h3>
        <ul>
          {predictions.map((prediction, index) => (
            <li key={index}>
              {`${index + 1}: ${prediction.className} (${(prediction.probability * 100).toFixed(2)}%)`}
            </li>
          ))}
        </ul>
      </div>
    )}
  </>
  );
};

export default MobileNet;
