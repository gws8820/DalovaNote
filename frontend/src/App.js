import React, { useState, useEffect } from 'react';
import './styles/App.css';
import RecordingPage from './pages/RecordingPage';
import FolderPage from './pages/FolderPage';
import Sidebar from './components/Sidebar';
import WelcomePage from './pages/WelcomePage';
import RecordingContextMenu from './components/RecordingContextMenu';
import FolderContextMenu from './components/FolderContextMenu';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import { useRecordings } from './hooks/useRecordings';
import { useFolders } from './hooks/useFolders';
import { useModalContext } from './contexts/ModalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [contextMenu, setContextMenu] = useState(null);
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.innerWidth <= 768;
  });
  
  const recordingsHook = useRecordings();
  const foldersHook = useFolders();
  const modalHook = useModalContext();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setFolderContextMenu(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const createNewRecording = () => {
    recordingsHook.createNewRecording(foldersHook.selectedFolderId);
  };

  const selectFolder = (folderId) => {
    foldersHook.setSelectedFolderId(folderId);
    recordingsHook.setSelectedRecordingId(null);
  };
  
  const selectRecording = (id) => {
    recordingsHook.setSelectedRecordingId(id);
  };

  const handleContextMenu = (e, recording) => {
    e.preventDefault();
    e.stopPropagation();
    
    const customFolders = foldersHook.folders.filter(folder => 
      folder.id !== 'all' && !folder.isDefault
    );
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      recordingId: recording.id,
      recordingName: recording.name,
      currentFolderIds: recording.folderIds || ['all'],
      customFolders: customFolders
    });
  };

  const startEditName = (id, currentName) => {
    recordingsHook.startEditName(id, currentName);
    setContextMenu(null);
  };

  const goToHome = () => {
    recordingsHook.setSelectedRecordingId(null);
    foldersHook.setSelectedFolderId(null);
  };
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  const deleteRecording = (id, e) => {
    if (e) e.stopPropagation();
    
    modalHook.showConfirm(
      '이 녹음을 삭제하시겠습니까? 삭제된 녹음은 복구할 수 없습니다.',
      () => {
        recordingsHook.deleteRecording(id);
      },
      '녹음 삭제 확인'
    );
  };

  const deleteFolder = (folderId) => {
    const folder = foldersHook.folders.find(f => f.id === folderId);
    const folderName = folder ? folder.name : '폴더';
    
    modalHook.showConfirm(
      <><strong>{folderName}</strong> 폴더를 삭제하시겠습니까? 녹음 파일은 삭제되지 않습니다.</>,
      () => {
        foldersHook.deleteFolder(folderId, recordingsHook.updateRecordingsOnFolderDelete);
      },
      '폴더 삭제 확인'
    );
  };

  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (folder.id === 'all' || folder.isDefault) return;
    
    setFolderContextMenu({
      x: e.clientX,
      y: e.clientY,
      folderId: folder.id,
      folderName: folder.name
    });
  };

  const handleFolderClick = (folderId) => {
    const selectedId = foldersHook.handleFolderClick(folderId);
    if (selectedId) {
      selectFolder(selectedId);
    }
  };

  const createFolderAndAdd = (recordingId) => {
    modalHook.showInput(
      '새 폴더 만들기',
      '폴더명을 입력하세요',
      async (folderName) => {
        if (folderName && folderName.trim()) {
          const trimmedName = folderName.trim();
          
          const reservedNames = ['전체 녹음', 'all'];
          if (reservedNames.includes(trimmedName) || reservedNames.includes(trimmedName.toLowerCase())) {
            setTimeout(() => {
              modalHook.showAlert('이 이름은 사용할 수 없습니다. 다른 이름을 입력해주세요.');
            }, 100);
            return;
          }
          
          await foldersHook.createFolderAndAdd(recordingId, recordingsHook.toggleRecordingInFolder, folderName);
        }
        setContextMenu(null);
      }
    );
  };

  const createNewFolder = () => {
    modalHook.showInput(
      '새 폴더 만들기',
      '폴더명을 입력하세요',
      async (folderName) => {
        if (folderName && folderName.trim()) {
          const trimmedName = folderName.trim();
          
          const reservedNames = ['전체 녹음', 'all'];
          if (reservedNames.includes(trimmedName) || reservedNames.includes(trimmedName.toLowerCase())) {
            setTimeout(() => {
              modalHook.showAlert('이 이름은 사용할 수 없습니다. 다른 이름을 입력해주세요.');
            }, 100);
            return null;
          }
          
          return await foldersHook.createNewFolder(folderName);
        }
        return null;
      }
    );
  };

  const renderMainContent = () => {
    if (recordingsHook.selectedRecordingId) {
      const currentRecording = recordingsHook.recordings.find(rec => rec.id === parseInt(recordingsHook.selectedRecordingId));
      const recordingFolderId = currentRecording?.folderIds?.[0] || 'all';
      
      return (
        <RecordingPage 
          id={recordingsHook.selectedRecordingId} 
          currentRecordingName={currentRecording?.name}
          currentFolderId={recordingFolderId}
          recordingDate={currentRecording?.created_at}
          onUpdateRecordingName={recordingsHook.updateRecordingName}
          onDeleteRecording={deleteRecording}
        />
      );
    }
    
    if (foldersHook.selectedFolderId) {
      return (
        <FolderPage
          selectedFolderId={foldersHook.selectedFolderId}
          folders={foldersHook.folders}
          recordings={recordingsHook.recordings}
          editingFolderId={foldersHook.editingFolderId}
          editingFolderName={foldersHook.editingFolderName}
          editingLocation={foldersHook.editingLocation}
          editingRecordingId={recordingsHook.editingRecordingId}
          editingName={recordingsHook.editingName}
          setEditingFolderName={foldersHook.setEditingFolderName}
          setEditingName={recordingsHook.setEditingName}
          startEditFolderName={foldersHook.startEditFolderName}
          deleteFolder={deleteFolder}
          selectRecording={selectRecording}
          handleContextMenu={handleContextMenu}
          saveEditName={recordingsHook.saveEditName}
          handleKeyPress={recordingsHook.handleKeyPress}
          deleteRecording={deleteRecording}
          createNewRecording={createNewRecording}
          handleFolderNameBlur={foldersHook.handleFolderNameBlur}
          handleFolderKeyPress={foldersHook.handleFolderKeyPress}
        />
      );
    }
    
    return <WelcomePage />;
  };
  
  const isMobileSidebarOpen = window.innerWidth <= 768 && !isSidebarCollapsed;
  
  return (
    <div className="App">
      <div className={`app-container ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          goToHome={goToHome}
          createNewRecording={createNewRecording}
          createNewFolder={createNewFolder}
          folders={foldersHook.folders}
          selectedFolderId={foldersHook.selectedFolderId}
          recordings={recordingsHook.recordings}
          editingFolderId={foldersHook.editingFolderId}
          editingLocation={foldersHook.editingLocation}
          editingFolderName={foldersHook.editingFolderName}
          setEditingFolderName={foldersHook.setEditingFolderName}
          handleFolderClick={handleFolderClick}
          handleFolderContextMenu={handleFolderContextMenu}
          handleSidebarFolderNameBlur={foldersHook.handleSidebarFolderNameBlur}
          handleFolderKeyPress={foldersHook.handleFolderKeyPress}
        />
        
        {isMobileSidebarOpen && (
          <div 
            className="mobile-full-overlay" 
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}
        
        <div className="main-content">
          {renderMainContent()}
        </div>
      </div>

      <RecordingContextMenu
        contextMenu={contextMenu}
        startEditName={startEditName}
        toggleRecordingInFolder={recordingsHook.toggleRecordingInFolder}
        createFolderAndAdd={createFolderAndAdd}
      />

      <FolderContextMenu
        folderContextMenu={folderContextMenu}
        startEditFolderName={foldersHook.startEditFolderName}
        setFolderContextMenu={setFolderContextMenu}
        deleteFolder={deleteFolder}
      />

      <LoadingSpinner isVisible={recordingsHook.isCreating || foldersHook.isCreatingFolder} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
