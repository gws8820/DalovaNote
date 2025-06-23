import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HiMicrophone } from 'react-icons/hi2';
import { HiPause, HiPlay, HiStop } from 'react-icons/hi2';
import { HiCheck } from 'react-icons/hi';
import { useModalContext } from '../contexts/ModalContext';
import { chunksAPI, recordingsAPI } from '../utils/api';
import '../styles/AudioRecorder.css';

const AudioRecorder = ({ initialRecordingId: recordingId }) => {
  const modalHook = useModalContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState('saving'); // 'saving', 'success', 'error'
  const [chunks, setChunks] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [currentPlayingChunkId, setCurrentPlayingChunkId] = useState(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const pauseStartTimeRef = useRef(0);
  const recognitionRestartTimeoutRef = useRef(null);
  const isRestartingRecognitionRef = useRef(false);
  const isAbortedRef = useRef(false);
  const currentInterimStartTimeRef = useRef(null);
  
  const processTextChunk = useCallback((text, recognitionTime, interimStartTime) => {
    if (isCompleted) return;
    
    const words = text.split(' ').filter(word => word.length > 0);
    const chunkId = `chunk-${Date.now()}-${Math.random()}`;
    
    const adjustedRecognitionTime = recognitionTime - pausedTimeRef.current;
    const chunkEndTime = adjustedRecognitionTime;

    setChunks(prev => {
      const lastChunkEndTime = prev.length > 0 ? prev[prev.length - 1].endTime : 0;
      const chunkStartTime = Math.max(lastChunkEndTime, interimStartTime - 1000);
      const chunkDuration = chunkEndTime - chunkStartTime;
      
      const newChunk = {
        id: chunkId,
        text: text,
        words: words,
        startTime: chunkStartTime,
        endTime: chunkEndTime,
        duration: chunkDuration,
        recognitionTime: adjustedRecognitionTime
      };
      
      return [...prev, newChunk];
    });
  }, [isCompleted]);
  
  const initializeRecognition = useCallback(() => {
    if (recognitionRef.current) {
      isAbortedRef.current = true;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    
    isAbortedRef.current = false;
    recognitionRef.current = new window.SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'ko-KR';
    
    recognitionRef.current.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      
      const recognitionTime = Date.now() - recordingStartTimeRef.current;
      
      if (interimText.trim()) {
        if (currentInterimStartTimeRef.current === null) {
          const adjustedTime = recognitionTime - pausedTimeRef.current;
          currentInterimStartTimeRef.current = adjustedTime;
        }
        setInterimText(interimText.trim());
      } else {
        setInterimText('');
      }
      
      if (finalText.trim()) {
        processTextChunk(finalText.trim(), recognitionTime, currentInterimStartTimeRef.current);
        setInterimText('');
        
        currentInterimStartTimeRef.current = null;
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      if (event.error === 'aborted') {
        return;
      }
      
      const stillRecording = mediaRecorderRef.current && 
        (mediaRecorderRef.current.state === 'recording');
      
      if (stillRecording && !isCompleted && !isPaused && !isRestartingRecognitionRef.current) {
        isRestartingRecognitionRef.current = true;
        
        if (recognitionRestartTimeoutRef.current) {
          clearTimeout(recognitionRestartTimeoutRef.current);
        }
        
        recognitionRestartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            isAbortedRef.current = true;
            recognitionRef.current.abort();
            recognitionRef.current = null;
          }
          
          isAbortedRef.current = false;
          initializeRecognition();
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
          
          isRestartingRecognitionRef.current = false;
          recognitionRestartTimeoutRef.current = null;
        }, 300);
      }
    };
    
    recognitionRef.current.onend = (event) => {
      if (isAbortedRef.current) {
        return;
      }
      
      if (isRestartingRecognitionRef.current) {
        return;
      }
      
      const stillRecording = mediaRecorderRef.current && 
        (mediaRecorderRef.current.state === 'recording');
      
      if (stillRecording && !isCompleted && !isPaused) {
        isRestartingRecognitionRef.current = true;
        
        if (recognitionRestartTimeoutRef.current) {
          clearTimeout(recognitionRestartTimeoutRef.current);
        }
        
        recognitionRestartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            isAbortedRef.current = true;
            recognitionRef.current.abort();
            recognitionRef.current = null;
          }
          
          isAbortedRef.current = false;
          initializeRecognition();
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
          
          isRestartingRecognitionRef.current = false;
          recognitionRestartTimeoutRef.current = null;
        }, 300);
      }
    };
  }, [isCompleted, processTextChunk, isPaused]);
  
  useEffect(() => {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!window.SpeechRecognition) {
      modalHook.showAlert('음성 인식이 지원되지 않는 브라우저입니다.', '브라우저 호환성 오류');
      return;
    }
    
    initializeRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          isAbortedRef.current = true;
          recognitionRef.current.abort();
        } catch (e) {
        }
        recognitionRef.current = null;
      }
      
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
          }
        }
        
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
            }
          });
        }
        mediaRecorderRef.current = null;
      }
      
      audioChunksRef.current = [];
      
      recordingStartTimeRef.current = 0;
      pausedTimeRef.current = 0;
      pauseStartTimeRef.current = 0;
      currentInterimStartTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    const audioElement = audioRef.current;
    
    if (audioElement) {
      const handlePlayStateChange = () => {
        if (audioElement.paused) {
          setCurrentPlayingChunkId(null);
        }
      };
      
      const handleTimeUpdate = () => {
        if (!audioElement.paused && chunks.length > 0) {
          const currentTimeMs = audioElement.currentTime * 1000;
          
          const currentChunk = chunks.find(chunk => 
            currentTimeMs >= chunk.startTime && currentTimeMs <= chunk.endTime
          );
          
          if (currentChunk) {
            setCurrentPlayingChunkId(currentChunk.id);
          } else {
            setCurrentPlayingChunkId(null);
          }
        }
      };
      
      audioElement.addEventListener('ended', handlePlayStateChange);
      audioElement.addEventListener('pause', handlePlayStateChange);
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audioElement.removeEventListener('ended', handlePlayStateChange);
        audioElement.removeEventListener('pause', handlePlayStateChange);
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [currentAudioUrl, chunks]);
  
  useEffect(() => {
    if (isCompleted && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      const calculatedDuration = lastChunk.endTime / 1000;
      setDuration(calculatedDuration);
    }
  }, [isCompleted, chunks]);
  
  const loadExistingRecording = useCallback(async () => {
    if (!recordingId) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const recordingsResponse = await recordingsAPI.getAll();
      const recording = recordingsResponse.recordings.find(r => r.id === parseInt(recordingId));
      
      if (!recording) {
        return;
      }
      
      if (!recording.file_path) {
        return;
      }
      
      const audioUrl = `${process.env.REACT_APP_API_URL}/${recording.file_path}`;
      setCurrentAudioUrl(audioUrl);
      
      if (recording.duration) {
        setDuration(recording.duration);
      }
      
      try {
        const chunksResponse = await chunksAPI.getByRecordingId(recordingId);
        if (chunksResponse.chunks && chunksResponse.chunks.length > 0) {
          const formattedChunks = chunksResponse.chunks.map(chunk => ({
            id: `chunk-${chunk.id}`,
            text: chunk.text,
            startTime: chunk.start_time,
            endTime: chunk.end_time,
            duration: chunk.end_time - chunk.start_time
          }));
          setChunks(formattedChunks);
        }
      } catch (chunksError) {
      }
      
      setIsCompleted(true);
      
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    loadExistingRecording();
  }, [loadExistingRecording]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsRecording(true);
      setIsPaused(false);
      setIsCompleted(false);
      setChunks([]);
      setInterimText('');
      setDuration(0);
      
      const mimeType = 'audio/webm;codecs=opus';
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(100);
      recordingStartTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      currentInterimStartTimeRef.current = null;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          initializeRecognition();
          recognitionRef.current.start();
        }
      } else {
        initializeRecognition();
        recognitionRef.current.start();
      }
      
    } catch (error) {
      setIsRecording(false);
      setIsPaused(false);
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
            }
          });
        }
        mediaRecorderRef.current = null;
      }
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      if (interimText.trim()) {
        const recognitionTime = Date.now() - recordingStartTimeRef.current;
        const adjustedRecognitionTime = recognitionTime - pausedTimeRef.current;
        processTextChunk(interimText.trim(), adjustedRecognitionTime, null);
      }
      
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      
      pauseStartTimeRef.current = Date.now();
      setIsPaused(true);
      
      if (recognitionRef.current) {
        try {
          isAbortedRef.current = true;
          recognitionRef.current.abort();
        } catch (e) {
        }
        recognitionRef.current = null;
      }
      
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
        recognitionRestartTimeoutRef.current = null;
      }
      isRestartingRecognitionRef.current = false;
      
      setInterimText('');
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      pausedTimeRef.current += pauseDuration;
      
      setIsPaused(false);
      
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      
      initializeRecognition();
      
      setTimeout(() => {
        if (recognitionRef.current && mediaRecorderRef.current && 
            mediaRecorderRef.current.state === 'recording') {
          try {
            recognitionRef.current.start();
          } catch (err) {
          }
        }
      }, 100);
    }
  };
  
  const completeRecording = async () => {
    if (!recordingId) {
      modalHook.showAlert('녹음 ID가 없습니다. 녹음을 시작하기 전에 먼저 녹음을 생성해주세요.', '녹음 ID 오류');
      return;
    }

    try {
      if (mediaRecorderRef.current && isRecording) {
        if (isPaused) {
          const pauseDuration = Date.now() - pauseStartTimeRef.current;
          pausedTimeRef.current += pauseDuration;
        }
        
        setIsCompleted(true);
        setIsRecording(false);
        setIsPaused(false);
        setIsSaving(true);
        
        if (recognitionRef.current) {
          isAbortedRef.current = true;
          recognitionRef.current.abort();
        }
        
        let finalChunks = [...chunks];
        
        if (interimText.trim()) {
          const recognitionTime = Date.now() - recordingStartTimeRef.current;
          const adjustedRecognitionTime = recognitionTime - pausedTimeRef.current;
          
          const words = interimText.trim().split(' ').filter(word => word.length > 0);
          const chunkId = `chunk-${Date.now()}-${Math.random()}`;
          const chunkEndTime = adjustedRecognitionTime;
          
          let chunkStartTime;
          if (finalChunks.length === 0) {
            const textLength = interimText.trim().length;
            const rollbackTimeMs = textLength * 500;
            chunkStartTime = Math.max(0, chunkEndTime - rollbackTimeMs);
          } else {
            const lastChunk = finalChunks[finalChunks.length - 1];
            chunkStartTime = lastChunk.endTime;
          }
          
          const chunkDuration = chunkEndTime - chunkStartTime;
          
          const lastChunk = {
            id: chunkId,
            text: interimText.trim(),
            words: words,
            startTime: chunkStartTime,
            endTime: chunkEndTime,
            duration: chunkDuration,
            recognitionTime: adjustedRecognitionTime
          };
          
          finalChunks.push(lastChunk);
          
          processTextChunk(interimText.trim(), adjustedRecognitionTime, null);
        }
        setInterimText('');
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setCurrentAudioUrl(audioUrl);

            const totalDuration = (Date.now() - recordingStartTimeRef.current - pausedTimeRef.current) / 1000;

            await chunksAPI.completeRecording(
              recordingId,
              audioBlob,
              finalChunks,
              totalDuration
            );

            setSavingStatus('success');
            
            setTimeout(() => {
              setIsSaving(false);
              setSavingStatus('saving');
            }, 1500);

          } catch (error) {
            setSavingStatus('error');
            
            setTimeout(() => {
              setIsSaving(false);
              setSavingStatus('saving');
            }, 2000);
          }
        };
        
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            track.stop();
          });
        }
      }
    } catch (error) {
      setIsSaving(false);
      setSavingStatus('saving');
      setIsCompleted(true);
      setIsRecording(false);
      setIsPaused(false);
    }
  };
  
  const playChunk = (chunk) => {
    if (!currentAudioUrl || !audioRef.current) {
      return;
    }
    
    // 현재 재생 중이면 정지
    if (!audioRef.current.paused) {
      audioRef.current.pause();
      
      if (currentPlayingChunkId === chunk.id) {
        setCurrentPlayingChunkId(null);
        return;
      }
    }
    
    const playStartTime = chunk.startTime / 1000;
    
    // seeking과 play 사이에 약간의 지연 추가
    audioRef.current.currentTime = playStartTime;
    
    // currentTime 설정 후 약간의 지연
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setCurrentPlayingChunkId(chunk.id);
        }).catch(err => {
        });
      }
    }, 100);
  };
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      const currentTimeMs = audioRef.current.currentTime * 1000;
      const currentChunk = chunks.find(chunk => 
        currentTimeMs >= chunk.startTime && currentTimeMs <= chunk.endTime
      );
      
      if (currentChunk) {
        setCurrentPlayingChunkId(currentChunk.id);
      } else {
        setCurrentPlayingChunkId(null);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;

      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentPlayingChunkId(null);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (!isFinite(time) || isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="audio-recorder">
      {isSaving && (
        <div className="saving-overlay">
          <div className="saving-modal">
            {savingStatus === 'success' ? (
              <div className="success-icon">
                <HiCheck size={48} />
              </div>
            ) : (
              <div className="spinner-icon"></div>
            )}
            <p className="saving-message">
              {savingStatus === 'saving' && '저장 중...'}
              {savingStatus === 'success' && '저장이 완료되었습니다!'}
              {savingStatus === 'error' && '저장 중 오류가 발생했습니다.'}
            </p>
          </div>
        </div>
      )}

      <div className="transcript">
        {(() => {
          if (isLoading) {
            return <p className="placeholder">녹음을 불러오는 중...</p>;
          }
          
          if (chunks.length === 0 && !interimText && !isCompleted && !isSaving) {
            return <p className="placeholder">녹음을 시작하면 여기에 텍스트가 표시됩니다.</p>;
          }
          
          if (isCompleted && chunks.length === 0 && !isSaving) {
            return <p className="placeholder">녹음된 내용이 없습니다.</p>;
          }
          
          const lines = [];
          let currentLine = [];
          let currentLineLength = 0;
          
          chunks.forEach((chunk, index) => {
            const chunkText = chunk.text;
            const spacer = index < chunks.length - 1 ? ' ' : '';
            const totalLength = chunkText.length + spacer.length;
            
            if (currentLineLength + totalLength > 200 && currentLine.length > 0) {
              lines.push([...currentLine]);
              currentLine = [];
              currentLineLength = 0;
            }
            
            currentLine.push({ chunk, text: chunkText, spacer, index });
            currentLineLength += totalLength;
          });
          
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          
          if (lines.length === 0) {
            lines.push([]);
          }
          
          return lines.map((line, lineIndex) => (
            <div key={lineIndex} className="chunk-paragraph">
              {line.map((item, itemIndex) => (
                <React.Fragment key={`${item.chunk?.id || itemIndex}-${itemIndex}`}>
                  <span
                    className={`chunk-span ${currentPlayingChunkId === item.chunk?.id ? 'playing' : ''} ${!isCompleted ? 'disabled' : ''}`}
                    onClick={isCompleted && item.chunk ? () => playChunk(item.chunk) : undefined}
                    title={isCompleted && item.chunk ? `시작: ${(item.chunk.startTime/1000).toFixed(2)}s, 길이: ${(item.chunk.duration/1000).toFixed(2)}s` : ''}
                  >
                    {item.text}
                  </span>
                  {item.spacer}
                </React.Fragment>
              ))}
              {lineIndex === lines.length - 1 && interimText && !isPaused && (
                <span className="interim-chunk-span">
                  {chunks.length > 0 ? ' ' : ''}{interimText}
                </span>
              )}
            </div>
          ));
        })()}
      </div>

      <div className="floating-controls">
        {!isLoading && !isCompleted && !isRecording && (
          <button className="record-start-button" onClick={startRecording} title="녹음 시작">
            <HiMicrophone size={16} />
            <span>녹음 시작</span>
          </button>
        )}
        
        {isRecording && (
          <div className="recording-controls">
            {!isPaused ? (
              <button className="pause-button" onClick={pauseRecording} title="일시정지">
                <HiPause size={16} />
                <span>일시정지</span>
              </button>
            ) : (
              <button className="resume-button" onClick={resumeRecording} title="재개">
                <HiPlay size={16} />
                <span>재개</span>
              </button>
            )}
            <button 
              className="complete-button" 
              onClick={completeRecording} 
              disabled={isSaving}
              title="완료"
            >
              <HiStop size={16} />
              <span>완료</span>
            </button>
          </div>
        )}
        
        {currentAudioUrl && (
          <div className="custom-audio-player">
            <audio 
              ref={audioRef} 
              src={currentAudioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              preload="metadata"
              style={{ display: 'none' }}
            />
            
            <div className="audio-controls-row">
              <button 
                className="audio-play-button" 
                onClick={togglePlayPause}
                title={isPlaying ? "일시정지" : "재생"}
              >
                {isPlaying ? <HiPause size={15} className="stop-icon" /> : <HiPlay size={15} className="play-icon" />}
              </button>
              
              <div className="audio-progress-container" onClick={handleSeek}>
                <div className="audio-progress-bar">
                  <div 
                    className="audio-progress-fill"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
              
              <div className="audio-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;