const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./auth');

const router = express.Router();

// 녹음 목록 조회
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await global.dbPool.getConnection();

    try {
      // 사용자의 모든 녹음 조회
      const [recordings] = await connection.execute(
        'SELECT id, name, file_path, duration, folder_ids, preview_text, created_at FROM recordings WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.userId]
      );

      // folder_ids를 배열로 파싱 (JSON 컬럼)
      recordings.forEach(recording => {
        recording.folderIds = recording.folder_ids || [];
        delete recording.folder_ids; // 원본 컬럼명 제거
      });

      res.json({
        message: '녹음 목록 조회 성공',
        recordings
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('녹음 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 녹음 생성
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, folderIds = [] } = req.body;

    // 입력 검증
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '녹음 이름을 입력해주세요' });
    }

    // 녹음 이름 길이 검증
    if (name.trim().length > 100) {
      return res.status(400).json({ error: '녹음 이름은 100자 이하여야 합니다' });
    }

    const connection = await global.dbPool.getConnection();

    try {
      // 유효한 폴더 ID들만 필터링
      let validFolderIds = [];
      if (folderIds.length > 0) {
        const folderPlaceholders = folderIds.map(() => '?').join(',');
        const [validFolders] = await connection.execute(
          `SELECT id FROM folders WHERE user_id = ? AND id IN (${folderPlaceholders})`,
          [req.user.userId, ...folderIds]
        );
        validFolderIds = validFolders.map(folder => folder.id);
      }

      // 녹음 생성 (folder_ids JSON으로 저장)
      const [result] = await connection.execute(
        'INSERT INTO recordings (user_id, name, folder_ids) VALUES (?, ?, ?)',
        [req.user.userId, name.trim(), JSON.stringify(validFolderIds)]
      );

      const recordingId = result.insertId;

      // 생성된 녹음 정보 조회
      const [newRecording] = await connection.execute(
        'SELECT id, name, file_path, duration, folder_ids, preview_text, created_at FROM recordings WHERE id = ?',
        [recordingId]
      );

      // folder_ids를 folderIds로 변환
      newRecording[0].folderIds = newRecording[0].folder_ids || [];
      delete newRecording[0].folder_ids;

      res.status(201).json({
        message: '녹음이 생성되었습니다',
        recording: newRecording[0]
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('녹음 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 녹음 수정
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, folderIds } = req.body;

    const connection = await global.dbPool.getConnection();

    try {
      // 녹음 존재 확인 및 소유권 검증
      const [recordings] = await connection.execute(
        'SELECT id, name FROM recordings WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (recordings.length === 0) {
        return res.status(404).json({ error: '녹음을 찾을 수 없습니다' });
      }

      // 수정할 필드들 준비
      const updates = [];
      const values = [];

      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({ error: '녹음 이름을 입력해주세요' });
        }
        if (name.trim().length > 100) {
          return res.status(400).json({ error: '녹음 이름은 100자 이하여야 합니다' });
        }
        updates.push('name = ?');
        values.push(name.trim());
      }

      // 폴더 관계 업데이트
      if (folderIds !== undefined) {
        // 유효한 폴더 ID들만 필터링
        let validFolderIds = [];
        if (folderIds.length > 0) {
          const folderPlaceholders = folderIds.map(() => '?').join(',');
          const [validFolders] = await connection.execute(
            `SELECT id FROM folders WHERE user_id = ? AND id IN (${folderPlaceholders})`,
            [req.user.userId, ...folderIds]
          );
          validFolderIds = validFolders.map(folder => folder.id);
        }

        updates.push('folder_ids = ?');
        values.push(JSON.stringify(validFolderIds));
      }

      // 녹음 정보 업데이트
      if (updates.length > 0) {
        values.push(id, req.user.userId);
        
        await connection.execute(
          `UPDATE recordings SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          values
        );
      }

      // 수정된 녹음 정보 조회
      const [updatedRecording] = await connection.execute(
        'SELECT id, name, file_path, duration, folder_ids, preview_text, created_at FROM recordings WHERE id = ?',
        [id]
      );

      // folder_ids를 folderIds로 변환
      updatedRecording[0].folderIds = updatedRecording[0].folder_ids || [];
      delete updatedRecording[0].folder_ids;

      res.json({
        message: '녹음이 수정되었습니다',
        recording: updatedRecording[0]
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('녹음 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 녹음 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await global.dbPool.getConnection();

    try {
      // 녹음 존재 확인 및 소유권 검증
      const [recordings] = await connection.execute(
        'SELECT id, name FROM recordings WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (recordings.length === 0) {
        return res.status(404).json({ error: '녹음을 찾을 수 없습니다' });
      }

      // 녹음 삭제 (folder_ids도 함께 삭제됨)
      const [result] = await connection.execute(
        'DELETE FROM recordings WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('녹음 삭제에 실패했습니다');
      }

      res.json({
        message: '녹음이 삭제되었습니다'
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('녹음 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 