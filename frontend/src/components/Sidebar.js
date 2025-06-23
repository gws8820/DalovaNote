import React from 'react';
import { RiMenuLine, RiAddLine, RiLogoutBoxLine } from 'react-icons/ri';
import { IoFolder, IoFolderOpenSharp } from "react-icons/io5";
import { createLongPressHandler } from '../hooks/useLongPress';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Sidebar.css';

function Sidebar({
  isSidebarCollapsed,
  toggleSidebar,
  goToHome,
  createNewRecording,
  createNewFolder,
  folders,
  selectedFolderId,
  recordings,
  editingFolderId,
  editingLocation,
  editingFolderName,
  setEditingFolderName,
  handleFolderClick,
  handleFolderContextMenu,
  handleSidebarFolderNameBlur,
  handleFolderKeyPress
}) {
  const { user, logout } = useAuth();

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768 && !isSidebarCollapsed) {
      toggleSidebar();
    }
  };

  const handleGoToHome = () => {
    goToHome();
    closeSidebarOnMobile();
  };

  const handleCreateNewRecording = () => {
    createNewRecording();
    closeSidebarOnMobile();
  };

  const handleCreateNewFolder = () => {
    createNewFolder();
    closeSidebarOnMobile();
  };

  const handleFolderClickWithClose = (folderId) => {
    handleFolderClick(folderId);
    closeSidebarOnMobile();
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h1 onClick={handleGoToHome}>DalovaNote</h1>
        <button 
          className="sidebar-toggle-btn" 
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          <RiMenuLine size={20} />
        </button>
      </div>
      
      <div className="recording-btn-container">
        <button className="new-recording-btn" onClick={handleCreateNewRecording}>
          새 녹음
        </button>
        
        <button className="collapsed-add-btn" onClick={handleCreateNewRecording} title="새 녹음">
          <RiAddLine size={20} />
        </button>
      </div>
      
      <div className="all-folder-container">
        <button 
          className="all-folder-btn" 
          onClick={() => {
            handleFolderClickWithClose('all');
          }}
          title="전체 녹음"
        >
          <IoFolder size={20} />
        </button>
      </div>
      
      <div className="folders-section">
        <div className="folders-header">
          <span>폴더</span>
          <button className="new-folder-btn" onClick={handleCreateNewFolder} title="새 폴더">
            <RiAddLine size={20} />
          </button>
        </div>
        
        <div className="folders-list">
          {folders.map(folder => {
            const longPressProps = folder.id === 'all' || folder.isDefault 
              ? {} 
              : createLongPressHandler((e) => handleFolderContextMenu(e, folder));
            
            return (
              <div 
                key={folder.id}
                className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''} ${editingFolderId === folder.id ? 'editing' : ''}`}
                onClick={() => handleFolderClickWithClose(folder.id)}
                {...longPressProps}
              >
                <div className="folder-icon">
                  {selectedFolderId === folder.id ? 
                    <IoFolderOpenSharp size={18} /> : 
                    <IoFolder size={18} />
                  }
                </div>
                {editingFolderId === folder.id && editingLocation === 'sidebar' ? (
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onBlur={() => handleSidebarFolderNameBlur(folder.id)}
                    onKeyDown={handleFolderKeyPress}
                    className="folder-name-edit-sidebar"
                    autoFocus
                    maxLength={50}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="folder-name">{folder.name}</span>
                )}
                <span className="folder-count">
                  {folder.id === 'all' ? 
                    recordings.length : 
                    recordings.filter(r => r.folderIds && r.folderIds.includes(parseInt(folder.id))).length
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="user-section">
        <div className="user-info">
          <span className="username">{user?.username}님, 반가워요!</span>
        </div>
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          title="로그아웃"
        >
          <RiLogoutBoxLine size={18} />
        </button>
      </div>
    </div>
  );
}

export default Sidebar;