import React, { createContext, useContext, useState, useEffect } from 'react';
import '../styles/Modal.css';

// Modal 컴포넌트
const Modal = ({ 
  isOpen, 
  onClose, 
  title = '알림', 
  message, 
  type = 'info', // 'info', 'warning', 'error', 'confirm', 'input'
  onConfirm = null,
  confirmText = '확인',
  cancelText = '취소',
  showCancel = false,
  placeholder = '',
  defaultValue = ''
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      if (type === 'input') {
        onConfirm(inputValue.trim());
      } else {
        onConfirm();
      }
    }
    onClose();
  };

  const handleCancel = () => {
    setInputValue(defaultValue);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && type === 'input') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-container ${type === 'input' ? 'modal-input-container' : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <div className="modal-body">
          {message && (
            typeof message === 'string' ? 
              <p className="modal-message">{message}</p> : 
              <div className="modal-message">{message}</div>
          )}
          {type === 'input' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="modal-input"
              autoFocus
              maxLength={100}
            />
          )}
        </div>
        
        <div className="modal-footer">
          {showCancel && (
            <button 
              className="modal-button modal-button-cancel" 
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          )}
          <button 
            className="modal-button modal-button-confirm" 
            onClick={handleConfirm}
            disabled={type === 'input' && !inputValue.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// useModal 훅
const useModal = () => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: '확인',
    cancelText: '취소',
    showCancel: false,
    placeholder: '',
    defaultValue: ''
  });

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const showModal = ({
    title = '알림',
    message,
    type = 'info',
    onConfirm = null,
    confirmText = '확인',
    cancelText = '취소',
    showCancel = false,
    placeholder = '',
    defaultValue = ''
  }) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
      showCancel,
      placeholder,
      defaultValue
    });
  };

  // 간편 메서드들
  const showAlert = (message, title = '알림') => {
    showModal({
      title,
      message,
      type: 'info'
    });
  };

  const showWarning = (message, title = '경고') => {
    showModal({
      title,
      message,
      type: 'warning'
    });
  };

  const showError = (message, title = '오류') => {
    showModal({
      title,
      message,
      type: 'error'
    });
  };

  const showConfirm = (message, onConfirm, title = '확인') => {
    showModal({
      title,
      message,
      type: 'confirm',
      onConfirm,
      showCancel: true,
      confirmText: '확인',
      cancelText: '취소'
    });
  };

  const showInput = (title, placeholder, onConfirm, defaultValue = '') => {
    showModal({
      title,
      type: 'input',
      onConfirm,
      showCancel: true,
      confirmText: '확인',
      cancelText: '취소',
      placeholder,
      defaultValue
    });
  };

  return {
    modal,
    closeModal,
    showModal,
    showAlert,
    showWarning,
    showError,
    showConfirm,
    showInput
  };
};

// Context
const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const modalHook = useModal();

  return (
    <ModalContext.Provider value={modalHook}>
      {children}
      <Modal
        isOpen={modalHook.modal.isOpen}
        onClose={modalHook.closeModal}
        title={modalHook.modal.title}
        message={modalHook.modal.message}
        type={modalHook.modal.type}
        onConfirm={modalHook.modal.onConfirm}
        confirmText={modalHook.modal.confirmText}
        cancelText={modalHook.modal.cancelText}
        showCancel={modalHook.modal.showCancel}
        placeholder={modalHook.modal.placeholder}
        defaultValue={modalHook.modal.defaultValue}
      />
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  return useContext(ModalContext);
};

export default ModalContext; 