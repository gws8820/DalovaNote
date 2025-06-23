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

export const authAPI = {
  register: async (userData) => {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  login: async (credentials) => {
    return apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }
};

export const foldersAPI = {
  getAll: async () => {
    return apiCall('/api/folders');
  },

  create: async (folderData) => {
    return apiCall('/api/folders', {
      method: 'POST',
      body: JSON.stringify(folderData)
    });
  },

  update: async (id, folderData) => {
    return apiCall(`/api/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(folderData)
    });
  },

  delete: async (id) => {
    return apiCall(`/api/folders/${id}`, {
      method: 'DELETE'
    });
  }
};

export const recordingsAPI = {
  getAll: async () => {
    return apiCall('/api/recordings');
  },

  create: async (recordingData) => {
    return apiCall('/api/recordings', {
      method: 'POST',
      body: JSON.stringify(recordingData)
    });
  },

  update: async (id, recordingData) => {
    return apiCall(`/api/recordings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recordingData)
    });
  },

  delete: async (id) => {
    return apiCall(`/api/recordings/${id}`, {
      method: 'DELETE'
    });
  }
};

export const chunksAPI = {
  getByRecordingId: async (recordingId) => {
    return apiCall(`/api/chunks/${recordingId}`);
  },

  completeRecording: async (recordingId, audioBlob, chunks, duration) => {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    
    const fileExtension = '.webm';
    
    formData.append('audio', audioBlob, `recording_${recordingId}${fileExtension}`);
    
    if (chunks && chunks.length > 0) {
      formData.append('chunks', JSON.stringify(chunks));
    }
    
    if (duration) {
      formData.append('duration', duration.toString());
    }

    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
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