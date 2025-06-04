// API 호출 헬퍼 함수
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const fullUrl = `${process.env.REACT_APP_API_URL}${url}`;
    
    const response = await fetch(fullUrl, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('API 호출 오류가 발생했습니다. ', error.message);
    throw error;
  }
};

// 인증 관련 API
export const authAPI = {
  // 회원가입
  register: async (userData) => {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // 로그인
  login: async (credentials) => {
    return apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }
};

// 폴더 관련 API (나중에 구현)
export const foldersAPI = {
  // 폴더 목록 조회
  getAll: async () => {
    return apiCall('/api/folders');
  },

  // 폴더 생성
  create: async (folderData) => {
    return apiCall('/api/folders', {
      method: 'POST',
      body: JSON.stringify(folderData)
    });
  },

  // 폴더 수정
  update: async (id, folderData) => {
    return apiCall(`/api/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(folderData)
    });
  },

  // 폴더 삭제
  delete: async (id) => {
    return apiCall(`/api/folders/${id}`, {
      method: 'DELETE'
    });
  }
};

// 녹음 관련 API (나중에 구현)
export const recordingsAPI = {
  // 녹음 목록 조회
  getAll: async () => {
    return apiCall('/api/recordings');
  },

  // 녹음 생성
  create: async (recordingData) => {
    return apiCall('/api/recordings', {
      method: 'POST',
      body: JSON.stringify(recordingData)
    });
  },

  // 녹음 수정
  update: async (id, recordingData) => {
    return apiCall(`/api/recordings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recordingData)
    });
  },

  // 녹음 삭제
  delete: async (id) => {
    return apiCall(`/api/recordings/${id}`, {
      method: 'DELETE'
    });
  }
};

// Chunks 관련 API
export const chunksAPI = {
  // 특정 녹음의 chunks 조회
  getByRecordingId: async (recordingId) => {
    return apiCall(`/api/chunks/${recordingId}`);
  },

  // 녹음 완료 - 오디오 파일 업로드 및 chunks 저장
  completeRecording: async (recordingId, audioBlob, chunks, duration) => {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    
    // 오디오 파일 추가
    formData.append('audio', audioBlob, `recording_${recordingId}.wav`);
    
    // chunks 데이터 추가
    if (chunks && chunks.length > 0) {
      formData.append('chunks', JSON.stringify(chunks));
    }
    
    // duration 추가
    if (duration) {
      formData.append('duration', duration.toString());
    }

    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // multipart/form-data의 경우 Content-Type을 설정하지 않음 (브라우저가 자동으로 설정)
      },
      body: formData
    };

    try {
      const fullUrl = `${process.env.REACT_APP_API_URL}/api/chunks/${recordingId}/complete`;
      
      const response = await fetch(fullUrl, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('녹음 완료 처리 오류:', error.message);
      throw error;
    }
  }
}; 