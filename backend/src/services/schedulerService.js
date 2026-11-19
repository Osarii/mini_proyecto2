/**
 * Scheduled Reporter Service
 * Uses node-cron to trigger the Reporting Analyst Agent daily at 7:00 a. m.
 * Also generates the initial daily report on server startup.
 */
const cron = require('node-cron');
const config = require('../config');
const reportingAnalystAgent = require('../agents/reportingAnalystAgent');

class SchedulerService {
  start() {
    console.log(`Initializing automated daily report scheduler with pattern: "${config.cronSchedule}" (7:00 a. m.)`);
    
    // Schedule task
    cron.schedule(config.cronSchedule, async () => {
      console.log('⏰ Scheduled trigger executing: Generating Daily HR Report at 7:00 a. m....');
      try {
        await reportingAnalystAgent.generateDailyReport();
      } catch (err) {
        console.error('Error generating scheduled daily report:', err);
      }
    });

    // Ensure a fresh report exists on startup
    reportingAnalystAgent.generateDailyReport().catch(err => {
      console.warn('Startup report generation warning:', err.message);
    });
  }
}

module.exports = new SchedulerService();
