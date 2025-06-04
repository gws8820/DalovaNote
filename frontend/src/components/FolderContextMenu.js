import React from 'react';
import '../styles/ContextMenu.css';

function FolderContextMenu({ 
  folderContextMenu, 
  startEditFolderName, 
  setFolderContextMenu, 
  deleteFolder 
}) {
  if (!folderContextMenu) return null;

  return (
    <div 
      className="context-menu"
      style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
    >
      <button 
        className="context-menu-item"
        onClick={() => {
          startEditFolderName(folderContextMenu.folderId, folderContextMenu.folderName, 'sidebar');
          setFolderContextMenu(null);
        }}
      >
        폴더명 수정
      </button>
      <div className="context-menu-divider"></div>
      <button 
        className="context-menu-item context-menu-item-danger"
        onClick={() => {
          deleteFolder(folderContextMenu.folderId);
          setFolderContextMenu(null);
        }}
      >
        폴더 삭제
      </button>
    </div>
  );
}

export default FolderContextMenu; 