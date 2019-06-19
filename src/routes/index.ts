import { Router } from 'express';
import { Get } from './api/v1/user';

const router = Router();

router.get('/get', Get);

export default router;