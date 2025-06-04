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
  const [chunks, setChunks] = useState([]); // 인식된 텍스트 청크들
  const [interimText, setInterimText] = useState(''); // 실시간 중간 텍스트
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [currentPlayingChunkId, setCurrentPlayingChunkId] = useState(null);
  
  // 커스텀 오디오 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const pausedTimeRef = useRef(0); // 일시정지된 누적 시간
  const pauseStartTimeRef = useRef(0); // 일시정지 시간
  const recognitionRestartTimeoutRef = useRef(null); // 음성 인식 재시작 타이머
  
  const processTextChunk = useCallback((text, recognitionTime) => {
    // 완료된 상태에서는 새로운 청크를 추가하지 않음
    if (isCompleted) {
      return;
    }
    
    const words = text.split(' ').filter(word => word.length > 0);
    const chunkId = `chunk-${Date.now()}-${Math.random()}`;
    
    // 일시정지된 시간을 제외한 실제 녹음 시간 계산
    const adjustedRecognitionTime = recognitionTime - pausedTimeRef.current;
    const chunkEndTime = adjustedRecognitionTime;
    
    setChunks(prev => {
      let chunkStartTime;
      
      if (prev.length === 0) {
        // 첫 번째 청크: 종료 시각보다 20초 전으로 설정 (최소 0초)
        chunkStartTime = Math.max(0, chunkEndTime - 20000);
      } else {
        const lastChunk = prev[prev.length - 1];
        chunkStartTime = lastChunk.endTime;
      }
      
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
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initializeRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    
    // 재시작 타이머 정리
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    
    recognitionRef.current = new window.SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true; // 중간 결과도 받기
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
      
      // 중간 결과 실시간 업데이트
      const recognitionTime = Date.now() - recordingStartTimeRef.current;
      if (interimText.trim()) {
        setInterimText(interimText.trim());
      } else {
        setInterimText('');
      }
      
      // 최종 결과가 있으면 처리
      if (finalText.trim()) {
        processTextChunk(finalText.trim(), recognitionTime);
        setInterimText(''); // 중간 텍스트 초기화
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      
      // aborted 오류는 정상적인 중지이므로 재시작하지 않음
      if (event.error === 'aborted') {
        return;
      }
      
      // 녹음 중이고 일시정지 상태가 아닐 때만 재시작
      if (isRecording && !isPaused) {
        recognitionRestartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isRecording && !isPaused) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.error('음성 인식 재시작 실패:', err);
            }
          }
        }, 1000);
      }
    };
    
    recognitionRef.current.onend = () => {
      // 녹음 중이고 일시정지 상태가 아닐 때만 재시작
      if (isRecording && !isPaused && !isCompleted) {
        recognitionRestartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isRecording && !isPaused && !isCompleted) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.error('음성 인식 재시작 실패:', err);
            }
          }
        }, 100);
      }
    };
  }, [isRecording, isPaused, isCompleted, processTextChunk]);
  
  // 컴포넌트 마운트 시 한 번만 초기화
  useEffect(() => {
    // 브라우저 SpeechRecognition API 지원 확인
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!window.SpeechRecognition) {
      modalHook.showError('음성 인식이 지원되지 않는 브라우저입니다.', '브라우저 호환성 오류');
      return;
    }
    
    // 음성 인식 인스턴스 초기화
    initializeRecognition();
    
    return () => {
      // 재시작 타이머 정리
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
        recognitionRestartTimeoutRef.current = null;
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 오디오 이벤트 리스너 관리
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
          const currentTimeMs = audioElement.currentTime * 1000; // 밀리초로 변환
          
          // 현재 시간에 해당하는 청크 찾기
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
  
  // duration 계산 및 설정
  useEffect(() => {
    if (isCompleted && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      const calculatedDuration = lastChunk.endTime / 1000; // 초 단위
      setDuration(calculatedDuration);
    }
  }, [isCompleted, chunks]);
  
  // 기존 녹음 데이터 로드
  const loadExistingRecording = useCallback(async () => {
    // recordingId가 없으면 새 녹음이므로 로드하지 않음
    if (!recordingId) {
      console.log('새 녹음: recordingId가 없습니다.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 1. 녹음 정보 조회 (오디오 파일 경로 포함)
      const recordingsResponse = await recordingsAPI.getAll();
      const recording = recordingsResponse.recordings.find(r => r.id === parseInt(recordingId));
      
      if (!recording) {
        console.warn(`녹음 ID ${recordingId}를 찾을 수 없습니다.`);
        return;
      }
      
      if (recording.file_path) {
        // 2. 오디오 파일 URL 설정
        const audioUrl = `${process.env.REACT_APP_API_URL}/${recording.file_path}`;
        setCurrentAudioUrl(audioUrl);
        
        // 3. duration 설정
        if (recording.duration) {
          setDuration(recording.duration);
        }
        
        // 4. chunks 데이터 조회
        try {
          const chunksResponse = await chunksAPI.getByRecordingId(recordingId);
          if (chunksResponse.chunks && chunksResponse.chunks.length > 0) {
            // 백엔드 chunks 데이터를 프론트엔드 형식으로 변환
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
          console.log('chunks 조회 실패 (빈 녹음일 수 있음):', chunksError.message);
        }
        
        // 5. 완료된 상태로 설정
        setIsCompleted(true);
        console.log(`기존 녹음 로드 완료: ID ${recordingId}`);
      } else {
        console.log(`녹음 ID ${recordingId}는 아직 오디오 파일이 없습니다.`);
      }
      
    } catch (error) {
      console.error('기존 녹음 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [recordingId]);

  // recordingId가 변경될 때마다 기존 녹음 로드
  useEffect(() => {
    loadExistingRecording();
  }, [loadExistingRecording]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder 설정
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(100);
      recordingStartTimeRef.current = Date.now();
      pausedTimeRef.current = 0; // 일시정지 시간 초기화
      
      setIsRecording(true);
      setIsPaused(false);
      setIsCompleted(false);
      setChunks([]); // 청크 초기화
      setInterimText(''); // 중간 텍스트 초기화
      setDuration(0); // duration 초기화
      
      // 음성 인식 시작
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('음성 인식 시작 실패:', err);
          // 재초기화 후 재시도
          initializeRecognition();
          recognitionRef.current.start();
        }
      } else {
        initializeRecognition();
        recognitionRef.current.start();
      }
      
    } catch (error) {
      console.error('녹음 시작 실패:', error);
    }
  };
  
  const pauseRecording = () => {
    // 재시작 타이머 정리
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      // MediaRecorder 일시정지
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      
      // 음성 인식 중지
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // 일시정지 시작 시간 기록
      pauseStartTimeRef.current = Date.now();
      setIsPaused(true);
      setInterimText(''); // 중간 텍스트 초기화
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      // 일시정지된 시간 누적
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      pausedTimeRef.current += pauseDuration;
      
      // MediaRecorder 재개
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      
      setIsPaused(false);
      
      // 음성 인식 재시작
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('음성 인식 재시작 실패:', err);
          // 재초기화 후 재시도
          initializeRecognition();
          recognitionRef.current.start();
        }
      }
    }
  };
  
  const completeRecording = async () => {
    // recordingId 체크를 가장 먼저 수행
    if (!recordingId) {
      modalHook.showError('녹음 ID가 없습니다. 녹음을 시작하기 전에 먼저 녹음을 생성해주세요.', '녹음 ID 오류');
      return;
    }

    // 재시작 타이머 정리
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      // 일시정지 상태였다면 일시정지 시간 계산
      if (isPaused) {
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        pausedTimeRef.current += pauseDuration;
      }
      
      // 먼저 상태를 완료로 설정하여 새로운 청크 추가 방지
      setIsCompleted(true);
      setIsRecording(false);
      setIsPaused(false);
      setIsSaving(true);
      
      // 음성 인식 먼저 중지
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // 음성 인식이 완전히 중지될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 현재 chunks 상태 복사 (UI는 건드리지 않음)
      let finalChunks = [...chunks];
      
      // 마지막 interimText가 있으면 추가 (UI 업데이트 없이 finalChunks에만 추가)
      if (interimText.trim()) {
        const recognitionTime = Date.now() - recordingStartTimeRef.current;
        const adjustedRecognitionTime = recognitionTime - pausedTimeRef.current;
        const chunkEndTime = adjustedRecognitionTime;
        const chunkId = `chunk-${Date.now()}-${Math.random()}`;
        
        let chunkStartTime;
        if (finalChunks.length === 0) {
          chunkStartTime = Math.max(0, chunkEndTime - 10000);
        } else {
          const lastChunk = finalChunks[finalChunks.length - 1];
          chunkStartTime = lastChunk.endTime;
        }
        
        const chunkDuration = chunkEndTime - chunkStartTime;
        
        const newChunk = {
          id: chunkId,
          text: interimText.trim(),
          words: interimText.trim().split(' ').filter(word => word.length > 0),
          startTime: chunkStartTime,
          endTime: chunkEndTime,
          duration: chunkDuration,
          recognitionTime: adjustedRecognitionTime
        };
        
        // finalChunks에만 추가 (UI 업데이트 하지 않음)
        finalChunks.push(newChunk);
      }
      
      setInterimText(''); // 중간 텍스트 초기화
      
      // MediaRecorder 중지
      mediaRecorderRef.current.stop();
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setCurrentAudioUrl(audioUrl);

          // 총 녹음 시간 계산 (밀리초 단위를 초 단위로 변환)
          const totalDuration = (Date.now() - recordingStartTimeRef.current - pausedTimeRef.current) / 1000;

          // 백엔드에 오디오 파일과 chunks 저장 (마지막 청크 포함)
          await chunksAPI.completeRecording(
            recordingId,
            audioBlob,
            finalChunks,
            totalDuration
          );

          setSavingStatus('success');
          
          // 1.5초 후 자동으로 모달 닫기
          setTimeout(() => {
            setIsSaving(false);
            setSavingStatus('saving');
          }, 1500);

        } catch (error) {
          console.error('녹음 저장 오류:', error);
          setSavingStatus('error');
          
          // 오류 시에도 2초 후 모달 닫기
          setTimeout(() => {
            setIsSaving(false);
            setSavingStatus('saving');
          }, 2000);
        }
      };
      
      // 스트림 종료
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          track.stop();
        });
      }
    }
  };
  
  const playChunk = (chunk) => {
    if (!currentAudioUrl || !audioRef.current) return;
    
    // 오디오 정지 상태 확인
    if (!audioRef.current.paused) {
      audioRef.current.pause();
      
      // 이미 선택된 청크를 다시 클릭한 경우 재생 중지만 하고 리턴
      if (currentPlayingChunkId === chunk.id) {
        setCurrentPlayingChunkId(null);
        return;
      }
    }
    
    // 청크 재생 시간으로 이동
    const playStartTime = chunk.startTime / 1000; // 초 단위로 변환
    
    // 오디오 재생 위치 설정 및 재생
    audioRef.current.currentTime = playStartTime;
    
    audioRef.current.play().then(() => {
      setCurrentPlayingChunkId(chunk.id);
    }).catch(err => {
      console.error('오디오 재생 에러:', err);
    });
  };
  
  // 커스텀 오디오 플레이어 함수들
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
      
      // 현재 재생 중인 청크 찾기
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
      
      // duration이 유효한 숫자인지 확인 (Infinity나 NaN이 아닌 경우만)
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      }
      // Infinity인 경우 청크 기반 계산은 useEffect에서 처리
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
      {isLoading && (
        <div className="loading-indicator">
          <span>녹음을 불러오는 중...</span>
        </div>
      )}
      
      {isSaving && (
        <div className="saving-overlay">
          <div className="saving-spinner">
            {savingStatus === 'success' ? (
              <div className="success-icon">
                <HiCheck size={48} />
              </div>
            ) : (
              <div className="spinner"></div>
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
        {chunks.map((chunk, index) => (
          <span
            key={chunk.id}
            className={`chunk-span ${currentPlayingChunkId === chunk.id ? 'playing' : ''} ${!isCompleted ? 'disabled' : ''}`}
            onClick={isCompleted ? () => playChunk(chunk) : undefined}
            title={isCompleted ? `시작: ${(chunk.startTime/1000).toFixed(2)}s, 길이: ${(chunk.duration/1000).toFixed(2)}s` : ''}
          >
            {chunk.text}
            {index < chunks.length - 1 ? ' ' : ''}
          </span>
        ))}
        {interimText && !isPaused && (
          <span className="interim-text">
            {chunks.length > 0 ? ' ' : ''}{interimText}
          </span>
        )}
        {!isLoading && chunks.length === 0 && !interimText && !isCompleted && !isSaving && (
          <p className="placeholder">녹음을 시작하면 여기에 텍스트가 표시됩니다.</p>
        )}
        {!isLoading && isCompleted && chunks.length === 0 && !isSaving && (
          <p className="placeholder">녹음된 내용이 없습니다.</p>
        )}
      </div>

      {/* 하단 플로팅 컨트롤 */}
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