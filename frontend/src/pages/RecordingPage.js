import React, { useState, useEffect } from 'react';
import { IoMdTrash } from "react-icons/io";
import AudioRecorder from '../components/AudioRecorder';
import '../styles/Common.css';

const RecordingPage = ({ 
  id, 
  currentRecordingName,
  recordingDate,
  onUpdateRecordingName, 
  onDeleteRecording 
}) => {
  const [recordingName, setRecordingName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  useEffect(() => {
    if (currentRecordingName && currentRecordingName !== recordingName && !isEditingName) {
      setRecordingName(currentRecordingName);
    }
  }, [currentRecordingName, recordingName, isEditingName]);
  
  useEffect(() => {
    setIsEditingName(false);
    setRecordingName(currentRecordingName);
  }, [id, currentRecordingName]);

  const handleNameEdit = () => {
    setTempName(recordingName);
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    const newName = tempName.trim();
    setRecordingName(newName);
    setIsEditingName(false);
    
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
        key={`recorder-${id}`}
        initialRecordingId={id}
      />
    </div>
  );
};

export default RecordingPage; 