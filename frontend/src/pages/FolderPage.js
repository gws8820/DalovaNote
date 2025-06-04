import React from 'react';
import { IoMdTrash } from "react-icons/io";
import { createLongPressHandler } from '../hooks/useLongPress';
import '../styles/Common.css';

function FolderPage({ 
  selectedFolderId,
  folders,
  recordings,
  editingFolderId,
  editingFolderName,
  editingLocation,
  editingRecordingId,
  editingName,
  setEditingFolderName,
  setEditingName,
  startEditFolderName,
  deleteFolder,
  selectRecording,
  handleContextMenu,
  saveEditName,
  handleKeyPress,
  deleteRecording,
  createNewRecording,
  handleFolderNameBlur,
  handleFolderKeyPress
}) {
  // 현재 폴더의 녹음들 필터링
  const getCurrentFolderRecordings = () => {
    if (!selectedFolderId) return [];
    
    if (selectedFolderId === 'all') {
      return recordings;
    }
    
    // selectedFolderId를 정수로 변환하여 비교
    const folderId = parseInt(selectedFolderId);
    return recordings.filter(recording => 
      recording.folderIds && recording.folderIds.includes(folderId)
    );
  };

  const folderRecordings = getCurrentFolderRecordings();
  const currentFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="folder-page">
      <div className="title-section">
        {editingFolderId === selectedFolderId && editingLocation === 'main' ? (
            <input
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={handleFolderNameBlur}
              onKeyDown={handleFolderKeyPress}
            className="title-edit"
              autoFocus
              maxLength={50}
            />
        ) : (
            <h2 
            onClick={selectedFolderId !== 'all' ? () => startEditFolderName(selectedFolderId, currentFolder?.name, 'main') : undefined}
            className={`title ${selectedFolderId === 'all' ? 'title-disabled' : ''}`}
              title={selectedFolderId !== 'all' ? '클릭하여 폴더명 수정' : ''}
            style={{ cursor: selectedFolderId !== 'all' ? 'pointer' : 'default' }}
            >
              {currentFolder?.name || '폴더'}
            </h2>
        )}
            {selectedFolderId !== 'all' && (
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(selectedFolderId);
                }}
                title="폴더 삭제"
              >
                <IoMdTrash size={18} />
              </button>
            )}
          </div>
      <div className="info-section">
        <p>{folderRecordings.length}개의 녹음</p>
      </div>
      
      <div className="recordings-grid">
        {folderRecordings.length > 0 ? (
          folderRecordings.map(recording => {
            // 각 녹음에 대해 길게 누르기 이벤트 핸들러 생성
            const longPressProps = createLongPressHandler((e) => handleContextMenu(e, recording));
            
            return (
              <div 
                key={recording.id}
                className="recording-card"
                onClick={() => selectRecording(recording.id)}
                {...longPressProps}
              >
                <div className="recording-card-header">
                  {editingRecordingId === recording.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={saveEditName}
                      onKeyDown={handleKeyPress}
                      className="recording-card-edit"
                      autoFocus
                      maxLength={50}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="recording-card-title">{recording.name}</div>
                  )}
                  <button 
                    className="delete-btn"
                    onClick={(e) => deleteRecording(recording.id, e)}
                    title="삭제"
                  >
                    <IoMdTrash size={18} />
                  </button>
                </div>
                
                <div className="recording-card-content">
                  <div className="recording-card-date">
                    {new Date(recording.created_at).toLocaleString()}
                  </div>
                  <div className="recording-card-preview">
                    {recording.preview_text || '내용 없음'}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-recordings-in-folder">
            <p>이 폴더에 녹음이 없습니다.</p>
            <button className="create-recording-btn" onClick={createNewRecording}>
              첫 녹음 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FolderPage; 