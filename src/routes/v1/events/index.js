import httpStatus from "http-status";
import fetch from "node-fetch";

import * as lib from "../../lib/index.js";

const { ApiError, catchAsync, pick } = lib.util;
const config = lib.config;

const router = lib.Router();

router
  .route(`/christmastree`)
  .post(
    catchAsync(async (req, res) => {
      // Check for Discord token
      const { code_type, source_code, title, token: raw } = req.body;

      if (!code_type || !source_code || !title || !raw) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `code_type, source_code, title, and token are required`
        );
      }

      const [id, token] = raw.split(`_`);

      const entry = lib.service.discord.tokens[id];

      if (token !== entry) {
        throw new ApiError(httpStatus.UNAUTHORIZED, `Invalid token`);
      }

      // do some logic
      let db = await lib.shared.mongo.Data.findOne({
        namespace: `christmastree`,
      });

      if (!db) {
        db = await lib.shared.mongo.Data.create({ namespace: `christmastree` });
      }

      db.data.trees ??= {};
      db.data.codes ??= {};

      const stdout = (
        await lib.service.piston.client.execute(code_type, source_code)
      ).run.stdout;

      db.data.trees[id] = {
        title,
        stdout,
        votes: {
          // [user_id]: <1|0|-1>
        },
      };

      db.data.codes[id] = {
        code_type,
        source_code,
      };

      await db.save();

      res.json({ message: `OK` });
    })
  )
  .get(
    catchAsync(async (req, res) => {
      let db = await lib.shared.mongo.Data.findOne({
        namespace: `christmastree`,
      });

      if (!db) {
        db = await lib.shared.mongo.Data.create({ namespace: `christmastree` });
      }

      const { trees } = db.data;

      res.json({ trees });
    })
  );

export default router;
