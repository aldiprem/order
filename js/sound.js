// sound.js - Audio Feedback Manager untuk INDOTAG MARKET
// Simpan di folder /order/js/sound.js

(function() {
  'use strict';

  // ==================== KONFIGURASI AUDIO ====================
  const SOUND_CONFIG = {
    enabled: true,
    volume: 0.5,
    basePath: '/order/sound/', // Path ke folder sound
    sounds: {
      click: {
        file: 'click.mp3',
        instances: [],
        preloaded: false
      },
      pop: {
        file: 'pop.mp3',
        instances: [],
        preloaded: false
      },
      success: {
        file: 'success.mp3',
        instances: [],
        preloaded: false
      },
      error: {
        file: 'error.mp3',
        instances: [],
        preloaded: false
      },
      back: {
        file: 'back.mp3',
        instances: [],
        preloaded: false
      }
    }
  };

  // ==================== AUDIO MANAGER ====================
  window.AudioManager = {
    // Inisialisasi
    init: function() {
      console.log('🔊 Initializing Audio Manager...');

      // Cek dukungan audio
      if (!window.AudioContext && !HTMLAudioElement) {
        console.warn('⚠️ Audio not supported in this browser');
        this.enabled = false;
        return;
      }

      // Preload semua sound
      this.preloadAllSounds();

      // Aktifkan audio setelah interaksi user (untuk mobile)
      this.enableAudioOnUserInteraction();

      console.log('✅ Audio Manager initialized');
      return this;
    },

    // Preload semua sound
    preloadAllSounds: function() {
      for (let [name, sound] of Object.entries(SOUND_CONFIG.sounds)) {
        this.preloadSound(name);
      }
    },

    // Preload single sound
    preloadSound: function(name) {
      const sound = SOUND_CONFIG.sounds[name];
      if (!sound || sound.preloaded) return;

      // Buat 3 instance audio untuk pooling
      for (let i = 0; i < 3; i++) {
        const audio = new Audio();
        audio.src = SOUND_CONFIG.basePath + sound.file;
        audio.volume = SOUND_CONFIG.volume;
        audio.preload = 'auto';

        // Handle error
        audio.onerror = (e) => {
          console.warn(`⚠️ Failed to load sound: ${name}`, e);
        };

        sound.instances.push(audio);
      }

      sound.preloaded = true;
      console.log(`✅ Preloaded sound: ${name}`);
    },

    // Aktifkan audio setelah user interaction (untuk mobile)
    enableAudioOnUserInteraction: function() {
      const enableAudio = () => {
        // Buat audio context jika ada
        if (window.AudioContext) {
          const context = new AudioContext();
          if (context.state === 'suspended') {
            context.resume();
          }
        }

        // Test play sound untuk mengaktifkan audio
        this.play('click', { volume: 0.1 });

        // Remove listeners setelah pertama kali
        document.removeEventListener('touchstart', enableAudio);
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
      };

      document.addEventListener('touchstart', enableAudio, { once: true });
      document.addEventListener('click', enableAudio, { once: true });
      document.addEventListener('keydown', enableAudio, { once: true });
    },

    // Mainkan sound
    play: function(name, options = {}) {
      if (!SOUND_CONFIG.enabled) return;

      const sound = SOUND_CONFIG.sounds[name];
      if (!sound) {
        console.warn(`⚠️ Sound not found: ${name}`);
        return;
      }

      // Cari instance audio yang tersedia
      const audio = sound.instances.find(a => a.paused || a.ended);
      if (!audio) {
        // Buat instance baru jika semua sedang dipakai
        const newAudio = new Audio();
        newAudio.src = SOUND_CONFIG.basePath + sound.file;
        newAudio.volume = options.volume || SOUND_CONFIG.volume;
        sound.instances.push(newAudio);
        this.playWithOptions(newAudio, options);
        return;
      }

      this.playWithOptions(audio, options);
    },

    // Play dengan opsi
    playWithOptions: function(audio, options) {
      // Reset audio jika sedang playing
      audio.pause();
      audio.currentTime = 0;

      // Set volume
      audio.volume = options.volume || SOUND_CONFIG.volume;

      // Play
      audio.play().catch(e => {
        // Ignore AbortError (biasanya karena interaksi user)
        if (e.name !== 'AbortError') {
          console.warn('⚠️ Audio play failed:', e);
        }
      });
    },

    // Set volume global
    setVolume: function(volume) {
      SOUND_CONFIG.volume = Math.max(0, Math.min(1, volume));

      // Update semua instance
      for (let sound of Object.values(SOUND_CONFIG.sounds)) {
        sound.instances.forEach(audio => {
          audio.volume = SOUND_CONFIG.volume;
        });
      }
    },

    // Enable/disable sound
    setEnabled: function(enabled) {
      SOUND_CONFIG.enabled = enabled;
    }
  };
})();
