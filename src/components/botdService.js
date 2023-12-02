// botdService.js
import { load } from '@fingerprintjs/botd';

let botdAgent = null;

const initializeBotd = async () => {
  try {
    botdAgent = await load();
  } catch (error) {
    console.error('Error loading BotD:', error);
  }
};

const detectBot = async () => {
  if (!botdAgent) {
    console.warn('BotD agent is not initialized');
    return null;
  }

  try {
    return await botdAgent.detect();
  } catch (error) {
    console.error('Error detecting bot:', error);
    return null;
  }
};

export { initializeBotd, detectBot };
