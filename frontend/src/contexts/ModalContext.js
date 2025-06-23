import React, { createContext, useContext, useState, useEffect } from 'react';
import '../styles/Modal.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title = '알림', 
  message, 
  onConfirm = null,
  confirmText = '확인',
  cancelText = '취소',
  showCancel = false,
  placeholder = '',
  defaultValue = '',
  isInput = false
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      if (isInput) {
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
    if (e.key === 'Enter' && isInput) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-container ${isInput ? 'modal-input-container' : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <div className="modal-body">
          {message && (
            typeof message === 'string' ? 
              <p className="modal-message">{message}</p> : 
              <div className="modal-message">{message}</div>
          )}
          {isInput && (
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
            disabled={isInput && !inputValue.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const useModal = () => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: '확인',
    cancelText: '취소',
    showCancel: false,
    placeholder: '',
    defaultValue: '',
    isInput: false
  });

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const showModal = ({
    title = '알림',
    message,
    onConfirm = null,
    confirmText = '확인',
    cancelText = '취소',
    showCancel = false,
    placeholder = '',
    defaultValue = '',
    isInput = false
  }) => {
    setModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      showCancel,
      placeholder,
      defaultValue,
      isInput
    });
  };

  const showAlert = (message, title = '알림') => {
    showModal({
      title,
      message
    });
  };



  const showConfirm = (message, onConfirm, title = '확인') => {
    showModal({
      title,
      message,
      onConfirm,
      showCancel: true,
      confirmText: '확인',
      cancelText: '취소'
    });
  };

  const showInput = (title, placeholder, onConfirm, defaultValue = '') => {
    showModal({
      title,
      onConfirm,
      showCancel: true,
      confirmText: '확인',
      cancelText: '취소',
      placeholder,
      defaultValue,
      isInput: true
    });
  };

  return {
    modal,
    closeModal,
    showModal,
    showAlert,
    showConfirm,
    showInput
  };
};

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
        onConfirm={modalHook.modal.onConfirm}
        confirmText={modalHook.modal.confirmText}
        cancelText={modalHook.modal.cancelText}
        showCancel={modalHook.modal.showCancel}
        placeholder={modalHook.modal.placeholder}
        defaultValue={modalHook.modal.defaultValue}
        isInput={modalHook.modal.isInput}
      />
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  return useContext(ModalContext);
};

export default ModalContext; 