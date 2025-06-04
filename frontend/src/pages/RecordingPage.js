import React, { useState, useEffect } from 'react';
import { IoMdTrash } from "react-icons/io";
import AudioRecorder from '../components/AudioRecorder';
import '../styles/Common.css';

const RecordingPage = ({ 
  id, 
  currentRecordingName, 
  currentFolderId, 
  recordingDate,
  onUpdateRecordingName, 
  onDeleteRecording 
}) => {
  const [recordingName, setRecordingName] = useState('새 녹음');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // 외부에서 전달받은 이름이 변경되면 내부 상태 업데이트
  useEffect(() => {
    if (currentRecordingName && currentRecordingName !== recordingName && !isEditingName) {
      setRecordingName(currentRecordingName);
    }
  }, [currentRecordingName, recordingName, isEditingName]);
  
  // 녹음 ID가 변경되면 상태를 초기화
  useEffect(() => {
    setIsEditingName(false);
    setRecordingName(currentRecordingName || '새 녹음');
  }, [id, currentRecordingName]);

  const handleNameEdit = () => {
    setTempName(recordingName);
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    const newName = tempName.trim() || '새 녹음';
    setRecordingName(newName);
    setIsEditingName(false);
    
    // 부모 컴포넌트에 이름 변경 알림
    if (onUpdateRecordingName) {
      onUpdateRecordingName(id, newName);
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setTempName('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDeleteRecording) {
      onDeleteRecording(id, e);
    }
  };
  
  return (
    <div className="recording-page">
      <div className="title-section">
        {isEditingName ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyPress}
            className="title-edit"
              autoFocus
              maxLength={50}
            />
        ) : (
          <h2 onClick={handleNameEdit} className="title">
              {recordingName}
            </h2>
        )}
            <button 
              className="delete-btn"
              onClick={handleDelete}
              title="삭제"
            >
              <IoMdTrash size={18} />
            </button>
      </div>
      
      {recordingDate && (
        <div className="info-section">
          <p>{new Date(recordingDate).toLocaleString()}</p>
        </div>
      )}
      
      <AudioRecorder 
        key={`recorder-${id}`} // 녹음이 변경될 때마다 컴포넌트 재생성
        initialRecordingId={id}
      />
    </div>
  );
};

export default RecordingPage; 