const fs = require('fs');
const path = require('path');

const settingsFilePath = path.join(__dirname, '..', 'config', 'settings.json');

const defaultSettings = {
  ai_otomatik_atama: true,
  ai_max_mesafe: 25,
  ai_acil_agirlik: 8,
  ai_sirali_gorev: true,
  game_liderlik: true,
  game_temel_puan: 50,
  game_hizli_bonus: 2,
  game_rozet: true,
  sec_2fa: false,
  sec_supheli_giris: true,
  sec_ip_listesi: ""
};

function ensureConfigDir() {
  const configDir = path.join(__dirname, '..', 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

function getSettings() {
  try {
    ensureConfigDir();
    if (!fs.existsSync(settingsFilePath)) {
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2), 'utf8');
      return defaultSettings;
    }
    const data = fs.readFileSync(settingsFilePath, 'utf8');
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (error) {
    console.error('Error loading settings, using defaults:', error.message);
    return defaultSettings;
  }
}

function saveSettings(newSettings) {
  try {
    ensureConfigDir();
    const current = getSettings();
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(settingsFilePath, JSON.stringify(updated, null, 2), 'utf8');
    return { success: true, settings: updated };
  } catch (error) {
    console.error('Error saving settings:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getSettings,
  saveSettings
};
