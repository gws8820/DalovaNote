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

  // 서버에서 녹음 목록 로드
  const loadRecordings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await recordingsAPI.getAll();
      setRecordings(response.recordings || []);
    } catch (error) {
      console.error('녹음 목록 로드 실패:', error);
      // 에러 시 빈 배열로 설정
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 인증 상태가 변경되면 녹음 로드
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // 새 녹음 만들기
  const createNewRecording = async (selectedFolderId) => {
    const newName = '새 녹음';
    const currentFolderIds = selectedFolderId && selectedFolderId !== 'all' ? [selectedFolderId] : [];
    
    const recordingData = {
      name: newName,
      folderIds: currentFolderIds
    };

    try {
      setIsLoading(true);
      const response = await recordingsAPI.create(recordingData);
      
      // 새 녹음을 목록에 추가
      const newRecording = response.recording;
      setRecordings(prev => [newRecording, ...prev]);
      setSelectedRecordingId(newRecording.id.toString());
      
      return newRecording.id.toString();
      
    } catch (error) {
      console.error('녹음 생성 실패:', error);
      modalHook.showError(error.message || '녹음 생성에 실패했습니다');
      throw error; // 에러를 다시 throw해서 AudioRecorder에서 처리할 수 있도록
    } finally {
      setIsLoading(false);
    }
  };

  // 녹음 이름 업데이트
  const updateRecordingName = async (id, newName) => {
    try {
      setIsLoading(true);
      const response = await recordingsAPI.update(id, { name: newName });
      
      // 녹음 목록 업데이트
      const updatedRecording = response.recording;
      setRecordings(prev => prev.map(rec => 
        rec.id === parseInt(id) ? { ...rec, name: updatedRecording.name } : rec
      ));
      
    } catch (error) {
      console.error('녹음 이름 수정 실패:', error);
      modalHook.showWarning(error.message || '녹음 이름 수정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 녹음 삭제
  const deleteRecording = async (id) => {
    try {
      setIsLoading(true);
      await recordingsAPI.delete(id);
      
      // 녹음 목록에서 제거
      setRecordings(prev => prev.filter(rec => rec.id !== parseInt(id)));
      
      // 현재 선택된 녹음이 삭제된 녹음이라면 선택 해제
      if (selectedRecordingId === id) {
        setSelectedRecordingId(null);
        return true; // 현재 선택된 녹음이 삭제됨을 알림
      }
      return false;
      
    } catch (error) {
      console.error('녹음 삭제 실패:', error);
      modalHook.showWarning(error.message || '녹음 삭제에 실패했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 녹음을 폴더에 추가/제거 (토글)
  const toggleRecordingInFolder = async (recordingId, targetFolderId) => {
    const recording = recordings.find(r => r.id === parseInt(recordingId));
    if (!recording) return;
    
    let newFolderIds = [...(recording.folderIds || [])];
    
    if (newFolderIds.includes(targetFolderId)) {
      // 폴더에서 제거
      newFolderIds = newFolderIds.filter(id => id !== targetFolderId);
    } else {
      // 폴더에 추가
      newFolderIds.push(targetFolderId);
    }
    
    try {
      setIsLoading(true);
      const response = await recordingsAPI.update(recordingId, { folderIds: newFolderIds });
      
      // 녹음 목록 업데이트
      const updatedRecording = response.recording;
      setRecordings(prev => prev.map(rec => 
        rec.id === parseInt(recordingId) ? { ...rec, folderIds: updatedRecording.folderIds } : rec
      ));
      
    } catch (error) {
      console.error('녹음 폴더 변경 실패:', error);
      modalHook.showWarning(error.message || '녹음 폴더 변경에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 이름 수정 시작
  const startEditName = (id, currentName) => {
    setEditingRecordingId(id);
    setEditingName(currentName);
  };

  // 이름 수정 저장
  const saveEditName = async () => {
    const newName = editingName.trim() || '새 녹음';
    await updateRecordingName(editingRecordingId, newName);
    setEditingRecordingId(null);
    setEditingName('');
  };

  // 이름 수정 취소
  const cancelEditName = () => {
    setEditingRecordingId(null);
    setEditingName('');
  };

  // 키보드 이벤트 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEditName();
    } else if (e.key === 'Escape') {
      cancelEditName();
    }
  };

  // 폴더 삭제 시 녹음들 업데이트
  const updateRecordingsOnFolderDelete = (folderId) => {
    // 서버에서 폴더 삭제 시 자동으로 처리되므로 녹음 목록을 다시 로드
    loadRecordings();
  };

  return {
    recordings,
    selectedRecordingId,
    setSelectedRecordingId,
    editingRecordingId,
    editingName,
    isLoading,
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