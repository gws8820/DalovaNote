import { useState, useEffect, useCallback } from 'react';
import { recordingsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useModalContext } from '../contexts/ModalContext';

export const useRecordings = () => {
  const { isAuthenticated } = useAuth();
  const modalHook = useModalContext();
  const [recordings, setRecordings] = useState([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState(null);
  const [editingRecordingId, setEditingRecordingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadRecordings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await recordingsAPI.getAll();
      setRecordings(response.recordings || []);
    } catch (error) {
      console.error('녹음 목록 로드 실패:', error);
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const createNewRecording = async (selectedFolderId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const newName = `녹음 ${year}-${month}-${day} ${hours}:${minutes}`;
    const currentFolderIds = selectedFolderId && selectedFolderId !== 'all' ? [selectedFolderId] : [];
    
    const recordingData = {
      name: newName,
      folderIds: currentFolderIds
    };

    try {
      setIsCreating(true);
      setIsLoading(true);
      const response = await recordingsAPI.create(recordingData);
      
      const newRecording = response.recording;
      setRecordings(prev => [newRecording, ...prev]);
      setSelectedRecordingId(newRecording.id.toString());
      
      return newRecording.id.toString();
      
    } catch (error) {
      console.error('녹음 생성 실패:', error);
      modalHook.showAlert(error.message || '녹음 생성에 실패했습니다');
      throw error;
    } finally {
      setIsCreating(false);
      setIsLoading(false);
    }
  };

  const updateRecordingName = async (id, newName) => {
    const previousRecording = recordings.find(rec => rec.id === parseInt(id));
    if (!previousRecording) return;
    const previousName = previousRecording.name;
    
    setRecordings(prev => prev.map(rec => 
      rec.id === parseInt(id) ? { ...rec, name: newName } : rec
    ));
    
    try {
      setIsLoading(true);
      const response = await recordingsAPI.update(id, { name: newName });
      
      const updatedRecording = response.recording;
      setRecordings(prev => prev.map(rec => 
        rec.id === parseInt(id) ? { ...rec, name: updatedRecording.name } : rec
      ));
      
    } catch (error) {
      console.error('녹음 이름 수정 실패:', error);
      setRecordings(prev => prev.map(rec => 
        rec.id === parseInt(id) ? { ...rec, name: previousName } : rec
      ));
      modalHook.showAlert(error.message || '녹음 이름 수정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRecording = async (id) => {
    const recordingToDelete = recordings.find(rec => rec.id === parseInt(id));
    if (!recordingToDelete) return false;
    
    const wasSelected = selectedRecordingId === id;
    
    setRecordings(prev => prev.filter(rec => rec.id !== parseInt(id)));
    
    if (wasSelected) {
      setSelectedRecordingId(null);
    }
    
    try {
      setIsLoading(true);
      await recordingsAPI.delete(id);
      
      return wasSelected;
      
    } catch (error) {
      console.error('녹음 삭제 실패:', error);
      setRecordings(prev => {
        const newRecordings = [...prev, recordingToDelete];
        return newRecordings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
      
      if (wasSelected) {
        setSelectedRecordingId(id);
      }
      
      modalHook.showAlert(error.message || '녹음 삭제에 실패했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecordingInFolder = async (recordingId, targetFolderId) => {
    const recording = recordings.find(r => r.id === parseInt(recordingId));
    if (!recording) return;
    
    const previousFolderIds = [...(recording.folderIds || [])];
    
    let newFolderIds = [...previousFolderIds];
    
    if (newFolderIds.includes(targetFolderId)) {
      newFolderIds = newFolderIds.filter(id => id !== targetFolderId);
    } else {
      newFolderIds.push(targetFolderId);
    }
    
    setRecordings(prev => prev.map(rec => 
      rec.id === parseInt(recordingId) ? { ...rec, folderIds: newFolderIds } : rec
    ));
    
    try {
      setIsLoading(true);
      const response = await recordingsAPI.update(recordingId, { folderIds: newFolderIds });
      
      const updatedRecording = response.recording;
      setRecordings(prev => prev.map(rec => 
        rec.id === parseInt(recordingId) ? { ...rec, folderIds: updatedRecording.folderIds } : rec
      ));
      
    } catch (error) {
      console.error('녹음 폴더 변경 실패:', error);
      setRecordings(prev => prev.map(rec => 
        rec.id === parseInt(recordingId) ? { ...rec, folderIds: previousFolderIds } : rec
      ));
      modalHook.showAlert(error.message || '녹음 폴더 변경에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditName = (id, currentName) => {
    setEditingRecordingId(id);
    setEditingName(currentName);
  };

  const saveEditName = async () => {
    const newName = editingName.trim() || '새 녹음';
    await updateRecordingName(editingRecordingId, newName);
    setEditingRecordingId(null);
    setEditingName('');
  };

  const cancelEditName = () => {
    setEditingRecordingId(null);
    setEditingName('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEditName();
    } else if (e.key === 'Escape') {
      cancelEditName();
    }
  };

  const updateRecordingsOnFolderDelete = (folderId) => {
    loadRecordings();
  };

  return {
    recordings,
    selectedRecordingId,
    setSelectedRecordingId,
    editingRecordingId,
    editingName,
    isLoading,
    isCreating,
    setEditingName,
    createNewRecording,
    updateRecordingName,
    deleteRecording,
    toggleRecordingInFolder,
    startEditName,
    saveEditName,
    cancelEditName,
    handleKeyPress,
    updateRecordingsOnFolderDelete,
    loadRecordings
  };
};