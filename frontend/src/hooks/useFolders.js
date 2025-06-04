import { useState, useEffect, useCallback } from 'react';
import { foldersAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useModalContext } from '../contexts/ModalContext';

export const useFolders = () => {
  const { isAuthenticated } = useAuth();
  const modalHook = useModalContext();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingLocation, setEditingLocation] = useState(null); // 'main' 또는 'sidebar'
  const [isLoading, setIsLoading] = useState(false);

  // 서버에서 폴더 목록 로드
  const loadFolders = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await foldersAPI.getAll();
      
      // "전체 녹음" 폴더를 맨 앞에 추가 (가상 폴더)
      const allFolders = [
        { id: 'all', name: '전체 녹음', isDefault: true },
        ...response.folders
      ];
      
      setFolders(allFolders);
    } catch (error) {
      console.error('폴더 목록 로드 실패:', error);
      // 에러 시 기본 폴더만 표시
      setFolders([{ id: 'all', name: '전체 녹음', isDefault: true }]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 인증 상태가 변경되면 폴더 로드
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // 새 폴더 만들기
  const createNewFolder = async (folderName) => {
    if (!folderName || !folderName.trim()) return null;
    
    const trimmedName = folderName.trim();
    
    try {
      setIsLoading(true);
      const response = await foldersAPI.create({ name: trimmedName });
      
      // 새 폴더를 목록에 추가
      const newFolder = response.folder;
      setFolders(prev => [...prev, newFolder]);
      
      return newFolder.id.toString(); // ID를 문자열로 반환 (기존 로직과 일치)
      
    } catch (error) {
      console.error('폴더 생성 실패:', error);
      modalHook.showWarning(error.message || '폴더 생성에 실패했습니다');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 폴더 삭제
  const deleteFolder = async (folderId, updateRecordingsCallback) => {
    if (folderId === 'all') return false; // 전체 폴더는 삭제 불가
    
    try {
      setIsLoading(true);
      await foldersAPI.delete(folderId);
      
      // 폴더 목록에서 제거
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      
      // 녹음들 업데이트 (콜백을 통해)
      if (updateRecordingsCallback) {
        updateRecordingsCallback(folderId);
      }
      
      // 현재 선택된 폴더가 삭제된 폴더라면 전체 폴더로 이동
      if (selectedFolderId === folderId) {
        setSelectedFolderId('all');
      }
      
      return true;
      
    } catch (error) {
      console.error('폴더 삭제 실패:', error);
      modalHook.showWarning(error.message || '폴더 삭제에 실패했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 폴더 이름 수정 시작
  const startEditFolderName = (folderId, currentName, location = 'main') => {
    if (folderId === 'all') return; // 전체 폴더는 수정 불가
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
    setEditingLocation(location);
  };

  // 폴더 이름 수정 저장
  const saveFolderName = async (folderId = editingFolderId, folderName = editingFolderName) => {
    if (!folderId) {
      return; // folderId가 없으면 저장하지 않음
    }
    
    const newName = folderName.trim() || '새 폴더';
    
    try {
      setIsLoading(true);
      const response = await foldersAPI.update(folderId, { name: newName });
      
      // 폴더 목록 업데이트
      const updatedFolder = response.folder;
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? { ...folder, name: updatedFolder.name } : folder
      ));
      
      setEditingFolderId(null);
      setEditingFolderName('');
      setEditingLocation(null);
      
    } catch (error) {
      console.error('폴더 이름 수정 실패:', error);
      modalHook.showWarning(error.message || '폴더 이름 수정에 실패했습니다');
      
      // 실패 시 편집 상태 유지
    } finally {
      setIsLoading(false);
    }
  };

  // 폴더 이름 수정 취소
  const cancelFolderEdit = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
    setEditingLocation(null);
  };

  // 키보드 이벤트 처리 (폴더용)
  const handleFolderKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveFolderName(editingFolderId, editingFolderName);
    } else if (e.key === 'Escape') {
      cancelFolderEdit();
    }
  };

  // 폴더 선택 (편집 중이 아닐 때만)
  const handleFolderClick = (folderId) => {
    if (editingFolderId === null) {
      return folderId; // 선택할 폴더 ID 반환
    }
    return null;
  };

  // onBlur 핸들러 (폴더 페이지용)
  const handleFolderNameBlur = () => {
    saveFolderName(editingFolderId, editingFolderName);
  };

  // onBlur 핸들러 (사이드바용)
  const handleSidebarFolderNameBlur = (folderId) => {
    saveFolderName(folderId, editingFolderName);
  };

  // 새 폴더 생성 후 녹음 추가
  const createFolderAndAdd = async (recordingId, toggleRecordingInFolderCallback, folderName) => {
    const newFolderId = await createNewFolder(folderName);
    if (newFolderId && toggleRecordingInFolderCallback) {
      toggleRecordingInFolderCallback(recordingId, newFolderId);
    }
    return newFolderId;
  };

  return {
    folders,
    selectedFolderId,
    setSelectedFolderId,
    editingFolderId,
    editingFolderName,
    editingLocation,
    isLoading,
    setEditingFolderName,
    createNewFolder,
    deleteFolder,
    startEditFolderName,
    saveFolderName,
    cancelFolderEdit,
    handleFolderKeyPress,
    handleFolderClick,
    handleFolderNameBlur,
    handleSidebarFolderNameBlur,
    createFolderAndAdd,
    loadFolders
  };
}; 