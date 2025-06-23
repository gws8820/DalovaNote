const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await global.dbPool.getConnection();

    try {
      const [folders] = await connection.execute(
        'SELECT id, name, created_at FROM folders WHERE user_id = ? ORDER BY created_at ASC',
        [req.user.userId]
      );

      res.json({
        message: '폴더 목록 조회 성공',
        folders
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('폴더 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '폴더 이름을 입력해주세요' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ error: '폴더 이름은 50자 이하여야 합니다' });
    }

    const connection = await global.dbPool.getConnection();

    try {
      const [existingFolders] = await connection.execute(
        'SELECT id FROM folders WHERE user_id = ? AND name = ?',
        [req.user.userId, name.trim()]
      );

      if (existingFolders.length > 0) {
        return res.status(409).json({ error: '같은 이름의 폴더가 이미 존재합니다' });
      }

      const [result] = await connection.execute(
        'INSERT INTO folders (user_id, name) VALUES (?, ?)',
        [req.user.userId, name.trim()]
      );

      const folderId = result.insertId;

      const [newFolder] = await connection.execute(
        'SELECT id, name, created_at FROM folders WHERE id = ?',
        [folderId]
      );

      res.status(201).json({
        message: '폴더가 생성되었습니다',
        folder: newFolder[0]
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('폴더 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '폴더 이름을 입력해주세요' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ error: '폴더 이름은 50자 이하여야 합니다' });
    }

    const connection = await global.dbPool.getConnection();

    try {
      const [folders] = await connection.execute(
        'SELECT id, name FROM folders WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (folders.length === 0) {
        return res.status(404).json({ error: '폴더를 찾을 수 없습니다' });
      }

      if (folders[0].name === '전체 녹음') {
        return res.status(403).json({ error: '기본 폴더는 수정할 수 없습니다' });
      }

      const [existingFolders] = await connection.execute(
        'SELECT id FROM folders WHERE user_id = ? AND name = ? AND id != ?',
        [req.user.userId, name.trim(), id]
      );

      if (existingFolders.length > 0) {
        return res.status(409).json({ error: '같은 이름의 폴더가 이미 존재합니다' });
      }

      await connection.execute(
        'UPDATE folders SET name = ? WHERE id = ? AND user_id = ?',
        [name.trim(), id, req.user.userId]
      );

      const [updatedFolder] = await connection.execute(
        'SELECT id, name, created_at FROM folders WHERE id = ?',
        [id]
      );

      res.json({
        message: '폴더가 수정되었습니다',
        folder: updatedFolder[0]
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('폴더 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await global.dbPool.getConnection();

    try {
      const [folders] = await connection.execute(
        'SELECT id, name FROM folders WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (folders.length === 0) {
        return res.status(404).json({ error: '폴더를 찾을 수 없습니다' });
      }

      if (folders[0].name === '전체 녹음') {
        return res.status(403).json({ error: '기본 폴더는 삭제할 수 없습니다' });
      }

      await connection.beginTransaction();

      try {
        const [recordings] = await connection.execute(
          'SELECT id, folder_ids FROM recordings WHERE user_id = ?',
          [req.user.userId]
        );

        for (const recording of recordings) {
          if (recording.folder_ids) {
            const folderIds = recording.folder_ids || [];
            const filteredFolderIds = folderIds.filter(folderId => folderId !== parseInt(id));
            
            if (folderIds.length !== filteredFolderIds.length) {
              await connection.execute(
                'UPDATE recordings SET folder_ids = ? WHERE id = ?',
                [JSON.stringify(filteredFolderIds), recording.id]
              );
            }
          }
        }

        const [result] = await connection.execute(
          'DELETE FROM folders WHERE id = ? AND user_id = ?',
          [id, req.user.userId]
        );

        if (result.affectedRows === 0) {
          throw new Error('폴더 삭제에 실패했습니다');
        }

        await connection.commit();

        res.json({
          message: '폴더가 삭제되었습니다'
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      }

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('폴더 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;