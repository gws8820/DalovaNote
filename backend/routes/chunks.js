const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./auth');

const router = express.Router();

// 업로드 디렉토리 설정
const uploadDir = path.join(__dirname, '../records');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정 (오디오 파일 업로드용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 파일명: {uuid}.wav
    const uuid = uuidv4();
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `${uuid}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 오디오 파일만 허용
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('오디오 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 특정 녹음의 chunks 조회
router.get('/:recordingId', authenticateToken, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const connection = await global.dbPool.getConnection();

    try {
      // 녹음 소유권 확인
      const [recordings] = await connection.execute(
        'SELECT id FROM recordings WHERE id = ? AND user_id = ?',
        [recordingId, req.user.userId]
      );

      if (recordings.length === 0) {
        return res.status(404).json({ error: '녹음을 찾을 수 없습니다' });
      }

      // chunks 조회
      const [chunks] = await connection.execute(
        'SELECT id, text, start_time, end_time, created_at FROM chunks WHERE recording_id = ? ORDER BY start_time ASC',
        [recordingId]
      );

      res.json({
        message: 'chunks 조회 성공',
        chunks
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('chunks 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 녹음 완료 - 오디오 파일 업로드 및 chunks 저장
router.post('/:recordingId/complete', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { recordingId } = req.params;
    const { chunks: chunksData, duration } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: '오디오 파일이 필요합니다' });
    }

    const connection = await global.dbPool.getConnection();

    try {
      // 녹음 소유권 확인
      const [recordings] = await connection.execute(
        'SELECT id FROM recordings WHERE id = ? AND user_id = ?',
        [recordingId, req.user.userId]
      );

      if (recordings.length === 0) {
        // 업로드된 파일 삭제
        if (fs.existsSync(audioFile.path)) {
          fs.unlinkSync(audioFile.path);
        }
        return res.status(404).json({ error: '녹음을 찾을 수 없습니다' });
      }

      // 트랜잭션 시작
      await connection.beginTransaction();

      try {
        // 1. recordings 테이블에 오디오 파일 경로와 duration, preview_text 업데이트
        const audioFilePath = `records/${audioFile.filename}`;
        
        // preview_text 생성 (첫 3개 청크의 텍스트를 합쳐서 50자로 제한)
        let previewText = '';
        if (chunksData) {
          const chunks = JSON.parse(chunksData);
          if (chunks.length > 0) {
            const previewChunks = chunks.slice(0, 3).map(chunk => chunk.text).join(' ');
            previewText = previewChunks.length > 50 
              ? previewChunks.substring(0, 50) + '...'
              : previewChunks;
          }
        }
        
        await connection.execute(
          'UPDATE recordings SET file_path = ?, duration = ?, preview_text = ? WHERE id = ?',
          [audioFilePath, duration || 0, previewText, recordingId]
        );

        // 2. chunks 데이터 파싱 및 저장
        if (chunksData) {
          const chunks = JSON.parse(chunksData);
          
          // 기존 chunks 삭제 (혹시 있다면)
          await connection.execute(
            'DELETE FROM chunks WHERE recording_id = ?',
            [recordingId]
          );

          // 새 chunks 저장
          for (const chunk of chunks) {
            await connection.execute(
              'INSERT INTO chunks (recording_id, text, start_time, end_time) VALUES (?, ?, ?, ?)',
              [recordingId, chunk.text, chunk.startTime, chunk.endTime]
            );
          }
        }

        // 트랜잭션 커밋
        await connection.commit();

        res.json({
          message: '녹음이 성공적으로 저장되었습니다',
          audioFilePath,
          chunksCount: chunksData ? JSON.parse(chunksData).length : 0
        });

      } catch (error) {
        // 트랜잭션 롤백
        await connection.rollback();
        
        // 업로드된 파일 삭제
        if (fs.existsSync(audioFile.path)) {
          fs.unlinkSync(audioFile.path);
        }
        
        throw error;
      }

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('녹음 완료 처리 오류:', error);
    
    // 에러 발생 시 업로드된 파일 삭제
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 