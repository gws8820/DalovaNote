import React, { useState, useEffect } from 'react';
import './styles/App.css';
import RecordingPage from './pages/RecordingPage';
import FolderPage from './pages/FolderPage';
import Sidebar from './components/Sidebar';
import WelcomePage from './pages/WelcomePage';
import RecordingContextMenu from './components/RecordingContextMenu';
import FolderContextMenu from './components/FolderContextMenu';
import LoginPage from './pages/LoginPage';
import { useRecordings } from './hooks/useRecordings';
import { useFolders } from './hooks/useFolders';
import { useModalContext } from './contexts/ModalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [contextMenu, setContextMenu] = useState(null);
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  // 모바일에서는 기본적으로 사이드바가 접혀있도록 설정
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.innerWidth <= 768;
  });
  
  // 커스텀 훅을 사용한 상태 관리
  const recordingsHook = useRecordings();
  const foldersHook = useFolders();
  const modalHook = useModalContext();

  // 화면 크기 변경 감지 (항상 호출)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 컨텍스트 메뉴 닫기 (항상 호출)
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setFolderContextMenu(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="loading-container">
        <div>로딩 중...</div>
      </div>
    );
  }

  // 인증되지 않았으면 로그인 폼 표시
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 새 녹음 만들기
  const createNewRecording = () => {
    recordingsHook.createNewRecording(foldersHook.selectedFolderId);
  };

  // 폴더 선택
  const selectFolder = (folderId) => {
    foldersHook.setSelectedFolderId(folderId);
    recordingsHook.setSelectedRecordingId(null);
  };
  
  // 녹음 선택
  const selectRecording = (id) => {
    recordingsHook.setSelectedRecordingId(id);
  };

  // 우클릭 컨텍스트 메뉴
  const handleContextMenu = (e, recording) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 사용자 정의 폴더들만 필터링 (전체 폴더와 기본 폴더 완전 제외)
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

  // 이름 수정 시작
  const startEditName = (id, currentName) => {
    recordingsHook.startEditName(id, currentName);
    setContextMenu(null);
  };

  // 메인 화면으로 돌아가기 (웰컴 화면)
  const goToHome = () => {
    recordingsHook.setSelectedRecordingId(null);
    foldersHook.setSelectedFolderId(null);
  };
  
  // 사이드바 토글
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  // 녹음 삭제 (e 매개변수 추가)
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

  // 폴더 삭제
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

  // 폴더 우클릭 컨텍스트 메뉴
  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 전체 폴더 또는 기본 폴더는 컨텍스트 메뉴 없음
    if (folder.id === 'all' || folder.isDefault) return;
    
    setFolderContextMenu({
      x: e.clientX,
      y: e.clientY,
      folderId: folder.id,
      folderName: folder.name
    });
  };

  // 폴더 선택 (편집 중이 아닐 때만)
  const handleFolderClick = (folderId) => {
    const selectedId = foldersHook.handleFolderClick(folderId);
    if (selectedId) {
      selectFolder(selectedId);
    }
  };

  // 새 폴더 생성 후 녹음 추가
  const createFolderAndAdd = (recordingId) => {
    modalHook.showInput(
      '새 폴더 만들기',
      '폴더명을 입력하세요',
      async (folderName) => {
        if (folderName && folderName.trim()) {
          const trimmedName = folderName.trim();
          
          // 예약된 폴더 이름 체크 (가상 폴더 이름들)
          const reservedNames = ['전체 녹음', 'all'];
          if (reservedNames.includes(trimmedName) || reservedNames.includes(trimmedName.toLowerCase())) {
            // 입력 모달이 닫힌 후에 경고 모달을 표시
            setTimeout(() => {
              modalHook.showWarning('이 이름은 사용할 수 없습니다. 다른 이름을 입력해주세요.');
            }, 100);
            return;
          }
          
          await foldersHook.createFolderAndAdd(recordingId, recordingsHook.toggleRecordingInFolder, folderName);
        }
        setContextMenu(null);
      }
    );
  };

  // 새 폴더 만들기
  const createNewFolder = () => {
    modalHook.showInput(
      '새 폴더 만들기',
      '폴더명을 입력하세요',
      async (folderName) => {
        if (folderName && folderName.trim()) {
          const trimmedName = folderName.trim();
          
          // 예약된 폴더 이름 체크 (가상 폴더 이름들)
          const reservedNames = ['전체 녹음', 'all'];
          if (reservedNames.includes(trimmedName) || reservedNames.includes(trimmedName.toLowerCase())) {
            // 입력 모달이 닫힌 후에 경고 모달을 표시
            setTimeout(() => {
              modalHook.showWarning('이 이름은 사용할 수 없습니다. 다른 이름을 입력해주세요.');
            }, 100);
            return null;
          }
          
          return await foldersHook.createNewFolder(folderName);
        }
        return null;
      }
    );
  };

  // 메인 컨텐츠 렌더링
  const renderMainContent = () => {
    // selectedRecordingId가 있으면 RecordingPage 렌더링
    if (recordingsHook.selectedRecordingId) {
      const currentRecording = recordingsHook.recordings.find(rec => rec.id === parseInt(recordingsHook.selectedRecordingId));
      const recordingFolderId = currentRecording?.folderIds?.[0] || 'all';
      
      return (
        <RecordingPage 
          id={recordingsHook.selectedRecordingId} 
          currentRecordingName={currentRecording?.name || '새 녹음'}
          currentFolderId={recordingFolderId}
          recordingDate={currentRecording?.created_at}
          onUpdateRecordingName={recordingsHook.updateRecordingName}
          onDeleteRecording={deleteRecording}
        />
      );
    }
    
    // selectedFolderId가 있으면 FolderPage 렌더링
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
    
    // 둘 다 없으면 WelcomePage 렌더링
    return <WelcomePage />;
  };
  
  // 모바일에서 사이드바가 열려있는지 확인
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
        
        {/* 모바일에서 사이드바가 열려있을 때 전체 화면 오버레이 */}
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

      {/* 컨텍스트 메뉴 */}
      <RecordingContextMenu
        contextMenu={contextMenu}
        startEditName={startEditName}
        toggleRecordingInFolder={recordingsHook.toggleRecordingInFolder}
        createFolderAndAdd={createFolderAndAdd}
      />

      {/* 폴더 컨텍스트 메뉴 */}
      <FolderContextMenu
        folderContextMenu={folderContextMenu}
        startEditFolderName={foldersHook.startEditFolderName}
        setFolderContextMenu={setFolderContextMenu}
        deleteFolder={deleteFolder}
      />
    </div>
  );
}

// 메인 App 컴포넌트 (AuthProvider로 감싸기)
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
