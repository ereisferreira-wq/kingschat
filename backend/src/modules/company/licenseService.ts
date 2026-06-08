import { Op } from "sequelize";
import Company from "../../shared/database/models/Company";
import logger from "../../shared/utils/logger";

export function startLicenseService() {
  const check = async () => {
    try {
      const now = new Date();

      const expired = await Company.update(
        { status: false },
        {
          where: {
            status: true,
            dueDate: { [Op.lte]: now },
          },
        }
      );

      if (expired[0] > 0) {
        logger.info(`Licenses expired: ${expired[0]} company(ies) blocked`);
      }

      const nearExpiry = await Company.findAll({
        where: {
          status: true,
          dueDate: {
            [Op.gte]: now,
            [Op.lte]: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          },
        },
      });

      for (const company of nearExpiry) {
        const daysLeft = Math.ceil(
          (new Date(company.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft >= 1 && daysLeft <= 5) {
          logger.info(`License warning: ${company.name} - ${daysLeft} day(s) left`);
        }
      }
    } catch (err) {
      logger.error("License check error:", err);
    }
  };

  check();
  setInterval(check, 60 * 60 * 1000);
  logger.info("License service started (checking every hour)");
}
