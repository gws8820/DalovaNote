import React from 'react';
import { IoFolder } from "react-icons/io5";
import { MdCheck } from "react-icons/md";
import { MdAdd } from "react-icons/md";
import '../styles/ContextMenu.css';

function RecordingContextMenu({ 
  contextMenu, 
  startEditName, 
  toggleRecordingInFolder, 
  createFolderAndAdd 
}) {
  if (!contextMenu) return null;

  return (
    <div 
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button 
        className="context-menu-item"
        onClick={() => startEditName(contextMenu.recordingId, contextMenu.recordingName)}
      >
        이름 수정
      </button>
      
      {contextMenu.customFolders.length > 0 && (
        <>
          <div className="context-menu-divider"></div>
          <div className="context-menu-section-title">폴더 관리</div>
          
          {contextMenu.customFolders.map(folder => {
            const isInFolder = contextMenu.currentFolderIds.includes(parseInt(folder.id));
            return (
              <button
                key={folder.id}
                className="context-menu-item"
                onClick={() => toggleRecordingInFolder(contextMenu.recordingId, folder.id)}
              >
                <div className="context-menu-icon">
                  {isInFolder ? <MdCheck size={14} /> : <IoFolder size={14} />}
                </div>
                <div className="context-menu-text">
                  {folder.name}
                </div>
              </button>
            );
          })}
        </>
      )}
      
      <div className="context-menu-divider"></div>
      <button 
        className="context-menu-item"
        onClick={() => createFolderAndAdd(contextMenu.recordingId)}
      >
        <div className="context-menu-icon">
          <MdAdd size={14} />
        </div>
        <div className="context-menu-text">
          새 폴더에 추가
        </div>
      </button>
    </div>
  );
}

export default RecordingContextMenu; 