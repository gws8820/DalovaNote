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
  const [editingLocation, setEditingLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const loadFolders = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await foldersAPI.getAll();
      
      const allFolders = [
        { id: 'all', name: '전체 녹음', isDefault: true },
        ...response.folders
      ];
      
      setFolders(allFolders);
    } catch (error) {
      console.error('폴더 목록 로드 실패:', error);
      setFolders([{ id: 'all', name: '전체 녹음', isDefault: true }]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createNewFolder = async (folderName) => {
    if (!folderName || !folderName.trim()) return null;
    
    const trimmedName = folderName.trim();
    
    try {
      setIsCreatingFolder(true);
      setIsLoading(true);
      const response = await foldersAPI.create({ name: trimmedName });
      
      const newFolder = response.folder;
      setFolders(prev => [...prev, newFolder]);
      
      return newFolder.id.toString();
      
    } catch (error) {
      console.error('폴더 생성 실패:', error);
      modalHook.showAlert(error.message || '폴더 생성에 실패했습니다');
      return null;
    } finally {
      setIsCreatingFolder(false);
      setIsLoading(false);
    }
  };

  const deleteFolder = async (folderId, updateRecordingsCallback) => {
    if (folderId === 'all') return false;
    
    const folderToDelete = folders.find(folder => folder.id === folderId);
    if (!folderToDelete) return false;
    
    setFolders(prev => prev.filter(folder => folder.id !== folderId));
    
    const wasSelected = selectedFolderId === folderId;
    if (wasSelected) {
      setSelectedFolderId('all');
    }
    
    if (updateRecordingsCallback) {
      updateRecordingsCallback(folderId);
    }
    
    try {
      setIsLoading(true);
      await foldersAPI.delete(folderId);
      
      return true;
      
    } catch (error) {
      console.error('폴더 삭제 실패:', error);
      setFolders(prev => [...prev, folderToDelete]);
      if (wasSelected) {
        setSelectedFolderId(folderId);
      }
      modalHook.showAlert(error.message || '폴더 삭제에 실패했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startEditFolderName = (folderId, currentName, location = 'main') => {
    if (folderId === 'all') return;
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
    setEditingLocation(location);
  };

  const saveFolderName = async (folderId = editingFolderId, folderName = editingFolderName) => {
    if (!folderId) {
      return;
    }
    
    const newName = folderName.trim() || '새 폴더';
    
    const previousFolder = folders.find(folder => folder.id === folderId);
    if (!previousFolder) return;
    const previousName = previousFolder.name;
    
    setFolders(prev => prev.map(folder => 
      folder.id === folderId ? { ...folder, name: newName } : folder
    ));
    
    setEditingFolderId(null);
    setEditingFolderName('');
    setEditingLocation(null);
    
    try {
      setIsLoading(true);
      const response = await foldersAPI.update(folderId, { name: newName });
      
      const updatedFolder = response.folder;
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? { ...folder, name: updatedFolder.name } : folder
      ));
      
    } catch (error) {
      console.error('폴더 이름 수정 실패:', error);
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? { ...folder, name: previousName } : folder
      ));
      
      setEditingFolderId(folderId);
      setEditingFolderName(previousName);
      
      modalHook.showAlert(error.message || '폴더 이름 수정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelFolderEdit = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
    setEditingLocation(null);
  };

  const handleFolderKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveFolderName(editingFolderId, editingFolderName);
    } else if (e.key === 'Escape') {
      cancelFolderEdit();
    }
  };

  const handleFolderClick = (folderId) => {
    if (editingFolderId === null) {
      return folderId;
    }
    return null;
  };

  const handleFolderNameBlur = () => {
    saveFolderName(editingFolderId, editingFolderName);
  };

  const handleSidebarFolderNameBlur = (folderId) => {
    saveFolderName(folderId, editingFolderName);
  };

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
    isCreatingFolder,
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