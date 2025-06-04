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

  // 모바일에서 버튼 클릭 후 사이드바 닫기 헬퍼 함수
  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768 && !isSidebarCollapsed) {
      toggleSidebar();
    }
  };

  // 홈으로 이동 (모바일에서 사이드바 닫기)
  const handleGoToHome = () => {
    goToHome();
    closeSidebarOnMobile();
  };

  // 새 녹음 만들기 (모바일에서 사이드바 닫기)
  const handleCreateNewRecording = () => {
    createNewRecording();
    closeSidebarOnMobile();
  };

  // 새 폴더 만들기 (모바일에서 사이드바 닫기)
  const handleCreateNewFolder = () => {
    createNewFolder();
    closeSidebarOnMobile();
  };

  // 폴더 클릭 (모바일에서 사이드바 닫기)
  const handleFolderClickWithClose = (folderId) => {
    handleFolderClick(folderId);
    closeSidebarOnMobile();
  };

  // 로그아웃
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
      
      {/* 사이드바가 접혔을 때 전체 폴더 아이콘 */}
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
            // 전체 폴더가 아닌 경우에만 길게 누르기 이벤트 핸들러 생성
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