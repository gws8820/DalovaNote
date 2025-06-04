import React from 'react';
import { MdMic, MdEdit, MdPlayArrow } from 'react-icons/md';
import '../styles/WelcomePage.css';

function WelcomePage() {
  return (
    <div className="welcome-message">
      <h2>다로바노트에 오신 것을 환영합니다!</h2>
      <p>왼쪽 사이드바에서 폴더를 선택하거나 <strong>새 녹음</strong> 버튼을 클릭하여 시작하세요.</p>
      <div className="welcome-features">
        <div className="feature-item">
          <span className="feature-icon"><MdMic /></span>
          <span>실시간 음성 인식</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon"><MdEdit /></span>
          <span>자동 텍스트 변환</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon"><MdPlayArrow /></span>
          <span>구간별 재생</span>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage; 